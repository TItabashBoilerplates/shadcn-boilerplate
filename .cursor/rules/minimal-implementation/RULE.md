---
description: "Minimal implementation policy - write as little code as possible: reuse existing assets, platform features, managed services and well-maintained OSS before writing anything from scratch, without breaking FSD / monorepo boundaries"
alwaysApply: true
globs: []
---
# Minimal Implementation Policy（最小実装の原則 / Write Less Code）

**MANDATORY**: **優秀なエンジニアが書くコードは少ない。** 実装の良し悪しは「どれだけ作ったか」ではなく
**「どれだけ作らずに要件を満たしたか」**で評価する。書かなかったコードはバグらず、レビューも保守も要らない。

ただし**「行数を削る」ことではない**。可読性・型安全・テスト・エラーハンドリング・i18n を犠牲にするのは
削減ではなく品質の毀損であり、本ポリシー違反。

正典: `/.claude/rules/minimal-implementation.md`

## 意思決定順序（上から順に必ず評価する）

1. **リポジトリ内の既存資産** — `frontend/packages/*`（`@workspace/ui` / `query` / `auth` / `client-supabase` / `logger` / `api-client`）、`shared/` / `entities/`、`backend-py/packages/core`、`supabase/functions/shared/`（**まず grep する**）
2. **プラットフォーム / フレームワークの標準機能** — Web/言語標準（`Intl`・`URL`・`crypto.randomUUID`）、React 19 / Next.js 16（Server Components・`loading.tsx`・`next/image`）、PostgreSQL（制約・生成列・RLS・index・pgvector）
3. **マネージドサービス** — Supabase（Auth / Storage / Realtime / Edge Functions）、Stripe、Resend、OneSignal、LiveKit、fal、Sentry、Doppler、Vercel、EAS
4. **選定基準を満たす実績ある OSS**（下記）
5. **スクラッチ** — 1〜4 が該当しないと確認できた場合のみ

**上位で解決できるものをスクラッチした実装は却下**。逆に、数行で書ける処理やドメイン固有ロジックのために
依存を増やすのも実装量の増加（**依存 1 つ = 保守対象 1 つ**）。

**絶対に自作しないもの**: 暗号 / 認証・セッション（Supabase Auth）/ 行レベル認可（RLS）/ 決済（Stripe・RevenueCat）/
日時・タイムゾーン・ロケール（`Intl`）/ メール到達性（Resend）/ プッシュ（OneSignal）/ シークレット（Doppler）。

## ライブラリ選定基準（すべて満たすこと）

| # | 条件 |
|---|---|
| 1 | archived / deprecated でなく**直近の活動がある**（OpenSSF Scorecard の `Maintained` は「直近 90 日に週 1 コミット以上」で満点） |
| 2 | 実利用の実績（週次 DL 数・被依存数） |
| 3 | 未修正の既知脆弱性が無い（`bun audit` / OSV） |
| 4 | 商用可ライセンス（MIT / Apache-2.0 / BSD / ISC）。**AGPL / SSPL / BUSL は要ユーザー確認** |
| 5 | 型がある（TS 同梱 or 公式 `@types`、Python は `py.typed`） |
| 6 | ドキュメント・リリースノート・移行手順がある |
| 7 | transitive dependency が過大でない |

**star は補助シグナル**。少ない（数百未満）なら見送る理由になるが、**多いことは採用の根拠にならない**
（star は購入可能。CMU / NC State / Socket の ICSE 2026 研究が約 600 万件の fake star を報告）。

確認手段: `bun info <pkg>` / `bun outdated` / `bun why <pkg>` / `bun audit` / `uv tree` /
[deps.dev](https://deps.dev) / `https://scorecard.dev/viewer/?uri=github.com/<owner>/<repo>` / Context7 MCP。

**採用済み領域へ役割の重複するライブラリを持ち込まない**: UI = shadcn/ui + Radix（Web）/ gluestack-ui（Mobile）、
サーバーステート = TanStack Query、グローバルステート = Zustand、i18n = next-intl、DB = Drizzle、
API クライアント = Hey API、認証 = Supabase Auth。

## 共通化（過剰共通化も無駄な実装）

- 1 回目は書く / 2 回目はコピー可 / **3 回目で共通化**（Rule of Three）。
  ただし**不整合が事故になるもの**（スタイル定数・クエリキー・`PAGE_SIZE`・単価表・API 契約）は **2 回目で即共通化**。
- **誤った抽象化は重複より高くつく**（*duplication is far cheaper than the wrong abstraction*）。
- 配置: 複数アプリ → `frontend/packages/*` / アプリ内横断 → `shared/` / 業務エンティティ → `entities/` / feature 内 → `model/`・`lib/`。
- 抽象化を入れたら**総行数が減ったか**で成否を検証する。

**禁止（削減の名を借りた保守性の破壊）**: FSD の依存方向違反 / feature 間の直接 import /
公開 API（`index.ts`）を経由しない深い import / `shared/` の神モジュール化 / packages 間の循環依存。

## 公式ベストプラクティス優先

一次情報の優先順位: **公式ドキュメント > 公式ブログ・リリースノート > 公式リポジトリのコード・examples >
メンテナの発言 > 第三者記事**（第三者記事を単独の根拠にしない）。公式の CLI / codemod / スキャフォールドを
使い、手書きで再現しない。逸脱するなら理由と根拠を残す。

## 禁止パターン

```ts
// ❌ 自前の取得キャッシュ / fetch ラッパ / UI プリミティブ / 日付ユーティリティ / ロガー / 認証
// ❌ 1 箇所でしか使わないのに汎用化する、誰も渡さないオプションを生やす（YAGNI）
// ❌ star 数だけで選定する / archived・deprecated なパッケージを入れる / ライセンス未確認
// ❌ 行数を減らすために any・as で型を潰す、catch を省く、i18n を飛ばす、ページングを省く
```
