# 実装（記録の差し込み方・上限制御・テスト）

## 目次

1. [記録漏れを構造で防ぐ](#1-記録漏れを構造で防ぐ)
2. [コスト計算は純関数にする](#2-コスト計算は純関数にする)
3. [backend-py（LangChain / LangGraph）](#3-backend-pylangchain--langgraph)
4. [Edge Functions](#4-edge-functions)
5. [記録に失敗したときの扱い](#5-記録に失敗したときの扱い)
6. [上限・予算制御](#6-上限予算制御)
7. [プロバイダ請求との突合](#7-プロバイダ請求との突合)
8. [テスト（TDD）](#8-テストtdd)
9. [ユーザーに見せる（i18n）](#9-ユーザーに見せるi18n)

---

## 1. 記録漏れを構造で防ぐ

呼び出し箇所ごとに「usage を取り出して insert する」コードを書くと、**必ずどこかで忘れる**。
忘れても動くし、テストも通る。気づくのは請求書を見たときになる。

だから**モデルを呼ぶ経路を 1 か所に閉じる**:

```
❌ 各ユースケースが直接 SDK を呼ぶ
   → 新しい機能を足す人が記録を書き忘れる

✅ 呼び出しラッパ（1 か所）を通す
   → ラッパを通らない呼び出しはレビューで弾ける。lint ルールで縛ってもよい
```

ラッパが持つ責務は 4 つだけ:

1. モデルを呼ぶ
2. `pending` イベントを作る（呼び出し**前**）
3. usage を正規化して取り出す
4. コストを計算して `settled` に更新する

ラッパにビジネスロジックを持ち込まないこと。持ち込むと機能ごとに分岐が増え、結局コピーされる
（`.claude/rules/clean-code.md`）。

---

## 2. コスト計算は純関数にする

```python
# backend-py/packages/core/src/core/ai_usage/cost.py
from decimal import Decimal

def calculate_cost(
    items: list[UsageItem],          # 正規化済みの (metric, quantity)
    prices: PriceTable,              # provider/model/mode/時点で解決済みの単価
) -> CostBreakdown:
    """副作用なし。DB もネットワークも触らない。"""
```

**なぜ純関数にするか**: コスト計算は金額に直結するのに、DB や SDK と絡めると単体テストが書きにくくなる。
純関数なら「この usage ならこの金額」を表形式で網羅テストできる。
`.claude/rules/tdd.md` の TDD 対象そのもの（UI ではないので Storybook 例外に当たらない）。

**単価の解決も分離する**: 「時点 `t` の単価行を引く」処理は DB を触るので別関数にし、
計算関数には解決済みの単価を渡す。こうすると計算のテストに DB が要らない。

**返すのは `Decimal` の USD 金額**。`float` を使わない（単価が 1e-7 オーダーなので誤差が積む）。

**単価が引けなかったときに 0 を返さない。** 例外を投げるか、`price_missing` を明示した結果型を返す。
0 を返すと原価が安く見え、数字が出ているので誰も気づかない — これが一番危ない失敗の仕方。

```python
match resolve_prices(provider, model, mode, at=started_at):
    case Ok(prices):
        cost = calculate_cost(items, prices)          # Decimal, USD
        await settle(event_id, cost, status="priced")
    case Missing(metrics):
        logger.error("price not registered", extra={"model": model, "metrics": metrics})
        await settle(event_id, cost=None, status="price_missing")   # 0 にしない
```

`price_missing` は**バグではなく運用イベント**（新モデルを試したときに必ず起きる）。
単価を登録してから再計算バッチを流せば埋まる（`raw_usage` を残してあるので復元できる）。

---

## 3. backend-py（LangChain / LangGraph）

`.claude/rules/supabase-first.md` のエスカレーション条件（LLM / エージェント / 長時間 / 複雑）に該当する処理はここ。

**callback で一元記録する**のが定石。ノードごとに書くと、ノードを足した人が忘れる。

```python
from langchain_core.callbacks import AsyncCallbackHandler

class UsageRecordingHandler(AsyncCallbackHandler):
    """on_llm_end で 1 呼び出し = 1 イベントを記録する。
    trace_id / user_id / feature はハンドラ生成時に束縛しておく。"""

    async def on_llm_end(self, response, **kwargs) -> None:
        ...  # usage_metadata を正規化 → cost 計算 → 記録

    async def on_llm_error(self, error, **kwargs) -> None:
        ...  # 失敗も記録する。途中まで生成されていれば課金されている
```

**注意点**

- `usage_metadata` は LangChain が正規化した値。**生の値は `response_metadata`** にあるので、
  `raw_usage` にはそちらを保存する（`providers.md` §5）。
- エージェントは 1 リクエストで何十回もモデルを呼ぶ。**`trace_id` を必ず束縛**して、
  「ユーザーの 1 操作 = いくら」を復元できるようにする。
- ストリーミングでトークンを逐次返す場合、`stream_usage` 相当の設定を有効にしないと usage が来ない。
- **記録の DB 書き込みでレスポンスを待たせない**。`asyncio` のバックグラウンドタスクに逃がしてよいが、
  例外を握りつぶさないこと（§5）。

**Supabase への書き込み**は `core/supabase_client.py` の既存クライアントを使う。
`service_role` 相当の鍵が要る（RLS で insert を service_role に限っているため）。

---

## 4. Edge Functions

短時間で完結する推論・Webhook はここ（`.claude/rules/supabase-first.md` の既定）。

```ts
// supabase/functions/<name>/index.ts
const started = await recordPendingEvent({ userId, feature, provider, model, traceId })

try {
  const res = await callModel(...)
  await settleEvent(started.id, normalizeUsage(res), res.id)   // res.id = providerRequestId
  return json(res)
} catch (error) {
  console.error('model call failed', error)
  await markEventFailed(started.id, error)   // 失敗も残す
  throw error                                 // 握りつぶさない（.claude/rules/error-handling.md）
}
```

**Webhook で結果を受ける構成**（fal の動画生成など、数分かかるもの）では、
**数量の確定は Webhook 側**で行う。リクエスト側では `pending` イベントを作るだけにして、
Webhook が `providerRequestId` で該当行を引いて確定させる。
Webhook は**再送される**ので、`providerRequestId` の一意制約と冪等な更新が必須。

`EdgeRuntime.waitUntil()` を使えばレスポンス返却後に記録を続けられるが、
**失敗が見えなくなる**ので必ずログを残すこと。

---

## 5. 記録に失敗したときの扱い

`.claude/rules/error-handling.md` の「握りつぶし禁止」がそのまま効く。ただし
**「記録に失敗したらユーザーの応答も失敗させるか」は設計判断**なので、決めて明記する。

| 方針 | 向いているケース | 必須の担保 |
|---|---|---|
| 応答は返し、記録失敗はログ + リトライキュー | 社内コスト把握が主目的 | 失敗件数の監視。**黙って捨てない** |
| 記録できなければ応答も失敗させる | 従量課金・クレジット制（記録漏れ = 売上欠損） | 記録の高可用性、リトライ |

**どちらでも禁止なのは「catch して何もしない」**。原価が静かに消え、
気づくのは「請求額と自前集計が合わない」ときになる。そのときには原因の特定が不可能になっている。

失敗イベントは専用テーブル（またはイベントの `status = 'failed'` ＋ エラー内容）に残し、
**件数をダッシュボードに出す**こと。数字が見えていないものは直らない。

---

## 6. 上限・予算制御

上限を**強制する**なら、呼び出し**前**に残高を見る経路が要る。事後集計では止められない。

```
[1] 呼び出し前チェック   … 当月使用量（ロールアップ）+ 未確定分 >= 上限 なら拒否
[2] 見積り（任意）       … 入力トークンは事前に数えられる。出力は max_tokens で上限見積り
[3] 実行
[4] 確定                … 実 usage で更新
```

**設計上の注意**

- 入力トークンは事前に数えられる（プロバイダのトークンカウント API / トークナイザ）が、
  **出力は実行するまで分からない**。厳密な事前制御は不可能なので、`max_tokens` を上限として見積もる。
- 並行リクエストで上限を超える（チェックと確定の間に他のリクエストが走る）。厳密にやるなら
  **予約（reserve）→ 確定（commit）→ 差分返却**の 2 相にする。多くのサービスではそこまで要らないので、
  **どこまで厳密にするかを必ずユーザーに確認**する。
- 超過時のエラーは**ユーザーに理由が分かる形**で返す（i18n 必須）。500 で落とさない。
- 予算アラート（80% 到達など）は上限強制とは別に用意する価値がある。止まる前に気づける。

---

## 7. プロバイダ請求との突合

**自前集計は必ずどこかでズレる。** ズレていることに気づける仕組みを最初から入れる。

- 月次で「プロバイダの請求額」対「自前集計の合計」を比較する
- 許容誤差（例: 1%）を超えたら調査する
- ズレの典型原因: 単価表の更新漏れ、`unsettled` イベントの取りこぼし、
  リトライの二重計上、記録していない呼び出し経路（ラッパを通っていないコード）

多くのプロバイダは使用量取得 API やコンソールの CSV エクスポートを持っている。
**突合は自動化しなくてよいが、手順は残す**（誰でも実行できる状態にする）。

LangSmith 等の観測ツールがあるなら、そちらとも突合できる。ただし
**外部ツールは自社のテナント軸を知らない**ので、代替にはならない。

---

## 8. テスト（TDD）

`.claude/rules/tdd.md` に従い、テストを先に書く。最低限これらを固める:

| 対象 | テスト内容 |
|---|---|
| **usage 正規化パーサ** | プロバイダの実レスポンス（固定 JSON）→ 正規化結果。**内数/外数の扱いが正しいか**（`providers.md` §1）。合計の検算も入れる |
| **コスト計算** | metric ごとの単価が正しく掛かるか。キャッシュ読み/書きで単価が変わるケース。`Decimal` で誤差が出ないか |
| **単価の時点解決** | `effective_from` をまたぐ日時で、正しい単価行が選ばれるか |
| **二重計上防止** | 同じ `providerRequestId` で 2 回記録 → 1 行のまま |
| **中断時** | usage が来ないケースで `unsettled` として残るか。**0 として記録されないこと** |

**外部 SDK を丸ごと Mock しない**（`.claude/rules/backend-py.md`）。
本物の SDK の型（レスポンスオブジェクト）を使い、HTTP 層だけ差し替える。
usage オブジェクトの構造はプロバイダ更新で変わるので、**本物の型を使っていれば型エラーで気づける**。

---

## 9. ユーザーに見せる（i18n）

使用量画面を作るなら `.claude/rules/i18n.md` が適用される。

- 数値の桁区切り・通貨記号は**ロケール依存**。`Intl.NumberFormat` に任せ、手で `$` を連結しない
- 「トークン」という語はエンドユーザーに通じないことが多い。
  **クレジット / 回数 / 文字数**など、そのサービスのユーザーが理解できる単位に**表示だけ**変換する
  （内部の記録はプロバイダの課金単位のまま保つ。表示単位で保存すると再計算できなくなる）
- 期間の境界はユーザーのタイムゾーンで見せる（保存は UTC。`.claude/rules/datetime.md`）
- **未計上（`price_missing`）の件数を画面に出す**。金額だけ出すと、欠損している数字を正しいと思わせてしまう

### 円で見せたい場合

**保存は USD のまま**にする（プロバイダの請求が USD 建てなので、円で保存すると突合できなくなる）。
円は**表示時の変換**として扱う。

```
保存: total_cost = 0.0171 USD
表示: 0.0171 USD × レート → 円（レートと取得日時を明示する）
```

- 為替レートを**コードに定数で書かない**。日次で取得してレート表に保存し、
  **「いつのレートで換算したか」を必ず画面に出す**（後から金額が変わる理由になるため）
- ユーザーに請求する場合、どの時点のレートで確定するかは**課金ポリシーの問題**なので、
  勝手に決めずユーザーに確認する（月末レート / 取引時レート / 固定レート）
- 社内のコスト把握が目的なら、レートは概算で十分。**厳密さより「ドル原価が分かること」が優先**
