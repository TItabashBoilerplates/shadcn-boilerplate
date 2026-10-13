# 依存・ランタイムの一括最新化（2026-10-13）

- 対象: frontend（Bun workspace）/ drizzle / backend-py（uv）/ Edge Functions（Deno）/ devenv・nixpkgs / Terraform / GitHub Actions / Tauri（Cargo）
- 方針: **stable の最新**に上げる。上げられないものは「何が止めているか」を下に残す（次回の調査をやり直さないため）

## 1. 上げたもの（メジャー / 挙動が変わるもの）

| 対象 | 旧 | 新 | 対応したこと |
|---|---|---|---|
| devenv（CLI / modules） | 2.3.1 | **2.4.0** | `devenv.yaml` の input / `require_version` / `install-devenv` を揃えた。2.4.0 で shell 進入時に `devenv:enterTest` が走らなくなった（#3184 の修正） |
| nixpkgs（unstable） | 2026-04 | 2026-10 | Bun 1.4.2 / Deno 2.9.7 / uv 0.12.22 |
| Node.js（devenv） | 22 | **24**（Active LTS） | `engines.node` は実依存の下限（`@hey-api/openapi-ts` が `>=22.18`）に合わせた |
| Python | 3.13 | **3.14** | devenv / `.python-version` / Dockerfile / ruff・mypy・pyright の target / `requires-python` |
| Terraform | 1.15.8 | 1.16.5 | provider: supabase 1.11 / vercel 5.21 / doppler 1.22 / github 6.13 |
| Vite / `@vitejs/plugin-react` | 7 / 5 | **8 / 6** | Storybook 10.6 が vite 8 を peer に含む |
| Vitest / jsdom | 4 / 27 | **5 / 30** | 変更不要 |
| Biome | 2.4.11 | **2.5.15** | `biome migrate`（`recommended` → `preset`）。2.5 は `.svg` も lint するため `public/**/*.svg` だけ `noSvgWithoutTitle` を off（`<img>` / `next/image` の `alt` で代替している） |
| eslint-plugin-boundaries | 5 | **7** | `element-types` → `dependencies`、`no-unknown` → `no-unknown-dependencies`、`${}` → `{{ }}`、オブジェクト形式セレクタ、`mode` → `partialMatch`。v6 から `export *` 等の全依存種別を検査する（違反検出を実測で確認） |
| `@hey-api/openapi-ts` | 0.89 | **0.99** | `runtimeConfigPath` が**設定ファイル基準**になった。`output.format` は deprecated かつ出力先が biome の ignore 対象で元から no-op だったので削除。`@hey-api/client-fetch`（deprecated・未使用）を依存から削除 |
| motion / pino | 13 / 9 | 14 / 10 | 変更不要 |
| NativeWind / react-native-css | 5.0.0-preview.4 / 3.0.7 | **5.0.0-rc.0 / 3.1.0-rc.0** | rc.0 は react-native-css を完全一致で要求。`expo export --platform ios` の JS にスタイル表が出力されることを確認。`lightningcss` の 1.30.1 固定は維持（gluestack skill） |
| FastAPI | 0.136 | **0.143** | `include_router` が private な `_IncludedRouter` 1 個にまとまり `app.routes` に endpoint が出なくなった → vercel ルーティングのテストを OpenAPI の `paths` 基準に変更 |
| SQLAlchemy | 2.0 | **2.1** | 素の `postgresql://` の既定ドライバが **psycopg 3** に変わった。psycopg 3 は server-side prepare を使い、Supavisor の transaction mode（6543）と相性が悪いので `db_client` で psycopg2 を明示 |
| mcp（Python SDK） | 1.x | **2.x** | `FastMCP` → `MCPServer`（`mcp.server.mcpserver`）。apps/mcp は雛形なので README / docstring のみ |
| ruff | 0.15 | 0.17 | `CPY001` が stable 化（`select = ["ALL"]` で有効化）→ ignore。`LOG004` に合わせて exception handler の `logger.exception` → `logger.error(exc_info=exc)` |
| turbo | 2.10 | 2.11 | AI エージェント検知時に `AGENTS.md` へ管理ブロックを書き込むようになった → `turbo.json` の `"agentGuidance": false` で無効化（エージェント向け文書はリポジトリ側で管理しているため） |
| GitHub Actions | checkout v4/v5 ほか | checkout v7 / cache v6 / upload-artifact v7 / download-artifact v8 / cachix v17 / claude-code-action v1 | いずれも Node 24 化・ESM 化が主。使っている入力に破壊的変更なし |
| Tauri（Rust） | tauri 2.11 | 2.12（`cargo update`） | JS 側 `@tauri-apps/*` と minor を揃えた |

## 2. 上げなかったもの（と、止めている理由）

| 対象 | 現在 | 最新 | 理由 |
|---|---|---|---|
| Expo SDK | 57 | 58（`next` タグ = pre-release） | stable の最新は 57。SDK 内は `expo install --fix` 相当の版に揃えた |
| `react` / `react-dom` | 19.2.3 | 19.3.0 | **Expo SDK 57 の bundledNativeModules が 19.2.3 を指定**。RN のレンダラは react と版が一致している必要があり、web だけ上げるとモノレポ内で二重化する |
| `react-native` と RN ライブラリ（reanimated / gesture-handler 3 / screens / async-storage 3 など） | SDK 57 指定 | 各最新 | 同上（Expo SDK の上限） |
| `@types/react` / `@types/react-dom` | ~19.2 | 19.3 | 実行時が 19.2 なので型も 19.2 系の最新に留める |
| `@types/node` | 24.x | 26.x | 実行時（devenv）が Node 24 |
| ESLint | 9.39 | 10.x | `eslint-config-next` / `eslint-config-expo` が依存する **eslint-plugin-react 7.37.5 が ESLint 10 に未対応**（`context.getFilename is not a function` で全滅） |
| `typescript`（ESLint 用） | 6.0.3 | 7.0.2 | `typescript-eslint` は `typescript <6.1`。型チェックは `@typescript/native`（= TS 7.0.2）で実施済み（`2026-08-17-typescript-7-upgrade.md`） |
| drizzle-orm / drizzle-kit | 0.45 / 0.31 | 1.0.0-rc | v1 は rc。stable の最新に留める |
| Python 3.15 | — | 3.15.0（2026-10-09） | リリース 4 日目。主要依存の cp315 wheel は揃っているが、ツール群と Vercel のベースイメージの追従を待つ |

## 3. 検証

- `ci-check`（lint / format / type-check 全プロジェクト + terraform validate）・`unit-test`（Vitest 513 / pytest 58 / Deno / bun test）すべて通過
- `build-storybook` + `storybook-smoke`: 171 ストーリーすべて描画
  - smoke の固定 `waitForTimeout(150)` は**旧ビルドでも 150ms を超えるストーリーがある**（実測 max 322ms）ためフレーキーだった。「root に子が付くまで最大 5 秒待つ」に変更
- `expo export --platform ios`（Hermes / `--no-bytecode` の両方）成功、NativeWind のスタイル表が JS に出力されていることを確認
- `bunx expo-doctor`: 21 中 20 通過。残る 1 件（`android.edgeToEdgeEnabled` がスキーマに無い）は SDK 57 共通の既存指摘で今回の変更とは無関係

## 4. 注意（次回の更新で踏むもの）

- **`bun.lock` を消して作り直すと `configVersion: 1`（isolated linker）になる。** 本リポジトリは hoisted 前提（Metro / Expo の解決）なので、作り直したら `configVersion` を `0` に戻すこと
- Expo 管理下の版は npm の `latest` ではなく、その SDK の `bundledNativeModules.json` が正
