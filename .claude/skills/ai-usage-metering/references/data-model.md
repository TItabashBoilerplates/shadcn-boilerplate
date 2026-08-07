# データモデル（Drizzle スキーマ / RLS / 集計）

> スキーマは **Drizzle が source of truth**（`.claude/rules/supabase-config.md`）。
> 以下は雛形であり、**Step 1〜3 で決めた集計軸に合わせて列を足し引きして使う**。丸ごとコピーするものではない。
> マイグレーションの実行は `.claude/rules/database.md` に従う。

## 目次

1. [テーブル構成の選択](#1-テーブル構成の選択)
2. [単価表](#2-単価表)
3. [使用量イベント](#3-使用量イベント)
4. [metric 内訳](#4-metric-内訳)
5. [RLS](#5-rls)
6. [ロールアップ（集計）](#6-ロールアップ集計)
7. [金額の型と丸め](#7-金額の型と丸め)
8. [命名規則](#8-命名規則)

---

## 1. テーブル構成の選択

| 構成 | 向いているケース | 欠点 |
|---|---|---|
| **A. イベント 1 テーブル**（入力/出力/キャッシュを列で持つ） | テキスト LLM のみで、画像・音声を扱う予定が無いと**確信できる**とき | モダリティが増えると列が増え続ける。metric ごとの単価内訳を持てない |
| **B. イベント + metric 内訳の 2 テーブル** | 生成 AI 全般。画像・音声・動画・ツール課金が混ざりうる場合 | JOIN が 1 段増える |

**推奨は B。** 集計クエリはイベント側だけ見れば済む（金額合計はイベントに非正規化して持つ）ので、
JOIN のコストは日常的には発生しない。内訳テーブルは監査と再計算のときだけ読む。

「今はテキストだけだから A」と判断するときは、**画像生成やツール課金が入った時点で B へ移行する必要がある**ことを
コメントに残しておくこと。移行時は過去行の内訳が作れないので、早いほど傷が浅い。

---

## 2. 単価表

**単価をコードに書かないための土台。** これが無いと再計算ができない。

```typescript
// drizzle/schema/ai-usage.ts
import { sql } from 'drizzle-orm'
import {
  date, index, integer, jsonb, numeric, pgPolicy, pgTable, text, timestamp,
  uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'
// users は既存スキーマから import する（drizzle/schema/schema.ts）

/** モデル × metric × 期間ごとの単価。改定は「新しい行を足す」で表現する（既存行を書き換えない）。 */
export const aiModelPrices = pgTable(
  'ai_model_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),              // 'openai' | 'anthropic' | 'google' | 'fal' ...
    model: text('model').notNull(),                    // API に渡す正式なモデル ID
    /** 同じモデルでも実行モードで単価が変わる（sync / batch / provisioned など） */
    mode: text('mode').notNull().default('sync'),
    /** 'input_token' | 'output_token' | 'cache_read_token' | 'cache_write_5m_token'
     *  | 'reasoning_token' | 'image' | 'audio_second' | 'web_search_request' ... */
    metric: text('metric').notNull(),
    /** unit_price は「1 単位あたり」で保存する。100万トークンあたりの表記のまま入れない（換算ミスの温床） */
    unitPrice: numeric('unit_price', { precision: 24, scale: 12 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    effectiveFrom: timestamp('effective_from', { withTimezone: true, precision: 3 }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true, precision: 3 }),
    /** 出典 URL。単価の根拠を残す（推測で入れないための歯止め） */
    sourceUrl: text('source_url'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ai_model_prices_unique').on(t.provider, t.model, t.mode, t.metric, t.effectiveFrom),
    index('ai_model_prices_lookup').on(t.provider, t.model, t.metric, t.effectiveFrom),
  ],
).enableRLS()
```

**運用ルール**

- 単価改定は **UPDATE ではなく INSERT**（旧行に `effective_to` を入れて閉じる）。過去分の再計算ができなくなるため。
- `unitPrice` は「1 トークンあたり」のように**最小単位**で保存する。公式の料金表は「100万トークンあたり $X」の
  表記が多いので、**登録時に割る**。この換算をアプリ側でやると必ずどこかで漏れる。
- `sourceUrl` を空にしない。単価の根拠が消えると、請求が合わないときに何を疑えばいいか分からなくなる。

---

## 3. 使用量イベント

**1 回のモデル呼び出し = 1 行。** ここが計測の一次記録。

```typescript
export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // ---- 請求主体（Step 1 で決めた軸。使わない軸は削る） ----
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id'),   // マルチテナントなら notNull

    // ---- 配賦軸（Step 2） ----
    feature: text('feature').notNull(),        // 'chat' | 'summarize' | 'rag-search' ...
    traceId: uuid('trace_id'),                 // 1 会話 / 1 ジョブをまたいで集計するためのキー

    // ---- 呼び出し対象 ----
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    mode: text('mode').notNull().default('sync'),

    /** プロバイダ側のレスポンス ID。二重計上を DB に弾かせるための一意キー */
    providerRequestId: text('provider_request_id'),

    /** 'pending'（開始時）→ 'settled'（usage 確定）/ 'unsettled'（中断等で usage 不明）/ 'failed' */
    status: text('status').notNull().default('pending'),

    /** プロバイダが返した usage をそのまま。単価誤り時の再計算と原因調査の生命線 */
    rawUsage: jsonb('raw_usage'),

    /** 計算済みの合計 USD。内訳は ai_usage_items 側。集計を速くするための非正規化。
     *  単価が引けなかったときは NULL のまま（0 にしない）。cost_status で区別する */
    totalCost: numeric('total_cost', { precision: 24, scale: 12 }),
    currency: text('currency').notNull().default('USD'),

    /** 'priced'（単価表から算出）| 'price_missing'（単価未登録＝未計上）
     *  | 'provider_reported'（プロバイダが返した金額を採用） */
    costStatus: text('cost_status').notNull().default('price_missing'),

    /** プロバイダが金額を返す場合（OpenRouter の cost 等）はそのまま保存する。
     *  自前計算（total_cost）と突き合わせて単価表のズレを検知するために両方持つ */
    providerReportedCost: numeric('provider_reported_cost', { precision: 24, scale: 12 }),

    startedAt: timestamp('started_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true, precision: 3 }),
  },
  (t) => [
    // 二重計上の防止。リトライ・Webhook 再送はアプリ側では防ぎきれない
    uniqueIndex('ai_usage_events_provider_request')
      .on(t.provider, t.providerRequestId)
      .where(sql`${t.providerRequestId} is not null`),
    // 「今月このテナントがいくら使ったか」が主要クエリになる
    index('ai_usage_events_org_time').on(t.organizationId, t.startedAt),
    index('ai_usage_events_user_time').on(t.userId, t.startedAt),
    index('ai_usage_events_feature_time').on(t.feature, t.startedAt),
    index('ai_usage_events_trace').on(t.traceId),
    // 未計上（単価未登録）の検知用。ここが 0 でないと金額が過少に出る
    index('ai_usage_events_cost_status').on(t.costStatus, t.startedAt),
  ],
).enableRLS()
```

**なぜ `status` を持つのか**: ストリーミングは中断すると usage が返らない（`providers.md` §7 罠 2）。
`pending` で先に行を作っておけば、**中断した呼び出しの存在自体は残る**。
`unsettled` の件数を監視することが、計測が壊れていることに気づく唯一の手段になる。

---

## 4. metric 内訳

```typescript
export const aiUsageItems = pgTable(
  'ai_usage_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => aiUsageEvents.id, { onDelete: 'cascade' }),
    metric: text('metric').notNull(),                            // 単価表と同じ語彙を使う
    quantity: numeric('quantity', { precision: 20, scale: 4 }).notNull(),
    /** 計算に使った単価行。これがあるので後から「なぜこの金額か」を再現できる */
    priceId: uuid('price_id').references(() => aiModelPrices.id),
    unitPrice: numeric('unit_price', { precision: 24, scale: 12 }).notNull(),
    cost: numeric('cost', { precision: 24, scale: 12 }).notNull(),
  },
  (t) => [
    uniqueIndex('ai_usage_items_unique').on(t.eventId, t.metric),
    index('ai_usage_items_event').on(t.eventId),
  ],
).enableRLS()
```

`priceId` と `unitPrice` を**両方**持つのは冗長に見えるが意図的。単価行が将来削除・修正されても、
そのとき使った値がイベント側に凍結されているので、**過去の請求額が動かない**。

---

## 5. RLS

**他人・他テナントのコストが見えるのは事故**。必ず有効化する。`.claude/skills/rls/` の性能ルールに従い、
`auth.uid()` は `(SELECT auth.uid())` でラップする（行ごとの再評価を避けるため）。

```typescript
// 本人のイベントのみ参照可
export const selectOwnUsageEvents = pgPolicy('select_own_ai_usage_events', {
  for: 'select',
  to: 'authenticated',
  using: sql`(SELECT auth.uid()) = ${aiUsageEvents.userId}`,
}).link(aiUsageEvents)

// 書き込みは service_role のみ（Edge Function / backend-py から）。
// クライアントから insert させると数量を偽装できる = 課金の改ざんになる
export const insertUsageEventsServiceRole = pgPolicy('insert_ai_usage_events_service', {
  for: 'insert',
  to: 'service_role',
  withCheck: sql`true`,
}).link(aiUsageEvents)
```

**単価表 `ai_model_prices`** は「認証済みユーザーは select 可（料金表示用）／書き込みは service_role のみ」が定石。
ユーザーに見せないなら select も service_role のみにする。

**組織単位で見せる場合**は、メンバーシップ判定を `security definer` 関数に切り出してから policy で呼ぶ
（`.claude/skills/rls/references/multi-tenancy-patterns.md`）。policy 内にサブクエリを直接書くと性能が出ない。

---

## 6. ロールアップ（集計）

生イベントを毎回集計すると、行数が増えたときに画面が重くなる。**日次に畳む**のが基本。

```typescript
export const aiUsageDaily = pgTable(
  'ai_usage_daily',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bucketDate: date('bucket_date').notNull(),          // UTC 基準（.claude/rules/datetime.md）
    organizationId: uuid('organization_id'),
    userId: uuid('user_id'),
    feature: text('feature'),
    provider: text('provider'),
    model: text('model'),
    requestCount: integer('request_count').notNull().default(0),
    totalCost: numeric('total_cost', { precision: 24, scale: 12 }).notNull().default('0'),
    currency: text('currency').notNull().default('USD'),
    /** 単価未登録で金額に算入できなかった件数。0 でなければ total_cost は過少。
     *  画面にも必ず出す（見えない欠損が一番怖い） */
    unpricedCount: integer('unpriced_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ai_usage_daily_unique')
      .on(t.bucketDate, t.organizationId, t.userId, t.feature, t.provider, t.model),
    index('ai_usage_daily_org').on(t.organizationId, t.bucketDate),
  ],
).enableRLS()
```

**バケットは UTC で切る**（`.claude/rules/datetime.md`）。ユーザーのローカル日付で見せるのは表示層の責務。
DB に混在させると「日をまたぐ請求」がずれる。

**更新方法の選択**

| 方式 | 向き | 注意 |
|---|---|---|
| 定期ジョブ（`pg_cron` / スケジュール Edge Function）で前日分を再集計 | 即時性の要求が無い場合。単価修正や `price_missing` の再計算もこの経路で通る | 当日分は最新にならない |
| イベント挿入時に `upsert` でインクリメント | 上限を即時に効かせたい場合 | 再計算時に二重加算しないよう、**必ず洗い替え可能に**しておく |
| マテリアライズドビュー | 読み取り専用の分析用途 | リフレッシュ中のロックに注意 |

**上限を強制する場合**は「イベント挿入時に加算」を選ぶ。前日集計では超過を止められない。

### ドルで取り出すクエリ

集計は**必ず金額込みで出す**。トークン数だけの画面を作らない（原価が判断できないので使われない）。

```sql
-- 当月のテナント別コスト（USD）。未計上件数を必ず併記する
select
  organization_id,
  sum(total_cost)                                          as cost_usd,
  count(*)                                                 as requests,
  count(*) filter (where cost_status = 'price_missing')    as unpriced_requests
from ai_usage_events
where started_at >= date_trunc('month', now() at time zone 'utc')
  and status = 'settled'
group by organization_id
order by cost_usd desc nulls last;

-- 機能別・モデル別の内訳（どこが高いか）
select feature, model, sum(total_cost) as cost_usd, count(*) as requests
from ai_usage_events
where started_at >= now() - interval '30 days'
group by feature, model
order by cost_usd desc;

-- 1 会話あたりのコスト上位（エージェントの暴走検知）
select trace_id, sum(total_cost) as cost_usd, count(*) as llm_calls
from ai_usage_events
group by trace_id
order by cost_usd desc
limit 20;
```

**`unpriced_requests` を必ず一緒に出す。** これが 0 でない集計値は過少申告であり、
併記しないと「安く出た数字」をそのまま信じてしまう。

---

## 7. 金額の型と丸め

- **浮動小数点で金額を扱わない。** 単価が 1e-8 オーダーになるので誤差が積み上がる。
  Postgres は `numeric`、TypeScript 側は文字列のまま扱うか decimal ライブラリを使う。
  Drizzle の `numeric` は既定で文字列を返すので、**`Number()` で受けない**。
- Python 側は `decimal.Decimal` を使う（`float` 禁止）。
- **丸めるのは請求の直前だけ。** イベントや日次集計では丸めない（丸め誤差が積み上がる）。
- 通貨はイベントに持たせる（プロバイダによって USD 建て/円建てが混ざる）。
  **為替レートは固定しない**。換算が要るなら「レートを取得した日時とレート値」を別途記録する。

---

## 8. 命名規則

後から集計するときに効くので、最初に決めて守る。

| 項目 | 規則 | 例 |
|---|---|---|
| `provider` | 小文字スラッグ | `openai`, `anthropic`, `google`, `fal` |
| `model` | **API に渡す正式な ID をそのまま**（別名を作らない） | `claude-opus-5`, `gpt-5.4-mini` |
| `metric` | `snake_case`。単価表とイベントで**同じ語彙**を使う | `input_token`, `cache_read_token`, `image`, `audio_second` |
| `feature` | `kebab-case`。FSD のスライス名に揃えると追いやすい | `chat`, `rag-search`, `image-gen` |

**`model` に自前の別名を付けない。** プロバイダの請求明細と突合できなくなる。
表示用の名前が必要なら、表示層でマッピングする。
