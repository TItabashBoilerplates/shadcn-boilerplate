# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**CRITICAL - 推測実装の完全禁止**:

- **タスク開始前に、必ず利用可能な Skill を確認し、該当するものがあれば最初に `Skill` ツールで起動すること**（詳細は `.claude/rules/skills-first.md`）
- **実装量は常に最小化すること**。既存資産 → 標準機能 → マネージドサービス → 実績ある OSS → スクラッチ の順で必ず検討し、上位で解決できるものをスクラッチしない（詳細は `.claude/rules/minimal-implementation.md`）
- **推測・記憶・一般知識に基づく実装は一切禁止**
- 実装前に必ず **Context7 MCP** または **WebSearch/WebFetch** で公式ドキュメントを確認すること
- ライブラリの API、設定ファイル形式、CLI 構文は**必ずファクトを調査**してから使用
- 「たぶんこうだろう」「以前こうだった」という推測での実装は**絶対に行わない**
- **モジュール・パッケージは必ず最新バージョンを調査し、最新のAPIを使用すること**
- **ビルド・テスト・リント等は必ず devenv のコマンド（scripts または `devenv tasks run`）を使用すること**（詳細は `.claude/rules/commands.md`）
- **Supabase 上のインフラ（DB / Storage / Auth / Edge Functions / Logs / Migrations / Advisors）を調査・操作する場合は、必ず `supabase` MCP（ローカル）または `supabase-prod` MCP（本番、read-only）を使用すること**（`psql` / `curl` / `supabase` CLI を Bash で直接叩くのは禁止。詳細は `.claude/rules/mcp-supabase.md`）
- 詳細は `.claude/rules/research.md` を参照

## Memory Structure

このプロジェクトは `.claude/` ディレクトリでメモリを構造化しています：

```
.claude/
├── rules/          # 常に適用されるポリシー・制約
│   ├── skills-first.md   # タスク開始前に Skill 確認・起動を必須化
│   ├── tdd.md            # テスト駆動開発（TDD）必須
│   ├── research.md       # Research-First ポリシー
│   ├── supabase-first.md # Supabase優先アーキテクチャ
│   ├── commands.md       # Makefile コマンド必須
│   ├── database.md       # マイグレーション承認必須
│   ├── auto-generated.md # 自動生成ファイル編集禁止
│   ├── minimal-implementation.md # 最小実装（再発明禁止・ライブラリ/マネージド選定基準・公式BP優先）
│   ├── clean-code.md     # クリーンコード（後方互換禁止・重複禁止）
│   ├── frontend.md       # Frontend コード規約
│   ├── form-controls.md  # フォーム要素（iOS Safari オートズーム禁止=16px以上・共有コンポーネント必須）
│   ├── backend-py.md     # Python コード規約
│   ├── edge-functions.md # Edge Functions 規約
│   ├── i18n.md           # 多言語対応（必須）
│   ├── ui-testing.md     # UIテスト（Storybook必須・単体テスト不要）
│   ├── render-optimization.md # 再描画最小化（FSDスライス単位のステート局所化）
│   ├── error-handling.md     # エラーハンドリング（握りつぶし禁止・フォールバック最小化）
│   ├── page-navigation.md    # ページ遷移（loading.tsx + Suspense によるストリーミング必須）
│   ├── list-pagination.md    # 一覧のページング必須（全件取得禁止・UI パターンは自分で選定）
│   ├── storage-images.md     # Storage の画像は必ず transform 経由（無変換配信禁止・SupabaseImage 必須）
│   ├── mcp-supabase.md       # Supabase インフラ操作は MCP（supabase / supabase-prod）必須
│   ├── supabase-config.md    # Supabase 設定は config.toml に集約（DB のみ Drizzle 例外）・[remotes.*] 必須・メールテンプレートは [auth.email.template.*]
│   ├── mcp-doppler.md        # Doppler シークレットの読み書きは doppler MCP 必須（書込はフェーズ制: 初期構築=full / 本番=prd 承認制・値の露出禁止）
│   ├── env-naming.md         # 予約 prefix 禁止（GITHUB_/SUPABASE_/VERCEL_ を Doppler に登録しない）・Supabase env は Vercel Marketplace 連携が注入
│   ├── auth.md               # 認証方式（Mobile はメール+パスワード必須・OTP のみ禁止 / メール再設定・パスワード忘れ・パスワード変更の導線必須）
│   ├── store-review.md       # ストア審査の不変条件（第三者AIへの事前同意 / privacy manifest / target API 36 / 掲載情報と実装の一致）
│   └── python-monorepo.md    # backend-py の uv workspace 構造（apps/+packages/、src-layout、単一uv.lock）必須
│
└── skills/         # 質問時に参照するガイダンス
                    # 公式提供のものは skills-lock.json 管理（`npx skills add <owner>/<repo>`）。
                    # 例: turborepo=vercel/turborepo, gluestack-ui-v5=gluestack/agent-skills,
                    #     feature-sliced-design, supabase, shadcn, expo/skills 各種。
                    # 独自スキルは .claude/skills/ 直下に SKILL.md を置く（lock 管理外）。
    ├── fsd/              # Feature Sliced Design
    ├── monorepo/         # ★ モノレポ実装のベストプラクティス (Bun workspace + Turborepo + FSD)
    │                     #   └ design-system.md: Web/Native/Desktop の共有境界
    ├── python-monorepo/  # uv workspace 構成 (backend-py: apps + packages, src-layout)
    ├── tanstack-query/   # TanStack Query v5
    ├── supabase/         # Supabase 認証・RLS
    ├── drizzle/          # Drizzle ORM スキーマ
    ├── rls/              # RLS パフォーマンス・ベストプラクティス（必読）
    ├── datetime/         # 日時処理
    ├── debugging/        # デバッグ手順（devenv 2.0 native CLI 優先・Supabase）
    ├── shadcn-ui/        # shadcn/ui + TailwindCSS (Web)
    ├── gluestack/        # gluestack-ui 本リポジトリ規約 (Mobile) → 一般論は公式 gluestack-ui-v5
    ├── storybook/        # Storybook 10 コンポーネントカタログ
    ├── pgtap/            # RLS・DB 関数テスト（pgTAP + supabase test db）
    ├── python-testing/   # Python単体テスト（外部SDK/TypeError検知）
    ├── fastapi/          # FastAPI ベストプラクティス（公式）
    ├── i18n/             # next-intl 多言語対応
    ├── langchain/        # LangChain/LangGraph/LangSmith
    ├── maestro/          # Maestro E2Eテスト
    ├── devenv-cicd/      # GitHub Actions × devenv 2.0 CI/CD（enterShell hook / .devenv キャッシュ / concurrency）
    ├── edge-functions-mcp/ # Supabase Edge Functions 上に MCP サーバを構築（BYO MCP: @hono/mcp + @modelcontextprotocol/sdk）
    ├── doppler/          # Doppler シークレット管理（CLI / devenv 統合 / 公式 MCP / .env.secrets からの移行）
    │
    │ # ↓ 本リポジトリ固有の運用手順（自作 Skill・lock 管理外）
    ├── ai-usage-metering/ # ★ LLM/生成AI のトークン使用量・コスト集計を設計へ標準で織り込む（集計軸・単価表・計上の罠）
    ├── vercel-deploy/    # ★ Vercel の GitHub 連携 + デプロイ（vercel-deploy script の使い方と落とし穴）
    ├── mobile-release/   # ★ EAS リリース（ビルド → アップロード → TestFlight 配布 → 審査提出 → Play のロールアウト）
    ├── store-screenshots/ # ★ ストア掲載画像（撮影ハーネス → 生成AIで背景と見出し → 合成 → 両ストアへ API 反映）
    │
    │ # ↓ 公式 Skill が存在しない外部サービス向けの自作 Skill（lock 管理外）
    ├── onesignal/        # プッシュ通知（既存実装が仕様書。external_id = Supabase user.id）
    ├── livekit/          # リアルタイム音声・映像（トークン発行はサーバ側限定・Edge FN / backend-py の切り分け）
    └── fal/              # 生成 AI 推論（モデル選定 / CLI 一元化 / FAL_KEY 非公開 / submit+webhook）
        │                 #   **画像生成の既定は openai/gpt-image-2（編集は /edit）**
        ├── references/models.md  # 意図→カテゴリ→モデルの選定・最新カタログの調べ方
        └── references/cli.md     # fal CLI（fal api でのコンテンツ生成）

# 外部サービス系の公式 Skill（skills-lock.json 管理。CLI は devenv が提供する）:
#   stripe-best-practices / stripe-integration / stripe-docs / upgrade-stripe   → CLI: stripe
#   resend / resend-cli / react-email / send-email / email-best-practices       → CLI: resend
#   sentry-get-started / sentry-instrument / sentry-debug-issue /               → CLI: sentry-cli
#     sentry-fix-stack-traces / sentry-setup-releases
#   adapty-cli                                                                  → CLI: adapty
#   revenuecat / create-revenuecat-project / integrate-revenuecat /             → 公式 CLI 無し（MCP）
#     revenuecat-{entitlements-gate,paywall,purchase-flow,identify-user,
#     testing-setup,troubleshoot}
# 選定理由・見送ったもの: docs/_research/2026-08-06-service-clis.md
```

## Domain Documentation

詳細なドメイン情報は各 README を参照：

| ドメイン          | ドキュメント                                                       |
| ----------------- | ------------------------------------------------------------------ |
| Frontend (Web)    | [`frontend/README.md`](frontend/README.md)                         |
| Frontend (Mobile) | [`frontend/apps/mobile/README.md`](frontend/apps/mobile/README.md) |
| Database Schema   | [`drizzle/README.md`](drizzle/README.md)                           |
| Backend Python    | [`backend-py/README.md`](backend-py/README.md)                     |
| Edge Functions    | [`supabase/functions/README.md`](supabase/functions/README.md)     |

---

## Architecture Overview

Full-stack application boilerplate with multi-platform frontend and backend services.

### Tech Stack

| Layer                 | Technology                                       |
| --------------------- | ------------------------------------------------ |
| **Frontend (Web)**    | Next.js 16, React 19, TypeScript, Bun            |
| **Frontend (Mobile)** | Expo 57, React Native, TypeScript                |
| **UI (Web)**          | shadcn/ui, Radix UI, TailwindCSS 4               |
| **UI (Mobile)**       | gluestack-ui, NativeWind 5, TailwindCSS 4        |
| **State**             | TanStack Query (server), Zustand (global)        |
| **Architecture**      | Feature Sliced Design (FSD)                      |
| **i18n**              | next-intl (en, ja)                               |
| **Backend**           | FastAPI (Python), Supabase Edge Functions (Deno) |
| **Database**          | PostgreSQL, Drizzle ORM, pgvector                |
| **Auth**              | Supabase Auth                                    |

**MANDATORY**: 調査・実装・レビュー・デバッグなど、**あらゆるタスクを開始する前に必ず利用可能な Skill 一覧を確認**し、該当するものがあれば**最初に `Skill` ツールで起動**すること。Next.js / Supabase / Drizzle / FSD / shadcn / gluestack / Better Auth / Stripe / Resend / Maestro / LangChain / TanStack Query 等、本リポジトリで使用する主要技術には Skill が用意されている。Skill を確認せずに着手する実装はやり直しとなる。詳細は `.claude/rules/skills-first.md` を参照。

**MANDATORY**: すべてのユーザー向けテキストは多言語対応（i18n）必須。詳細は `.claude/skills/i18n/` を参照。

**MANDATORY**: すべての実装はテスト駆動開発（TDD）を厳守。**作業終了時は必ず All Green（全テスト通過）を確認**。詳細は `.claude/rules/tdd.md` を参照。

**MANDATORY**: 単体テストでは**外部SDK（pipモジュール）を丸ごとMockしない**。本物のSDKを使い、I/O層（HTTP/DB）のみ差し替えることで、**TypeError・ValueError・RuntimeError を単体テスト時点で検知**し、型安全で堅牢な状態を維持する。詳細は `.claude/rules/backend-py.md` および `.claude/skills/python-testing/` を参照。

**MANDATORY**: **実装は常に最小量にする（Write Less Code）**。優秀なエンジニアが書くコードは少なく、**書かなかったコードはバグらず・レビュー不要・保守不要**である。機能に着手したら、コードを書く前に必ず **①リポジトリ内の既存資産（`frontend/packages/*` / `shared/` / `entities/` / `backend-py/packages/core` / `supabase/functions/shared/`）→ ②フレームワーク・プラットフォーム・PostgreSQL の標準機能 → ③マネージドサービス（Supabase Auth/Storage/Realtime、Stripe、Resend、OneSignal、LiveKit、fal、Sentry、Doppler、Vercel、EAS）→ ④選定基準を満たす実績ある OSS → ⑤スクラッチ** の順に評価し、**上位で解決できるものをスクラッチしない**。逆に、数行で書ける処理・プロダクト固有のドメインロジックのために依存を増やすのも実装量の増加であり禁止（**依存を 1 つ増やす = 保守対象を 1 つ増やす**）。**暗号・認証・認可・決済・日時/ロケール・メール到達性は絶対に自作しない**。**ライブラリ選定は star 数のみを根拠にしてはならない**（star は購入可能で、CMU/NC State/Socket の研究が約 600 万件の fake star を報告している）: **archived / deprecated でなく直近の活動がある（OpenSSF Scorecard の `Maintained` は「直近 90 日に週 1 コミット以上」で満点）・実利用の実績がある・未修正の既知脆弱性が無い・商用可ライセンス（AGPL/SSPL/BUSL は要ユーザー確認）・型がある・移行手順が示される・依存が浅い**、を `bun info` / `bun outdated` / `bun why` / `bun audit` / `uv tree` / [deps.dev](https://deps.dev) / [scorecard.dev](https://scorecard.dev) / Context7 MCP で**実際に確認**すること。**既に技術選定が済んでいる領域（shadcn/ui・gluestack-ui・TanStack Query・Zustand・next-intl・Drizzle・Hey API・Supabase Auth）へ役割の重複するライブラリを持ち込むのは禁止**。共通化は Rule of Three（不整合が事故になるスタイル定数・クエリキー・`PAGE_SIZE`・単価表は 2 回目で即共通化）で判断し、**誤った抽象化は重複より高くつく**（Sandi Metz: *duplication is far cheaper than the wrong abstraction*）。**ただし削減のために FSD の依存方向・公開 API・monorepo の境界を壊すこと、型を `any` で潰すこと、テスト/エラーハンドリング/i18n/ページングを省くことは本ポリシー違反**（減らすのは実装の総量であって保守性ではない）。設計・実装は**常に公式が推奨するベストプラクティスを一次情報で調査・理解したうえで**行い、公式の CLI / codemod / スキャフォールドを手書きで再現しない。逸脱する場合は理由と根拠を残す。詳細は `.claude/rules/minimal-implementation.md` を参照。

**MANDATORY**: コードは常にクリーンな状態を維持。後方互換コード・重複コード・未使用コードは残さない（明示的な指示がある場合を除く）。詳細は `.claude/rules/clean-code.md` を参照。

**MANDATORY**: **テキスト入力を受け付けるフォーム要素（`<input>` / `<textarea>` / ネイティブ `<select>` / `contenteditable`）は、モバイル幅で必ず font-size 16px 以上**にする（`text-base md:text-sm` が標準形）。**iOS Safari は 16px 未満のフォーム要素にフォーカスすると自動でズームイン**するため、`text-sm`(14px) / `text-xs`(12px) は禁止。`maximum-scale=1` / `user-scalable=no` による回避も **WCAG 1.4.4 違反**につき禁止。あわせて、**フォーム要素のスタイルは `@workspace/ui` の共有コンポーネント 1 か所にのみ定義**し、`textareaClass` のようなローカル定数を各画面にコピペすることを禁止する（実際に textarea が 6 ファイルに重複し全部ズーム対象になった事故がある）。checkbox / radio / file や Radix の `SelectTrigger`（実体は `<button>`）はズームしないため対象外。詳細は `.claude/rules/form-controls.md` を参照。

**MANDATORY**: コンポーネントの再描画は必要最小限に抑える。FSD のスライス単位でステートを局所化し、状態変更の影響範囲をそのスライス内に閉じ込める。TanStack Query の invalidation はピンポイント、Zustand は必ずセレクター使用、Widget/View にビジネスステートを持たせない。詳細は `.claude/rules/render-optimization.md` を参照。

**MANDATORY**: **一覧（リスト）画面は、件数が増えうるなら開発者から指示されなくても最初からページングを実装する**。判定は「時間・ユーザー数・外部連携で行が増えるか」「件数上限がスキーマ/仕様でハードに保証されているか」で行い、保証が無ければ必ずページングする（「今はデータが少ない」は理由にならない — seed では顕在化せず本番で壊れる）。**全件取得は禁止**で、クエリには必ず `limit` / `range` を付け、**ページングは常に DB 側**（クライアントの `slice` は禁止）。API の `limit` はサーバー側でクランプする。**UI パターン（ページ番号 / もっと見る / 無限スクロール）はエージェント自身が選定する**: Web の管理画面・検索結果・SEO 対象の公開一覧は**ページ番号 + URL 同期**（`?page=`。共有・戻る・クローラビリティのため）、Web の探索的グリッドは**「もっと見る」**、Mobile（Expo/RN）は**無限スクロール**（`onEndReached` + 仮想化リスト）、チャット/タイムラインなど新着が前方に挿入される一覧は**カーソル(keyset)**。迷ったら「もっと見る」を選ぶ（フッターに到達でき、キーボードで進め、後から双方向に移行できる）。無限スクロールにする場合は「もっと見る」ボタンを DOM に残す（キーボード fallback）・フッターを潰さない・スクロール位置を復元することが必須条件。`order` には必ず一意列の tiebreaker を付け（無いとページ間で重複/欠落する）、ソートキーに index を張り、総数が UI 要件でなければ `count` を取らない（大テーブルは `estimated`）。初回ローディング / 追加ローディング / 空 / エラー / 末尾到達の 5 状態を必ず用意する。詳細は `.claude/rules/list-pagination.md` を参照。

**MANDATORY**: **フロントエンドで表示する画像が Supabase Storage 上のものなら、必ず Image Transformation API 経由で配信する**（開発者からの指示を待たない）。元画像の URL（`/storage/v1/object/public/...` や無変換の署名 URL）を `<img>` / `next/image` / `expo-image` に渡してはならない。**画像はアプリの egress の大半を占める**ため、表示 40px のアバターに 4MB の JPEG を配ると、そのまま Supabase の egress 課金とユーザーの待ち時間になる。変換 API を通せば表示サイズちょうどにリサイズされ、**対応クライアントには自動で WebP** が返る（コード変更不要）。**課金は「変換した元画像の数」であって変換回数ではない**ので、サイズを増やしても課金は増えない（「課金が怖いから無変換」は egress を増やすだけの逆効果）。実装は用意済みで、**呼び出し側は Web / Mobile とも `@/shared/ui` の `SupabaseImage` を使うだけ**: public バケットは `bucket` / `path` を渡し（Web は `next/image` の srcset が丸ごと変換 URL になる）、**private バケット（本リポジトリの既定）はサーバー側で `createSignedStorageImageUrl()` を呼び `signedUrl` を渡す**（transform は署名時に焼き込まれ後から変えられない）。幅は `IMAGE_WIDTH_LADDER` の段に丸める（1px 刻みだと CDN キャッシュが総崩れする）ので**自前で計算しない**。`width` / `height` は 1〜2500、`quality` は 20〜100 で、**Pro Plan 以上 + Dashboard の Enable Image Transformations 有効**が前提。ローカルは `config.toml` に `[storage.image_transformation] enabled = true` が要る（無いとローカルだけ壊れる）。**Next.js の `images.loaderFile` は使わない**（全 `next/image` に効いてローカル静的画像まで 404 にする。`loader` prop で Supabase の画像だけに適用する）。DB には完全な URL ではなく `bucket` / `path` を保存する。これらは `storage-image.policy.test.ts` が CI で検査する（**無変換でも画面は正しく表示され lint も型も通るため、静的検査でしか止められない**）。詳細は `.claude/rules/storage-images.md` を参照。

**MANDATORY**: エラーは握りつぶさず適切にエラーとして処理する。不必要なフォールバック処理は禁止。catch したら必ずログ出力 + リスロー or 明示的 Result 型。supabase-js の `{ error }` は必ずチェック。フォールバックは付随的処理（analytics等）のみ許容。詳細は `.claude/rules/error-handling.md` を参照。

**MANDATORY**: **LLM / 生成 AI を機能として組み込むときは、トークン使用量とコストの計測・集計を最初から設計に含める**（後付け禁止）。生成 AI は実行のたびに原価が動く数少ない機能であり、**使用量イベントは過去に遡って作れず、集計軸（`organization_id` 等）は後から列を足しても過去行が埋まらない**。したがって「モデルを呼ぶコードを書く」と「使用量イベントを 1 件記録する」は常にセットで実装する。**集計単位（ユーザー / 組織 / 機能 / 会話）・上限制御の有無・円換算の方式はサービス特性で変わるので、一律の型を当てず、そのサービスに適した形で決める**。判断材料（テナントの有無 / 料金プラン / 会計方針）は既存のスキーマや要件から読み取れることが多いのでまず調べ、**読み取れず推測になる場合は開発者の判断を仰ぐ**。とくに**集計軸と円換算方式は後から変えられない**（過去行が埋まらない / 会計は継続適用が条件）ので、ここは推測で進めない。原則: ①**最終成果物はトークン数ではなく金額（USD）**。入力/出力/キャッシュ読み/書きは単価が違うのでトークン合計から金額は復元できない。**全イベントに確定した USD 金額が入っている状態**をゴールにし、使用量画面にもドルを出す ②プロバイダが返した usage の**生値**を残す（単価誤りの再計算用）③**単価はコードに書かず** `effective_from` 付きの単価表データとして持ち、イベントに使用した単価を凍結する（**モデルを 1 つ足したらその場で単価登録するまでが実装**。未登録時は 0 ではなく `price_missing` として集計から除外し件数を可視化する）④プロバイダのレスポンス ID に**一意制約**を張って二重計上を DB で弾く。キャッシュ読み書き・reasoning トークン・ストリーミング中断は計上を間違えやすい（プロバイダごとに内数/外数が違う）。詳細は `.claude/skills/ai-usage-metering/` を参照。

**MANDATORY**: フロントエンド・バックエンドのデバッグは **devenv 2.0 の native process manager の TUI** を主インターフェースとして使用する。`devenv up` を対話端末で実行すると TUI が自動起動し、プロセス一覧・ログ閲覧・再起動がキーボード操作で可能。詳細は `.claude/skills/debugging/SKILL.md` を参照。

**MANDATORY**: Supabase 上のインフラ（DB / Storage / Auth / Edge Functions / Logs / Migrations / Advisors / 設定）を**調査・操作**する場合は、必ず **`supabase` MCP**（ローカル）または **`supabase-prod` MCP**（本番、read-only）を使用する。`psql` / `curl` / `supabase` CLI を Bash で直接叩くのは禁止。本番への書き込みが必要な場合は必ずユーザーに判断をあおぐこと。詳細は `.claude/rules/mcp-supabase.md` を参照。

**MANDATORY**: Supabase の**サービス設定値はすべて `supabase/config.toml` を single source of truth として Git 管理する**（Auth / Storage / API / Realtime サービス / Edge Runtime / Functions のデプロイ設定 / メールテンプレート）。Dashboard での手動変更は禁止。**唯一の例外は DB（スキーマ / RLS / Realtime publication / migration）で、これは Drizzle が source of truth**。認証メールテンプレートは `supabase/templates/email/*.html` に置き、`[auth.email.template.*]` の `content_path` で配線する。Secret は必ず `env()`。本番反映は GitHub 連携（config 同期）に委譲。詳細は `.claude/rules/supabase-config.md` を参照。**ただし本リポジトリは boilerplate なので `supabase/config.toml` を意図的に置いていない**（`project_id` / `[remotes.*]` 等は派生先ごとに異なるため）。**「config.toml が無い」を不備として報告しないこと。**本ポリシーが効くのは、この boilerplate から実プロジェクトを起こした後（`.claude/rules/supabase-config.md` §0）。

**MANDATORY**（派生プロジェクトで `config.toml` を作る時点から適用。boilerplate 本体には config.toml を置かない）: `supabase/config.toml` を**新規生成・更新するときは、リモート環境ごとに `[remotes.<name>]` を必ず書く**。公式仕様上「**宣言が無い / `project_id` が違うと、その環境への設定適用ステップは丸ごとスキップされる**」（[Branching: Configuration](https://supabase.com/docs/guides/deployment/branching/configuration)）。**スキップはエラーも警告も出さない**ため、「メールテンプレートだけ反映されない」という形でしか気づけない — これが本リポジトリで繰り返し起きている不具合の根因である。`project_id` には **`supabase --experimental branches list` の BRANCH PROJECT ID**（親 project の ref ではない）を、**ブロックごとに異なる値**で入れる。persistent branch を**先に作ってから**書くこと。メールテンプレート等の共通設定は **root に 1 回**書けばよく（`[remotes.X]` が存在すれば root がベースとして適用される）、remotes 側へのコピーは不要。詳細は `.claude/rules/supabase-config.md` §1.5 と `.claude/skills/supabase-config/references/multi-environment.md`。

**MANDATORY**: Doppler 上のシークレット（projects / configs / secrets）を**調査・作成・更新**する場合は、必ず **`doppler` MCP**（read-write）を使用する。Bash で `doppler secrets set` / `doppler secrets delete` を直接叩くのは禁止。書き込み許可は**フェーズ制**（`.claude/rules/mcp-doppler.md` 冒頭の `PHASE:` を書き込み前に必ず確認）: **初期構築（full-access）= 全 config 可** / **本番（protected）= `prd` 書き込みは明示承認制**。フェーズ不明時は本番（protected）として扱う。**シークレットの値をチャット / ログ / コミットに出さない**（キー名のみで会話）。詳細は `.claude/rules/mcp-doppler.md`。

**MANDATORY**: **Doppler に `GITHUB_` / `SUPABASE_` / `VERCEL_` prefix のキーを登録してはならない**。これらは各 PF が予約している名前空間であり、Doppler ネイティブ連携の sync 時に**予約値違反でエラー**になり、その config の sync 全体が失敗する（GitHub:「Must not start with the `GITHUB_` prefix」／ Supabase:「Env name cannot start with SUPABASE_」／ Vercel: `VERCEL_*` は system 環境変数）。**とくに Supabase の環境変数は Doppler で管理しない** — **Vercel（web / backend）へは Vercel Marketplace の Supabase 連携（Connect Account）が `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` / `NEXT_PUBLIC_SUPABASE_*` / `POSTGRES_*` を自動注入**し、**Edge Functions へは Supabase platform が default secrets として自動提供**する。つまり「Supabase の値が要る」は Doppler にキーを作る理由にならない（二重管理も禁止）。ローカルの `env/<svc>/.env.local` はファイル管理なので本制約の対象外。詳細は `.claude/rules/env-naming.md` を参照。

**MANDATORY**: **モバイルアプリ（Expo / RN。ストア配布するもの）を実装する場合、主たるログイン手段は必ず「メールアドレス + パスワード」にする。OTP / Magic Link を唯一のログイン手段にしてはならない**（OAuth / パスキー / OTP の**併用**は可）。理由は App Store Review Guideline **2.1(a)** が審査担当者へ「**an active demo account** ... **login credentials**」の提供を求めているため — OTP しか無いと**レビュー担当者は 6 桁コードやリンクが届く受信箱に触れず、ログインできないまま 2.1 リジェクト**になる（審査用のバックドアや固定コードで回避するのも別の指摘対象）。Google Play も同様にテストアカウントの資格情報を求める。**Web だけで完結する（モバイルを出さない）プロダクトなら OTP / Magic Link を主手段にしてよい**。**Web とモバイルの両方がある場合は、同じ資格情報で両方に入れるよう両方をメール + パスワードに揃える**（Web 側は OTP 併用可）。さらに**認証方式が OTP でもメール + パスワードでも、アプリ内に「メールアドレスの再設定」導線を必ず用意する**（設定 / アカウント画面）。**メール + パスワードの場合は、加えて「パスワードを忘れた方」導線を必ずログイン画面に置き**（忘れた人はログイン後の画面に到達できないため、設定画面だけに置くのは実装ミス）、**設定画面にパスワード変更導線を置く**（**`updateUser({ current_password, password })` + `[auth.email] secure_password_change = true` で検証する。`signInWithPassword` を検証目的で呼ぶのは新セッションが発行される副作用があり誤り**）。メール変更は `double_confirm_changes = true`（既定）を落とさず**旧・新の両アドレスで確認**し、その旨を UI にも明示する。モバイルのパスワード再設定は**ディープリンクではなく 6 桁コード方式（`resetPasswordForEmail` → `verifyOtp({ type: 'recovery' })` → `updateUser({ password })`）を既定**にする（`recovery` テンプレートに `{{ .Token }}` が必要）。これらは開発者からの指示を待たずに最初から実装する。詳細は `.claude/rules/auth.md` を参照。

**MANDATORY**: **Vercel への連携・デプロイ、およびモバイル（EAS）のリリースは、必ず専用 script 経由で行う**。`vercel` / `eas` を Bash で直接叩いて手順を再発明しない。Vercel は `vercel-deploy`（`scripts/infra/vercel_deploy.sh`）、モバイルは `mobile-release-ios` / `mobile-release-android`（`scripts/mobile/release-*.sh`）が正規経路で、**GitHub 連携・rootDirectory 設定・`--archive=tgz`（15000 files 上限の回避）・資格情報の復元と後始末・eas.json の一時注入と復元・EAS への `EXPO_PUBLIC_*` push** といった、抜けると無言で壊れる手順がすべて入っている。**モバイルビルドは expo.dev（クラウド）とローカル（`--local`）の両方に対応**し、既定はクラウド。**認証情報はすべて Doppler が唯一のソース**（Vercel は `VC_TOKEN`、モバイルは `EXPO_TOKEN` / `APPLE_*` / `PLAY_SERVICE_ACCOUNT_JSON`）で、モバイル script は起動時に `doppler run` で自身を再実行して注入するため呼び出す側の準備は不要。**値はチャット / ログ / コミットに出さない**（キー名のみで会話）。runtime secret は Doppler→Vercel のネイティブ連携、Supabase の値は Vercel Marketplace 連携が供給するので**手で env に入れない**。詳細は `.claude/skills/vercel-deploy/` および `.claude/skills/mobile-release/` を参照。

**MANDATORY**: **`mobile-release-ios` / `mobile-release-android` は「アップロードまで」しか行わない。リリースはそこで終わりではない。** アップロード直後の iOS は Apple 側の処理待ちで**テスターにも届かず審査にも出ておらず**、Android は `eas.json` の submit プロファイルが `releaseStatus: "draft"` なので**誰にも配られていない**。この続き（TestFlight 配布 / App Store の審査提出 / Play のトラック昇格と段階的公開）も**専用 script があるので、App Store Connect / Play Console を人に開かせない**: **`store-status`（★ 迷ったらまずこれ。書き込まないので随時実行してよい）/ `store-testflight` / `store-submit-ios` / `store-release-play`**。とくに **`eas submit` は審査に出さない**（版の作成・ビルド紐付け・リリースノート・**審査担当者用のログイン情報**・3 段階の提出 API が別途必要で、どれが欠けても「一部のフィールドが不足しています」としか出ない）。**審査中の版を編集すると審査が取り下げられる**ため、操作の可否判断は `scripts/mobile/release-plan.mjs`（単体テストで固定）に集約してあり、危険な状態では script が実行前に落ちる — **この判断を各 script やエージェントの推測で上書きしないこと**。**Play の `--rollout` は 0 と 1 が「割合」ではない**（全公開は `--rollout 1` = `completed`、停止は `--halt`。停止しても既にインストール済みの端末は戻らないので本番は 10% から始める）。審査情報は Doppler の `APPLE_REVIEW_CONTACT_*` / `APPLE_REVIEW_DEMO_ACCOUNT` / `APPLE_REVIEW_DEMO_PASSWORD`（**値はチャット・ログ・コミットに出さない**）。**App Privacy ラベル（Apple）・Data safety（Play）・EU DSA トレーダーステータス・Play のクローズドテスト（12 人 × 14 日、2023-11-13 以降の個人アカウントのみ）には公開 API が無い**ので、これらは「人がやる必要がある」と報告する（黙って進めてもエラーではなく「反映されない」形で失敗する）。**「ビルドが通った」で完了報告しない** — ユーザーに届いていないなら未完であり、どこで止まっていて誰が何をすれば進むのかまで書く。手順・状態遷移表・トラブル対応の正本は `docs/store/release-runbook.md`。

**MANDATORY**: **ストアへの反映（掲載情報・スクリーンショット・課金商品）も専用 script 経由で行う**（`scripts/mobile/store.sh` = `store-push-*` / `store-create-*` / `store-equalize-*`）。**必ず先に `--dry-run` を通す**（本番の掲載情報と課金商品を書き換えるため）。正本は `frontend/apps/mobile/` の **`store.config.js`（App Store の文言）/ `play.config.js`（Play の文言・画像）/ `iap.config.js`（サブスク商品。両ストア共通）** で、スクリーンショットは `store-listing/`。**EAS Metadata はスクリーンショットを扱えず Google Play にも対応しない**ため、画像と Play の掲載情報は App Store Connect API / Play Developer API を直接叩く（fastlane は使わない）。**`store-create-ios-subscriptions` の後は `store-equalize-ios-prices` が必須**（基準地域の価格しか作られないので、省くと商品が永久に `MISSING_METADATA` のままになり原因が非常に分かりにくい）。**Play の base plan / offer は DRAFT で作成される**ので有効化を忘れない。審査要件のコード側不変条件は `.claude/rules/store-review.md`、初回提出の全体手順は `docs/store/submission-checklist.md`、掲載文の設計は `docs/store/aso.md`、掲載画像の作り方は `.claude/skills/store-screenshots/` を参照。

**Supabase の Docker コンテナ自体は Supabase CLI が所有**（devenv の native process supervisor は backend / storybook のみ監視）。**起動連動**: `supabase:start` task が backend の `before` に登録されているため `devenv up` 起動時は Supabase → backend の順で立ち上がる。**停止は手動運用**: devenv 2.0 native process manager は task の `after` も `process.manager.after` も動作しない（前者は shutdown 時に cancel、後者は assertion でブロック、native の Rust shutdown パスに task runner 呼び出しが無いため）。auto-stop の中途半端な実装は持たず、停止は `supabase-stop` / `stop` script で明示的に行う運用に統一している。`stop` script は devenv プロセスと Supabase 両方を停止する。

`devenv shell` 進入時 (direnv 経由含む) に `setup:install-*` task が lockfile 変更を検知して `bun install` / `uv sync` を自動同期する (`--frozen-lockfile` / `--frozen` 使用)。

| コマンド | 用途 |
|---------|------|
| `supabase-start` (script) | Supabase ローカル起動（Docker） + Storage Buckets シード |
| `supabase-stop` (script) | Supabase ローカル停止 |
| `devenv up` | **軽量セット**: Supabase + backend + storybook を起動（TUI 付き）。**終了時に Supabase は自動停止しない** → `stop` または `supabase-stop` で手動停止 |
| `devenv up web` | web アプリ単独起動（同様に `devenv up backend storybook web` のような任意組み合わせも可） |
| `dev-web` (script) | 軽量セット + Next.js (web) 一括起動 |
| `dev-mobile` (script) | 軽量セット + Expo Metro (mobile, non-interactive) |
| `dev-all` (script) | 軽量セット + 全フロントエンドアプリ一括起動 |
| `devenv up -d` | バックグラウンド（detached）起動。TUI なし |
| `devenv processes down` | detached で動いているプロセスの停止（**Supabase は残る** → `stop` または `supabase-stop` で別途停止） |
| `devenv processes wait` | 全プロセスが ready になるまで待機（CI で使用） |
| `stop` (script) | devenv プロセス + Supabase の両方を停止 |
| `frontend` (script) | モノレポ全体 (`turbo dev` = web + mobile 並列、devenv 外、重い) |
| `mobile` / `mobile-ios` / `mobile-android` / `mobile-web` (script) | Expo 対話的 TUI (devenv 外) |
| `devenv shell -P android` | **Android ネイティブビルド toolchain**（JDK 17 + Android SDK + NDK）。**opt-in profile**（数 GB あるので既定では入らない）。有効時のみ `mobile-android-run` / `mobile-android-prebuild` / `build-mobile-android-local` / `android-info` が使える |
| `devenv shell -P android-emulator` | ↑ + Android エミュレータ + system image（実機も Android Studio も無い場合） |

TUI が主なので、ログ閲覧・個別プロセス再起動・状態確認は TUI 内のキーバインドで操作する（`devenv up` を実行するだけで使える）。

`frontend/apps/<name>` 配下のアプリは **opt-in process** (`start.enable = false`) なので、`devenv up` 単体では起動しない。明示指定または `dev-<name>` script を使う。新規アプリ追加時は `devenv.nix` の `frontendApps` attrset に 1 行追加するだけで、process / `dev-<name>` script / `dev-all` がすべて自動連動する。

> Profile: **local が既定**（base enterShell で env がロードされる）なので `-P local` は不要。`dev` / `staging` / `production` profile は `devenv up -P dev` / `devenv tasks run -P production deploy:functions` のように `-P` 指定で env を上書きする。
> ⚠️ **`devenv tasks run` をリモート profile で叩くときは `ENV=<profile>` を前置する**（例: `ENV=production devenv tasks run -P production ...`）。base enterShell が `export ENV="${ENV:-local}"` のため、`-P` だけだと ENV=local のまま `env/<svc>/.env.local` のローカル値を掴む。CI では job env で `ENV` を渡している（`.github/workflows/migrate.yml`）。env ファイル (`env/<service>/.env.<profile>`) は未配置でも profile アクティベーションは成功する（後置き OK）。

> Makefile は **deprecated**。すべて devenv のコマンドへ移行済み。`make X` を叩くと案内メッセージのみ出力する。

### Package Management

| Component                                 | Package Manager |
| ----------------------------------------- | --------------- |
| Frontend Web (`frontend/apps/web/`)       | **Bun**         |
| Frontend Mobile (`frontend/apps/mobile/`) | **Bun**         |
| Backend Python (`backend-py/`)            | **uv**          |
| Drizzle (`drizzle/`)                      | **Bun**         |
| Edge Functions (`supabase/functions/`)    | **Deno**        |

---

## Quick Reference

### Development Commands

すべて devenv shell (direnv 経由) で PATH 上に存在する **scripts** か、`devenv tasks run <name>` で起動する **tasks**。`make X` は使わない。

```bash
# Setup
# `devenv shell` 進入 (direnv 経由含む) で setup:* タスクが自動実行:
#   - setup:install-frontend → bun install (frontend) ※ lockfile 変更検知時のみ
#   - setup:install-drizzle  → bun install (drizzle)
#   - setup:install-backend  → uv sync --all-packages (backend-py workspace: apps/api + apps/mcp + packages/core)
# 明示的なブートストラップタスクは不要。

# Services
supabase-start                # Supabase (Docker) のみ起動
supabase-stop                 # Supabase (Docker) のみ停止
devenv up                     # 軽量セット: Supabase + backend + Storybook
dev-web                       # 軽量セット + Next.js (web)
dev-mobile                    # 軽量セット + Expo Metro (mobile, non-interactive)
dev-all                       # 軽量セット + 全 frontendApps
devenv up backend web         # 任意組み合わせ
mobile-ios / mobile-android / mobile-web   # Expo 対話的 TUI (devenv 外、別ターミナル)

# Android ネイティブビルド (opt-in profile。JDK 17 + Android SDK + NDK は数 GB あるので既定では入らない)
devenv shell -P android                    # toolchain 入りの shell
devenv shell -P android -- android-info    # 解決された JDK / SDK / NDK / cmake の確認
devenv shell -P android -- mobile-android-run          # expo run:android (prebuild → Gradle → adb install)
devenv shell -P android -- build-mobile-android-local  # eas build --platform android --local
devenv shell -P android-emulator           # ↑ + エミュレータ + system image
stop                          # devenv プロセス + Supabase をすべて停止

# Quality
# 公式推奨の 2 段階構成:
#   - コミット時 → git-hooks (biome/ruff/ruff-format/mypy/denofmt/denolint) が変更ファイルだけ実行 (<200ms)
#   - 手動 / ローカル verify・CI → どちらも `ci-check` (= `devenv tasks run ci:check` aggregator)。
#                                    execIfModified キャッシュで incremental skip
#   - ⚠️ `devenv test` は verify に使わない (git-hooks 専用)。enterTest 経由で process phase が走り
#     supabase:start → model:frontend が auto-generated な schema.ts を上書きする + prek が
#     verify task と並行実行されて "files were modified by this hook" で false failure になるため
lint                         # 全プロジェクトの lint (auto-fix、シンプル sequential)
format                       # 全プロジェクトの format (auto-fix)
format-check                 # 各 sub-project の format-check sequential
type-check                   # 各 sub-project の type-check sequential
ci-check                     # = `devenv tasks run ci:check` (キャッシュ込み)。ローカルも CI もこれ 1 本
devenv test                  # git-hooks (prek) を全ファイルに対して実行するだけ。verify は ci-check を使う

# 個別サブプロジェクト
lint-frontend / lint-drizzle / lint-backend-py / lint-functions / lint-fsd
format-frontend / format-drizzle / format-backend-py / format-functions
type-check-frontend / type-check-mobile / type-check-backend-py / check-functions

# Tests
unit-test                     # 全 unit test (frontend + backend-py) ※ `test` は bash 組み込みと衝突するため `unit-test`
test-frontend                 # Vitest
test-backend-py               # pytest
test-db                       # pgTAP DB tests
e2e / e2e-web / e2e-mobile    # Maestro E2E

# Database
# ローカルは AI 自動実行可、本番 / staging (`db:migrate-deploy`) はユーザー承認必須。詳細は .claude/rules/database.md
devenv tasks run app:migrate-dev   # ローカル: Generate + apply migration + type 生成（フルフロー、AI 実行可）
devenv tasks run db:migrate-dev    # ローカル: マイグレーション生成 + 適用のみ（AI 実行可）
devenv tasks run model:build       # 型のみ再生成（AI 実行可）
# 本番/staging への適用は GitHub Actions (migrate.yml) が正規経路（承認ゲート + 監査ログ）
gh workflow run migrate.yml --ref main -f environment=production   # ⚠️ ユーザー承認必須
# ローカルから直接叩く場合は ENV= を必ず前置（-P だけだと ENV=local のまま = ローカル DB を見る）
ENV=production devenv tasks run -P production db:migrate-deploy    # ⚠️ 緊急時のみ

# Deploy / Release
# 資格情報はすべて Doppler。devenv shell 進入時に env へロード済みなので追加準備は不要。
vercel-deploy                      # frontend/apps/web を Vercel へ (GitHub 連携 + rootDirectory 設定 + デプロイ)
vercel-deploy frontend/apps/lp     # 任意アプリ (--no-deploy / --preview / --dry-run)
mobile-release-ios                 # iOS: expo.dev でビルド → TestFlight (--local でローカルビルド)
mobile-release-android             # Android: expo.dev でビルド → Play 内部テスト (--local 可)
sync-eas-env production            # Doppler の EXPO_PUBLIC_* を EAS へ同期

# ストアへの反映（本番を書き換えるので必ず先に --dry-run）。正本は mobile/{store,play,iap}.config.js
mobile-metadata                    # App Store の文言 (store.config.js → eas metadata:push)
store-push-ios-screenshots         # App Store のスクショ (EAS Metadata では出せない)
store-push-play-listing            # Play の文言 + アイコン + スクショ (1 つの edit で commit)
store-create-ios-subscriptions     # サブスク商品を ASC に作成
store-equalize-ios-prices          #   ↑ の後に必須（全地域へ等価価格。省くと永久に準備中のまま）
store-create-play-subscriptions    # サブスク商品を Play に作成
store-create-play-offers           # Play の無料トライアル (作成 → activate)
screenshots-mobile                 # スクショ撮影 → 検証 (--upload で上記 push へ委譲)

# リリースの進行（mobile-release-* は「アップロードまで」。ここから先が配布と公開）
store-status                       # ★ 両ストアの状態と「次の一手」（書き込まない。--json 可）
store-testflight --wait            # iOS: 処理待ち → グループ配布 → 外部なら Beta App Review
store-submit-ios                   # iOS: 版作成 → ビルド紐付け → ノート → 審査情報 → 審査提出
store-submit-ios --status          #   状態のみ / --cancel 取り下げ / --phased 段階的リリース
store-release-play --track internal --rollout 1                      # Play: テスターへ配る
store-release-play --from internal --track production --rollout 0.1  # Play: 本番へ 10%
store-release-play --track production --halt                         # Play: ロールアウト停止
# → 手順・落とし穴は .claude/skills/vercel-deploy/ / mobile-release/ / store-screenshots/
#    リリース手順の正本は docs/store/release-runbook.md
#    初回提出の全体手順は docs/store/submission-checklist.md

# Task graph 確認 (依存・実行順序を可視化)
devenv tasks list                          # 全 task の階層表示
devenv tasks list --mode before app:migrate-dev   # 上流依存の確認
devenv tasks list --mode after  supabase:start    # 下流影響の確認
```

### Environment Configuration

```
env/
├── README.md                  # env/ の構成・方針（canonical）
├── backend/.env.local         # Backend 非機密 config
├── frontend/.env.local        # Frontend (Next.js) 非機密 config
└── migration/.env.local       # Database migration 非機密 config
```

> シークレット・リモート値は Doppler 一本（ファイルに置かない）。新規キーは `doppler-set <KEY>`。
> ⚠️ **`GITHUB_` / `SUPABASE_` / `VERCEL_` prefix は Doppler に登録禁止**（sync が予約値違反で落ちる）。
> Supabase の env は **Vercel Marketplace の Supabase 連携**（Vercel）と **default secrets**（Edge Functions）
> が自動供給する。詳細は `.claude/rules/env-naming.md`。

> シークレットは **Doppler 管理**（`$ENV` 駆動・ファイルフォールバック廃止）。`env/<svc>/.env.<ENV>`
> は非機密 config のみ。詳細は `env/README.md` / `.claude/skills/doppler/SKILL.md`。

### ni Commands (Package Manager Abstraction)

このプロジェクトでは [ni](https://github.com/antfu-collective/ni) を使用してパッケージマネージャーを抽象化しています。

| ni              | Bun equivalent       | 説明                           |
| --------------- | -------------------- | ------------------------------ |
| `ni`            | `bun install`        | 依存関係をインストール         |
| `ni package`    | `bun add package`    | パッケージを追加               |
| `ni -D package` | `bun add -d package` | 開発依存として追加             |
| `nr script`     | `bun run script`     | package.json のスクリプト実行  |
| `nlx command`   | `bunx command`       | パッケージを一時的に実行       |

**重要**: `nr` コマンドは package.json の scripts を実行する際に使用します。

```bash
# 例: frontend/apps/web/ で開発サーバーを起動
cd frontend/apps/web && nr dev

# 例: テストを実行
nr test

# 例: ビルドを実行
nr build
```

---

## Supabase Configuration

| Setting                  | Location                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| Auth (OAuth, JWT, MFA)   | `supabase/config.toml`                                               |
| Auth email templates     | `supabase/config.toml` (`[auth.email.template.*]`) + `supabase/templates/email/*.html` |
| Storage buckets          | `supabase/config.toml`                                               |
| API settings             | `supabase/config.toml`                                               |
| Functions deploy config  | `supabase/config.toml` (`[functions.*]`: `verify_jwt` 等)            |
| Tables                   | `drizzle/schema/`                                                    |
| RLS policies             | `drizzle/schema/`                                                    |
| Realtime publication     | `drizzle/config/post-migration/`                                     |
| Migrations               | `drizzle/migrations/` (drizzle-kit 出力)                             |

> **Config-as-Code**: Supabase のサービス設定は `config.toml` を source of truth として Git 管理する（DB のみ Drizzle 例外）。メールテンプレートは HTML を `supabase/templates/email/` に置き `content_path` で配線（パスは**リポジトリルート基準**）。**リモート環境ぶんの `[remotes.<name>]` は必須**（無いと設定適用が無言でスキップされる）。詳細は `.claude/rules/supabase-config.md`。

> **マイグレーションは Drizzle に集約**: 出力先は `drizzle/migrations/`（v3 フォルダ形式）。`supabase/migrations/` は使用せず、Supabase の GitHub 連携によるマイグレーション自動適用も利用しない（GitHub 連携自体は Edge Functions / config 同期のため維持）。

---

## AI/ML Features

- **Vector Search**: pgvector
- **LLM Orchestration**: LangChain/LangGraph
- **Providers**: OpenAI, Anthropic, Replicate, FAL
- **生成 AI（画像 / 動画 / 音声 / 3D）**: fal.ai。**窓口は `fal` CLI に一元化**（fal-ai MCP は廃止）。
  **画像生成の既定モデルは `openai/gpt-image-2`（編集・インペイントは `openai/gpt-image-2/edit`）**。
  モデル ID とスキーマは推測せず必ずカタログ API / モデルページで確認する → `.claude/skills/fal/`
- **Real-time**: LiveKit
- **Usage Metering**: トークン使用量・コスト集計は**標準で設計に含める** → `.claude/skills/ai-usage-metering/`

→ 詳細は [`backend-py/README.md`](backend-py/README.md)
