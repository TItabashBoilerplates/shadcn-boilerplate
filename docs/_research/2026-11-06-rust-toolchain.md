# Rust 製開発ツールへの移行調査

調査日: 2026-11-06。対象はこの checkout の開発ツール。初回調査後に移行を実装し、[性能比較](2026-11-06-toolchain-performance.md)と[lint 移行結果](2026-11-06-lint-migration.md)を追記した。
設計: [Rust 製ツール移行方針](../designs/rust-toolchain-migration.md)。

## 調査方法と確度

- ローカルの package.json / lockfile、devenv.nix、Turbo、ESLint、Biome、Vitest、VS Code、CI 設定を確認した。
- Context7 は今回の利用可能なツール一覧になく、公式ドキュメント・公式リポジトリを直接確認した。
- `devenv-cicd`・`turborepo` スキルを適用した。アプリ機能向けの detailed-design は明示呼出専用であり、本件では使用していない。
- 以下の最新版は調査時の公式 release ページの表示。実装開始時に registry、対応 OS、ライセンス、既知の脆弱性も再確認して完全固定する。すでに導入済みという意味ではない。
- 現行の有効 lint ルールを機械的に展開した一覧はまだ取得していない。互換ルールの全件照合は実装の最初の成果物とする。

## 現行設定から確認した事実

| 項目 | 設定・固定された版 | 根拠 |
|---|---|---|
| JS/TS lint・format | Biome 2.5.15 + ESLint 9 系 | frontend/package.json、frontend/apps/*/package.json、drizzle/package.json |
| FSD lint | eslint-plugin-boundaries 7.2.0 系、Next/Expo preset も有効 | frontend/tooling/eslint/fsd.js、apps/*/eslint.config.mjs |
| TS 型チェック | TS7 7.0.2 の alias を優先、API 利用者用に TS6 6.0.3 を側置き | frontend/bun.lock、frontend/tooling/tsc/resolve.mjs |
| Python 型チェック | mypy 2.4.0、strict、ignore_missing_imports=true | backend-py/uv.lock、pyproject.toml |
| Python lint・format | Ruff 0.17.0 | backend-py/uv.lock |
| Frontend テスト | Vitest 5.0.4、jsdom 既定、共通 DOM matcher setup | frontend/bun.lock、vitest.config.ts、vitest.setup.ts |
| Python テスト | pytest 9.1.1、xdist 未導入 | backend-py/uv.lock、pyproject.toml |
| バンドル | Next 16.4.1 系、Vite 8.3.4、plugin-react 6.1.2 系 | frontend と apps の package.json |
| 開発監視 | uvicorn --reload、watchfiles 1.3.0 が依存に存在 | devenv.nix、backend-py/uv.lock |
| 品質ゲート | devenv の execIfModified、CI は ci-check | devenv.nix、.github/workflows/ci.yml |
| テスト統括 | unit-test は各ランナーを直列呼出 | devenv.nix |
| hook | prek、Biome check、mypy など | devenv.nix |

設定上の注意:

- `lint:fsd` の `--rule` は他ルールを無効にしない。Web/Expo の通常 lint も走る。
- Biome は推奨 lint に加え、型 import、barrel import 制限、img、Hooks 依存配列、例外指定、import 整理を持つ。formatter だけに変更する際は移行漏れを検査する。
- frontend 全体の Turbo 型チェックと、独立した Mobile 型チェックが ci:check に含まれる。統合前に実行対象を確認する。
- Python の lint/format の execIfModified は src を列挙している一方、コマンドは apps/packages を検査する。テストだけの変更でも再検査されるよう入力範囲の一致を検証する。
- root の scripts は hook の Biome 対象になり得るが、現在の frontend/drizzle の CI lint とは対象が一致しない。
- Desktop の minify は Vite 8 でも esbuild 指定。意図は未確認なので本移行とは別の小変更として扱う。
- 実在する DOM テスト（packages/ui/src/components/__tests__/button.test.tsx）がある。node 化を理由に削除しない。

## 新規採用対象の一次情報

### Oxlint

調査時の release: **1.91.0**。JS/TS lint 統一の採用対象。JS plugin の互換性はプラグイン別に検証が必要。

- [公式 release](https://github.com/oxc-project/oxc/releases/tag/oxlint_v1.91.0)
- [ESLint 移行](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint): 移行ツールの出力を起点にできる。自動変換結果を完全な同等性の証明とは扱わない。
- [設定](https://oxc.rs/docs/guide/usage/linter/config): JSON / TS 設定、overrides、plugins を提供。
- [JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html): ESLint v9 互換を目指す API。alpha であり、任意の plugin が動くという保証ではない。
- [組み込み plugins](https://oxc.rs/docs/guide/usage/linter/plugins): React、Next、import、a11y 等を提供。preset 全体の互換性は別問題。
- [型 import](https://oxc.rs/docs/guide/usage/linter/rules/typescript/consistent-type-imports.html): 型 import の統一に使えるが、既存指定と修正形式を照合する。
- [型付き lint](https://oxc.rs/docs/guide/usage/linter/type-aware): 標準構成は Go 製 tsgolint を併用する。Oxlint を入れれば全経路が Rust になるわけではない。

### tsrs

調査時の release: **0.22.0**、npm 表記 **0.22.0-ts7.1.0-beta**。TS7.1 beta の特定 commit を参照する Rust 移植。型チェック移行候補として優先検証する。

- [公式概要](https://oxc.rs/docs/guide/usage/typechecker.html): experimental。
- [release](https://github.com/oxc-project/tsrs/releases/tag/v0.22.0): fast preset で Oxlint の型付き lint と全体型チェックを統合する経路を記載。重複 tsconfig のある構成では遅くなる例もあり、必ず分離実行と比較する。
- [互換性](https://github.com/oxc-project/tsrs/blob/main/docs/COMPATIBILITY.md): 参照 compiler との検証範囲を公開。fast preset はすべてのプログラムの完全な診断一致を約束しない。
- [既定値と差分](https://github.com/oxc-project/tsrs/blob/main/docs/DEFAULTS.md): 通常モードと fast の checker 配分・履歴・キャッシュが異なる。
- [測定](https://github.com/oxc-project/tsrs/blob/main/bench/RESULTS.md): 2026-10-28、M3 Max、TS7.1 beta 対 tsrs 0.20.1 の公表値。本リポジトリや最新版の測定値とは区別する。
- [LSP](https://github.com/oxc-project/tsrs/blob/main/docs/LSP.md): CLI と editor は別の導入経路。Next の言語サービス plugin 対応を含めて評価する。

### ty

調査時の release: **0.0.98**。ユーザー指示により Python 型チェックの移行先として採用する。

- [公式 release](https://github.com/astral-sh/ty/releases/tag/0.0.98)
- [型チェック](https://docs.astral.sh/ty/type-checking/): `ty check`。依存を見つけるには適切な Python 環境が必要。
- [設定](https://docs.astral.sh/ty/reference/configuration/): rules、environment、src/overrides 等で対象・診断を指定する。
- [mypy / Pyright からの移行](https://docs.astral.sh/ty/coming-from-mypy-or-pyright/): mypy strict と一対一対応しない。ty と Ruff を組み合わせた対応表がある。未実装の検査もあるため、ALL を error にするだけで代替しない。
- [Pydantic](https://docs.astral.sh/ty/features/third-party/pydantic/): v2 に組み込み対応。モデル構築・alias・default・generic・設定値と実行時 validation の違いを確認する。

## 継続するツールの根拠

- [Vite 8](https://vite.dev/blog/announcing-vite8): Rolldown/Oxc を採用。別途 rolldown-vite を追加する必要はない。
- [Vite 移行](https://vite.dev/guide/migration.html): esbuild minifier の明示選択は非推奨。
- [Next 16](https://nextjs.org/docs/app/guides/upgrading/version-16): Turbopack が既定。Next 内部の型チェックを tsrs CLI の差し替えと同一視しない。
- [Vitest 性能](https://main.vitest.dev/guide/improving-performance): environment/import/transform 等を分けて測定。DOM 不要のテストに jsdom を使うコストを減らす。
- [watchfiles](https://watchfiles.helpmanual.io/): 通知・debounce は Rust を利用。新しい監視ツールの追加より監視範囲を確認する。
- [Turbo cache](https://turborepo.com/docs/crafting-your-repository/caching): 入力・依存・環境・出力を正しく宣言し、キャッシュ誤ヒットを避ける。

## 初回調査時の未検証事項（実装結果は上記リンクを参照）

Oxlint 上の boundaries v7 と resolver の動作、全ルール移行表、ty の本コード診断、tsrs の本コード診断、各環境での性能、Next LSP plugin の互換性は未検証。設計の採用方針と、実装後の検証完了を区別する。
