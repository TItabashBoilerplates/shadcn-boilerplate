# AGENTS.md

コーディングエージェント（Claude Code / Codex / Cursor 等）向けの共通ガイド。
ここに書くのは**スタック層**（技術規約。プロジェクトを跨いで同じもの）だけ。
**このリポジトリが何のアプリで、何を決めたかは [`PROJECT.md`](PROJECT.md)（プロダクト層）にある。必ず先に読む。**

## 読む順序

1. **`PROJECT.md`**: `mode`（`boilerplate` / `product`）・配布形態・テナント・使うサービス・意図的な逸脱の記録。
   **ここに無い決定は推測せず、ユーザーに確認する**（`.claude/rules/design-research.md` §3）
2. このファイル: スタック・コマンド・ルール索引
3. **`.claude/rules/*.md`**: 常時適用のポリシー（Claude Code は自動ロード。他のエージェントは下の索引から読む）
4. **`.claude/skills/*/SKILL.md`**: 作業種別ごとの手順。該当するものを**作業前に**読む

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend (Web)** | Next.js 16, React 19, TypeScript, Bun |
| **Frontend (Mobile)** | Expo 57, React Native, TypeScript |
| **UI (Web)** | shadcn/ui, Radix UI, TailwindCSS 4 |
| **UI (Mobile)** | gluestack-ui, NativeWind 5, TailwindCSS 4 |
| **State** | TanStack Query (server), Zustand (global) |
| **Architecture** | Feature Sliced Design (FSD) |
| **i18n** | next-intl（ロケールは `PROJECT.md` の `locales`） |
| **Backend** | FastAPI (Python, `backend-py/` uv workspace), Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL, Drizzle ORM, pgvector |
| **Auth** | Supabase Auth |
| **AI/ML** | LangChain/LangGraph, fal（画像生成の既定は `openai/gpt-image-2`）, LiveKit。使用量計測は標準で設計に含める |

| Component | Package Manager |
|-----------|-----------------|
| `frontend/`（web / mobile / packages）, `drizzle/` | **Bun**（`ni` / `nr` / `nlx` で抽象化。`nr dev` = `bun run dev`） |
| `backend-py/` | **uv**（workspace root から `--all-packages`） |
| `supabase/functions/` | **Deno** |

## Commands（MANDATORY: devenv のみ）

**すべて devenv の scripts（PATH 直結）か `devenv tasks run <name>` で実行する。** `bun run biome` /
`uv run ruff` / `npx tsc` / `make` の直叩きは禁止（`.claude/rules/commands.md`）。一覧は `devenv tasks list`。

```bash
# Services（Supabase の Docker は Supabase CLI が所有。devenv が監視するのは backend / storybook だけ）
devenv up                      # 軽量セット: Supabase + backend + storybook（TUI 付き）。終了しても Supabase は止まらない
dev-web / dev-mobile / dev-all # 軽量セット + Next.js / Expo Metro / 全 frontendApps
devenv up backend web          # 任意組み合わせ（frontend/apps/* は opt-in process）
stop                           # devenv プロセス + Supabase をすべて停止（supabase-stop は Supabase のみ）
devenv shell -P android        # Android ネイティブ toolchain（opt-in profile。数 GB）

# Quality（ローカルも CI も同じ）
lint / format / type-check     # 全体（auto-fix）。個別は lint-frontend / format-backend-py / type-check-mobile 等
ci-check                       # = devenv tasks run ci:check（キャッシュ込み）。verify はこれ 1 本。`devenv test` は使わない

# Tests
unit-test                      # frontend(Vitest) + drizzle(bun test) + backend-py(pytest) + functions(Deno)
test-frontend / test-drizzle / test-backend-py / test-functions / test-db(pgTAP)
e2e / e2e-web / e2e-mobile / e2e-ui   # Maestro（--env local|staging|production）
build-storybook && \
  devenv shell -P store-listing -- storybook-smoke   # 全ストーリーが描画されるか（ビルド成功は動作保証にならない）

# Database（ローカルは実行可。本番 / staging はユーザー承認必須。.claude/rules/database.md）
devenv tasks run app:migrate-dev   # 生成 + 適用 + 型生成
devenv tasks run model:build       # 型のみ再生成
# 本番は GitHub Actions（migrate.yml）が正規経路。ローカルから叩くなら ENV= を必ず前置:
ENV=production devenv tasks run -P production db:migrate-deploy   # 緊急時のみ

# Deploy / Release（資格情報はすべて Doppler。vercel / eas を直接叩かない）
vercel-deploy [app]                # → .claude/skills/vercel-deploy/
mobile-release-ios / -android      # 「アップロードまで」。配布・審査提出は store-status / store-testflight /
                                   #   store-submit-ios / store-release-play → .claude/skills/mobile-release/
store-push-* / store-create-*      # 掲載情報・課金商品（必ず先に --dry-run）→ .claude/skills/store-screenshots/

# Desktop（Tauri: frontend/apps/desktop）
dev-desktop                        # Vite だけ（ブラウザで UI を見る。Rust 不要）
desktop-run [--build] [--env ...]  # ネイティブウィンドウ / 配布物（署名なし）
desktop-release                    # 配布リリース（GitHub Actions desktop-release.yml を起動）
desktop-updater-keygen             # 自動更新の署名鍵と endpoint を配線（**初回はこれから**。鍵は永続）
desktop-wire-signing               # Apple 署名/公証 + updater 鍵を Doppler → GitHub secrets へ
                                   # → .claude/skills/desktop-release/ / docs/desktop/release-runbook.md
```

- Profile: `local` が既定。`-P dev|staging|production` で env を上書き。**`devenv tasks run` をリモート profile で叩くときは `ENV=<profile>` を前置**（`-P` だけだと ENV=local のまま）。
- `devenv shell` 進入時に `setup:install-*` が lockfile 変更を検知して `bun install` / `uv sync` を自動同期する。
- 非対話環境のログ: `/tmp/devenv-*/processes/logs/<process>.{stdout,stderr}.log`。対話環境は `devenv up` の TUI が主（`.claude/skills/debugging/`）。

## Rules 索引（`.claude/rules/`）

「常時」はどのファイルを触っていても効く。「paths」は該当ファイルを開いたときに効く（Claude Code の `paths:` frontmatter）。
**どれも交渉の余地なし。** 判断に迷う点・後戻りできない論点は推測せずユーザーに確認する。

| ファイル | 一言 | 適用 |
|---|---|---|
| `skills-first.md` | 作業前に該当 Skill を確認・起動。確認せずに始めた実装はやり直し | 常時 |
| `design-research.md` | 設計前に一次情報（バージョン確定 → 公式 doc → 型定義）と BP を読む。**設計書・指示・既存実装との乖離は「意図的かミスか」を必ず確認** | 常時 |
| `research.md` | 実装前に Context7 / 公式 doc で API・設定形式を確認。推測・記憶での実装禁止 | 常時 |
| `minimal-implementation.md` | 既存資産 → 標準機能 → マネージド → 実績ある OSS → スクラッチ の順。依存追加は選定基準 7 項目。star 数だけで選ばない | 常時 |
| `clean-code.md` | 後方互換・重複・未使用コードを残さない。Tailwind クラス文字列も重複コード | 常時 |
| `tdd.md` | テスト先行（Red → Green）。UI は Storybook。終了時 All Green | 常時 |
| `ui-testing.md` | UI は単体テストではなく Storybook。「ビルドが通った」で終わらせず描画を確認 | 常時 |
| `error-handling.md` | 握りつぶし禁止。catch はログ + リスロー or Result 型。supabase-js の `{ error }` は必ず見る | 常時 |
| `supabase-first.md` | supabase-js → Edge Functions → backend-py（LLM / エージェント / 長時間 / 複雑のみ）。Storage は private 既定 | 常時 |
| `commands.md` | devenv コマンド必須。`devenv test` を verify に使わない。`scripts/` はルートの biome 設定 | 常時 |
| `auto-generated.md` | `packages/types/schema.ts` 等の生成物は編集しない。正は `drizzle/schema/` | 常時 |
| `mcp-supabase.md` | Supabase インフラの調査・操作は `supabase` / `supabase-prod`(read-only) MCP。psql / curl / CLI 直叩き禁止 | 常時 |
| `mcp-doppler.md` | Doppler は `doppler` MCP のみ。フェーズは `PROJECT.md` の `doppler_phase`。値をチャット / ログに出さない | 常時 |
| `env-naming.md` | キー名は読むツールの名前に揃える。sync 付き config で `GITHUB_` 禁止。Supabase の env は Doppler に置かない | 常時 |
| `auth.md` | モバイルがあるならメール + パスワード必須（OTP のみ禁止）。メール再設定 / パスワード忘れ / 変更 / 削除の導線は指示を待たず実装 | 常時 |
| `list-pagination.md` | 増えうる一覧は最初からページング。全件取得禁止。UI パターンは自分で選ぶ（迷ったら「もっと見る」） | 常時 |
| `render-optimization.md` | FSD スライス単位でステート局所化。Zustand はセレクター。invalidation はピンポイント | paths |
| `page-navigation.md` | `loading.tsx` + Suspense でストリーミング。遷移はリンク | paths |
| `frontend.md` | FSD レイヤー・公開 API・import 規約 | paths |
| `form-controls.md` | フォーム要素はモバイル幅で 16px 以上（iOS ズーム防止）。共有コンポーネント 1 か所 | paths |
| `mobile-uiux.md` | キーボードが画面半分を覆う前提。RN 標準 `KeyboardAvoidingView` 禁止（`react-native-keyboard-controller`）。タップ標的 44px | paths |
| `i18n.md` | ユーザー向け文言はすべて next-intl。全ロケール揃える | paths |
| `storage-images.md` | Storage の画像は必ず transform 経由（`SupabaseImage`）。`loaderFile` 禁止 | paths |
| `video-thumbnails.md` | 動画を扱うならサムネイル必須。生成は backend-py（Vercel コンテナ + ffmpeg）。Edge Functions では不可 | paths |
| `datetime.md` | DB / API は UTC（`timestamptz`）。TZ 変換はフロントの `useEffect` 内 | paths |
| `database.md` | マイグレーションは Drizzle。本番適用はユーザー承認 | paths |
| `backend-py.md` | Python 規約。外部 SDK を丸ごと Mock しない | paths |
| `python-monorepo.md` | uv workspace（apps/ + packages/、src-layout、単一 uv.lock） | paths |
| `edge-functions.md` | Edge Functions 規約 | paths |
| `supabase-config.md` | サービス設定は `config.toml` に集約（`mode: product` から）。`[remotes.*]` 必須。DB だけ Drizzle | paths |
| `store-review.md` | 第三者 AI 同意 / privacy manifest / target API 36 / 掲載情報と実装の一致 | paths |

## Skills（`.claude/skills/`）

- 公式提供の Skill は **`skills-lock.json` 管理**。実体は `.agents/skills/`、`.claude/skills/` からは symlink。
  **追加・更新は必ずリポジトリルートで `npx skills add <owner>/<repo> -s <skill>`**（`.claude/skills/` 内で実行すると
  入れ子の `.agents/` ができる）。**ディレクトリを手でコピーしない**（上流の改名で旧名と新名が二重に残る）。
  復元は `npx skills experimental_install`、更新は `npx skills update`。
- 選定理由と見送ったもの: `docs/_research/2026-08-06-service-clis.md` / `docs/_research/2026-08-16-ui-ux-skills.md`。
- **本リポジトリ固有の自作 Skill**（lock 管理外。`.claude/skills/<name>/SKILL.md` 直置き）:

| Skill | 用途 |
|---|---|
| `ai-usage-metering` | LLM / 生成 AI を呼ぶコードは使用量イベントの記録とセット。集計軸・単価表・円換算は後から変えられない |
| `mobile-uiux` | キーボード回避・セーフエリア・入力属性・タップ標的の正本 |
| `app-update` | 推奨 / 強制アップデート。**誤発動すると全ユーザーが起動不能になり復旧手段が無い**。フェイルオープンが不変条件 |
| `mobile-release` / `store-screenshots` | EAS リリース（アップロード後の配布・審査提出・ロールアウトまで）/ ストア掲載画像 |
| `vercel-deploy` | Vercel 連携とデプロイ。Docker コンテナが「READY なのに 500」になる 2 大原因 |
| `tauri` | デスクトップ（`apps/desktop`）の実装（IPC / capabilities / CSP / Linux 依存） |
| `desktop-release` | デスクトップの Web 配布と自動更新。**署名鍵と endpoint は永続**（間違えると配布済みが更新不能） |
| `edge-functions-mcp` | Edge Functions 上の MCP サーバ |
| `onesignal` / `livekit` / `fal` | 公式 Skill が無い外部サービス |
| `fsd` / `monorepo` / `python-monorepo` / `gluestack` / `shadcn-ui` / `drizzle` / `rls` / `supabase-config` | 本リポジトリの配置・規約 |
| `debugging` / `dev-check` / `devenv-cicd` / `datetime` / `i18n` / `logger` / `seed` / `hey-api` / `storybook` / `pgtap` / `python-testing` / `maestro` / `langchain` / `fastapi` / `tanstack-query` / `nextjs` / `detailed-design` | 手順・規約 |

## Domain Documentation

| ドメイン | ドキュメント |
|---|---|
| Frontend (Web) | [`frontend/README.md`](frontend/README.md) |
| Frontend (Mobile) | [`frontend/apps/mobile/README.md`](frontend/apps/mobile/README.md) |
| Database Schema | [`drizzle/README.md`](drizzle/README.md) |
| Backend Python | [`backend-py/README.md`](backend-py/README.md) |
| Edge Functions | [`supabase/functions/README.md`](supabase/functions/README.md) |
| Store release | [`docs/store/release-runbook.md`](docs/store/release-runbook.md) / [`docs/store/submission-checklist.md`](docs/store/submission-checklist.md) |
| Mobile app update | [`docs/mobile/app-update-runbook.md`](docs/mobile/app-update-runbook.md) |
| Desktop release | [`docs/desktop/release-runbook.md`](docs/desktop/release-runbook.md) |
| Research / Design | `docs/_research/YYYY-MM-DD-<topic>.md` / `docs/designs/` |

## Where things live

| 対象 | 場所 |
|---|---|
| Supabase サービス設定（Auth / Storage / API / Functions の `verify_jwt` / メールテンプレート配線） | `supabase/config.toml`（`mode: product` から。`[remotes.*]` 必須） |
| メールテンプレート本体 | `supabase/templates/email/*.html` |
| Tables / RLS / Realtime publication / Migrations | `drizzle/schema/` / `drizzle/config/post-migration/` / `drizzle/migrations/` |
| 非機密のローカル config | `env/<service>/.env.local`（`env/README.md`） |
| シークレット・リモート値 | Doppler 一本（`doppler-set <KEY>`。`GITHUB_` / `SUPABASE_` / `VERCEL_` prefix 禁止） |
| MCP 定義 | `.mcp.json` が正本。`.codex/config.toml` / `.cursor/mcp.json` は `mcp-sync` で生成 |
| ストア掲載情報 / 課金商品 | `frontend/apps/mobile/{store,play,iap}.config.js` |
| モバイルの推奨 / 強制アップデート方針（下限バージョン・ストア URL） | `app_release_policies`（`drizzle/schema/app-release-policies.ts`）。運用は `docs/mobile/app-update-runbook.md` |
| デスクトップ配布物のパス規約 | `scripts/desktop/release-paths.mjs`（Web の `/download` と CI が共有。テストが一致を固定） |
| デスクトップの版 / 配布 endpoint / 更新の公開鍵 | `frontend/apps/desktop/src-tauri/tauri.conf.json`（版は `package.json` / `Cargo.toml` とも一致） |
