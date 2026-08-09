---
name: onesignal
description: 本リポジトリの OneSignal プッシュ通知（Web / Mobile / Edge Functions）の実装ガイダンス。通知を送る・Webhook を受ける・購読状態を扱う・external_id を Supabase の user.id と紐付ける・多言語通知を書く・`@workspace/onesignal` や `supabase/functions/onesignal-*` を触る、といった作業では必ず最初に起動すること。「プッシュ通知」「push notification」「通知を送りたい」「通知が届かない」「購読許可」「OneSignal」といった話題が出たら、ユーザーが OneSignal の名前を出していなくても該当する。公式 CLI も公式 Skill も存在しないサービスなので、このリポジトリ固有の実装が唯一の正解になっている。
---

# OneSignal（プッシュ通知）

OneSignal には **公式 CLI も公式 Agent Skill も無い**（CLI はネイティブ SDK 導入専用・macOS 限定・Beta で RN 非対応）。
そのため「本リポジトリがすでに書いた実装」が事実上の仕様書になる。**推測で API を書かず、必ず既存実装に合わせること。**

調査記録: `docs/_research/2026-08-06-service-clis.md`

---

## 1. まず全体像（どこに何があるか）

| レイヤー | 場所 | 役割 |
|---|---|---|
| **送信 API** | `supabase/functions/onesignal-send/` | 認証付きの通知送信エンドポイント（`POST /functions/v1/onesignal-send`） |
| **Webhook 受信** | `supabase/functions/onesignal-webhooks/` | delivered / clicked / dismissed / subscription.created / deleted のルーティング |
| **REST クライアント** | `supabase/functions/shared/onesignal/` | `createOneSignalClient()` と型定義。Edge Function からはバレル `index.ts` 経由で import |
| **Web (Next.js)** | `frontend/packages/onesignal/` (`@workspace/onesignal`) | `OneSignalProvider` / `useOneSignalAuth` / `useOneSignalSubscription`（`react-onesignal`） |
| **Mobile (Expo)** | `frontend/apps/mobile/src/app/providers/OneSignalInitializer.tsx` | `react-native-onesignal` の初期化。`.web.tsx` が Web 向けの no-op 分岐 |

**アーキテクチャ上の位置づけ**: OneSignal は外部 SaaS の REST API であり、
`.claude/rules/supabase-first.md` の「バックエンド処理の既定は Edge Functions」「外部 API 連携（単発・短時間で完結）」に該当する。
**backend-py に置いてはいけない**（LLM / エージェント / 長時間処理 / 複雑実装のどれにも当たらない）。

> `.claude/rules/mcp-supabase.md` が禁止しているのは *エージェントが Supabase インフラを調査・操作するときに Bash で curl / psql を叩くこと*であって、
> **アプリコードから外部 SaaS の REST API を呼ぶことではない**。Edge Functions からの `fetch` は正しい実装。

---

## 2. 環境変数（追加・変更するときの必須ルール）

| キー | 置き場所 | 備考 |
|---|---|---|
| `ONE_SIGNAL_APP_ID` | Doppler → Edge Functions secrets | サーバ側。`Deno.env.get()` で読む |
| `ONE_SIGNAL_API_KEY` | Doppler → Edge Functions secrets | **REST API Key。絶対にクライアントへ出さない** |
| `ONE_SIGNAL_WEBHOOK_SECRET` | Doppler → Edge Functions secrets | 任意。設定されていれば Webhook 検証が有効化される |
| `NEXT_PUBLIC_ONE_SIGNAL_APP_ID` | `env/frontend/.env.local`（非機密） | ブラウザ公開。App ID は公開前提の値 |
| `EXPO_PUBLIC_ONE_SIGNAL_APP_ID` | `env/frontend/.env.local`（非機密） | 同上（Expo） |

キー名が `ONE_SIGNAL_`（`ONESIGNAL_` ではない）である点に注意 — 既存コードがこの綴りで統一されている。
**予約 prefix（`GITHUB_` / `SUPABASE_` / `VERCEL_`）には当たらないので Doppler に置いてよい**（`.claude/rules/env-naming.md`）。
シークレットの書き込みは `doppler` MCP 経由・**値をチャットやコミットに出さない**（`.claude/rules/mcp-doppler.md`）。

---

## 3. ユーザー識別は `external_id` = Supabase `user.id`

これが本リポジトリの通知設計の背骨。ここを崩すと「特定ユーザーに送る」が全部壊れる。

```
Supabase auth.users.id  ──→  OneSignal external_id (alias)
        ↑ ログイン時に OneSignal.login(user.id)
        ↓ ログアウト時に OneSignal.logout()
```

- **Web**: `useOneSignalAuth(user?.id)` が `OneSignal.login/logout` を呼ぶ。`OneSignalProvider` の内側で使う
- **Mobile**: `<OneSignalInitializer userId={user?.id} />` が同じことをする
- **送信側**: `include_aliases.external_id` でターゲティングする（`include_subscription_ids` は非推奨）

新しい画面や認証フローを足すときは、**ログイン成功後に必ず `login()`、ログアウト時に必ず `logout()` が走る経路になっているか**を確認する。
片方だけ実装すると「ログアウトしたのに前のユーザーの通知が届く」という形で表面化する。

---

## 4. 通知を送る

### 4.1 Edge Function 内から送る（推奨）

```typescript
import { createOneSignalClient } from "../shared/onesignal/index.ts";

const onesignal = createOneSignalClient();   // env 未設定なら throw する（握りつぶさない）

await onesignal.sendToUser(userId, {
  headings: { en: "Order Shipped", ja: "発送完了" },
  contents: { en: "Your order has been shipped!", ja: "ご注文が発送されました！" },
  data: { orderId },                 // アプリ側で受け取る追加情報
  url: `https://example.com/orders/${orderId}`,
});
```

クライアントが持つメソッドは 5 つだけ。**これ以外を勝手に生やす前に、既存メソッドで足りないか確認する**:

| メソッド | 用途 | 制約 |
|---|---|---|
| `sendToUser(externalUserId, options)` | 単一ユーザー | — |
| `sendToUsers(externalUserIds[], options)` | 複数ユーザー | **2,000 件上限**（超えるとクライアント側で throw）。それ以上はセグメントを使う |
| `sendToSegment(segments[], options)` | セグメント | — |
| `sendToAll(options)` | 全購読者 | 実体は `sendToSegment(["Subscribed Users"])` |
| `sendNotification(request)` | 生のリクエスト | 上記で表現できない場合のみ。`app_id` は自動付与される |

### 4.2 アプリ（web / mobile）から送る

`POST /functions/v1/onesignal-send` を叩く。ボディは `type` + `target` の組で、`type` ごとに `target` の型が変わる:

| `type` | `target` | 意味 |
|---|---|---|
| `"user"` | `string` | external_id 単体 |
| `"users"` | `string[]` | external_id 配列 |
| `"segment"` | `string[]` | セグメント名配列 |
| `"all"` | 不要 | 全購読者 |

認証は **service_role キー or 有効な JWT** のどちらか（`verifyAuth`）。`contents` は必須。

### 4.3 多言語は必須

`headings` / `contents` は `LocalizedContent`（`Record<string, string>`）で、**必ず `en` と `ja` の両方を入れる**。
`.claude/CLAUDE.md` の i18n 必須ポリシーはユーザー向けテキスト全般にかかり、通知文面も例外ではない。
文言をハードコードで組み立てる前に、送信元が Edge Function なら翻訳テーブルをどこに置くかを決めること（現状は呼び出し側が両言語を渡す設計）。

---

## 5. Webhook を受ける

`onesignal-webhooks/index.ts` が `payload.event` で分岐し、`handlers/` の関数へ渡す。

| イベント | ハンドラ |
|---|---|
| `notification.delivered` / `.clicked` / `.dismissed` | `handlers/notification.ts` |
| `subscription.created` / `.deleted` | `handlers/subscription.ts` |
| それ以外 | ログのみ出して `success: true` を返す（OneSignal のリトライを誘発しない） |

**検証**: OneSignal は署名ベースの webhook 検証を提供していない。代わりに共有シークレットを
クエリ `?secret=` か ヘッダ `x-webhook-secret` で照合する（`ONE_SIGNAL_WEBHOOK_SECRET` が設定されているときのみ有効）。
本番の Webhook URL を設定するときは **必ずシークレット付き URL を登録**すること。

**ハンドラを実装するときの注意**: 現状の notification 系ハンドラは `TODO` コメントを残したログ出力のみで、DB 書き込みをしていない。
分析テーブルへ書き込む実装を足す場合は:

1. テーブルは **Drizzle が source of truth**（`drizzle/schema/`）。Edge Function 側でスキーマを作らない（`.claude/rules/supabase-config.md`）
2. `supabase-js` の `{ error }` は必ずチェックしてログ + 明示的な失敗にする（`.claude/rules/error-handling.md`）。`success: false` を返せば OneSignal がリトライする
3. `notification_id` + `event` で冪等にする。Webhook は重複配信されうる

---

## 6. フロントエンド

### Web (`@workspace/onesignal`)

```tsx
// app/[locale]/layout.tsx — AuthProvider の内側に置く
<AuthProvider>
  <OneSignalProvider appId={process.env.NEXT_PUBLIC_ONE_SIGNAL_APP_ID!}>
    {children}
  </OneSignalProvider>
</AuthProvider>
```

`OneSignalProvider` は **マウント前に `null` を返す**（SSR ハイドレーション対策）。この挙動を消さないこと。
コンテキストから使えるのは `isInitialized` / `isSubscribed` / `error` / `promptPush()` / `login()` / `logout()`。

### Mobile (Expo)

`react-native-onesignal` を直接使う（`@workspace/onesignal` は Web 専用）。
`OneSignalInitializer.tsx` / `.web.tsx` のプラットフォーム分岐を維持すること — Expo Web で
`react-native-onesignal` を読むと落ちる。

### UI を足すとき

通知許可を促すボタンなどの UI コンポーネントは **単体テスト不要 / Storybook 必須**（`.claude/rules/ui-testing.md`）。
一方で購読状態を扱うフックのロジック（`hooks/` 配下）は **TDD 対象**。

---

## 7. ローカルでの確認

OneSignal はローカルにモックが無いので、確認は次の順で進めるのが速い:

1. `devenv up` で Supabase + Edge Functions を起動
2. `supabase functions serve` 相当のログを devenv TUI で見る（`.claude/skills/debugging/SKILL.md`）
3. Webhook は OneSignal 側から実際に叩けないので、**手元から同じ形の POST を投げて分岐を確認**する
   （これはエージェントによる Supabase インフラ操作ではなくアプリのローカル動作確認なので curl でよい）
4. Web Push は `allowLocalhostAsSecureOrigin: true`（development のみ）で localhost でも試せる

デプロイは `devenv tasks run deploy:functions`。`verify_jwt` などの関数デプロイ設定は
`supabase/config.toml` の `[functions.*]` に書く。

> **本リポジトリに `supabase/config.toml` が無いのは意図的**（boilerplate なので不要）。
> `.claude/rules/supabase-config.md` は**この boilerplate から派生した実プロジェクト**に適用されるルールで、
> boilerplate 本体に置くべきものではない（project_id / `[remotes.*]` は派生先ごとに異なるため）。
> **「config.toml が無い」を不備として報告しないこと。**

---

## 8. よくある不具合と原因

| 症状 | まず疑うところ |
|---|---|
| 特定ユーザーに届かない | `OneSignal.login(user.id)` が呼ばれていない / ログアウトで `logout()` されず別ユーザーに紐付いたまま |
| Web で SDK が初期化されない | `NEXT_PUBLIC_ONE_SIGNAL_APP_ID` 未設定（Provider が warn を出して skip する）。Provider が `AuthProvider` の外にいる |
| Expo Web でクラッシュ | `.web.tsx` の分岐を経由せず `react-native-onesignal` を直 import している |
| Webhook が 401 | 登録した URL に `?secret=` が付いていない（`ONE_SIGNAL_WEBHOOK_SECRET` 設定時） |
| `sendToUsers` が throw | 2,000 件上限。セグメント運用に切り替える |
| 送信が 500 | `ONE_SIGNAL_APP_ID` / `ONE_SIGNAL_API_KEY` 未設定でクライアント生成時に throw |

## 9. 公式リファレンス

推測で書かないための一次情報:

- [Create notification API](https://documentation.onesignal.com/reference/create-notification)
- [Webhooks](https://documentation.onesignal.com/docs/webhooks)
- [Aliases / external_id](https://documentation.onesignal.com/docs/aliases-external-id)
- [react-onesignal](https://github.com/OneSignal/react-onesignal) / [react-native-onesignal](https://github.com/OneSignal/react-native-onesignal)
