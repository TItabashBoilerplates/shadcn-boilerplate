# Development Command Policy

**CRITICAL / NON-NEGOTIABLE**: Always use **devenv** commands (scripts on PATH or `devenv tasks run <name>`) for development. Direct execution of underlying tools (bun/uv/biome/ruff/tsc/deno/supabase) is **strictly prohibited**.

**Makefile は deprecated**。`make X` は使わない。誤って叩いた場合は案内メッセージのみが出る。

**特に品質チェック（lint, format, type-check, test, build, ci-check）は例外なく devenv のコマンドを使うこと。**

## devenv コマンドの種類

| 種類 | 使い方 | 例 |
|---|---|---|
| **Scripts** (PATH 直結) | コマンド名を直接打つ | `lint`, `format`, `type-check`, `ci-check`, `dev-web`, `dev-mobile`, `dev-all`, `frontend`, `mobile-ios`, `lint-frontend`, `format-backend-py`, `supabase-start`, `stop`, `drizzle-studio` |
| **Tasks** (依存グラフ・pipeline) | `devenv tasks run <namespace:name>` | `devenv tasks run db:migrate-dev`, `devenv tasks run model:build`, `devenv tasks run deploy:functions` |
| **Processes** (常駐サービス) | `devenv up [PROCESSES...]` | `devenv up` (軽量セット), `devenv up web`, `devenv up backend web` |

scripts は devenv shell（direnv 自動アクティベート含む）下で PATH 上に存在する。direnv 未活性のセッションでは `devenv shell -- <command>` 経由で呼び出す。

## Required Commands（品質チェック）

**ALWAYS use** these scripts for the following operations:

| Operation | Command |
|-----------|---------|
| **Linting (all)** | `lint` |
| **Linting (per project)** | `lint-frontend`, `lint-drizzle`, `lint-backend-py`, `lint-functions`, `lint-fsd` |
| **Linting (CI mode)** | `lint-frontend-ci`, `lint-drizzle-ci`, `lint-backend-py-ci`（通常は `ci-check` から呼ばれる） |
| **Formatting (all)** | `format` |
| **Formatting (per project)** | `format-frontend`, `format-drizzle`, `format-backend-py`, `format-functions` |
| **Format check (CI)** | `format-check`（個別: `format-frontend-check`, `format-drizzle-check`, `format-backend-py-check`, `format-functions-check`） |
| **Type check (all)** | `type-check` |
| **Type check (per project)** | `type-check-frontend`, `type-check-mobile`, `type-check-backend-py`, `check-functions` |
| **Build** | `build-frontend`, `build-storybook`, `build-mobile-ios`, `build-mobile-android` |
| **Tests (unit)** | `unit-test` (all), `test-frontend` (Vitest), `test-drizzle` (bun test), `test-backend-py` (pytest) ※ `test` は bash 組み込みと衝突するため `unit-test` |
| **Tests (DB / E2E)** | `test-db` (pgTAP), `e2e`, `e2e-web`, `e2e-mobile`, `e2e-ui`, `e2e-storyboard` |
| **CI Check (full gate)** | `ci-check` (= `devenv tasks run ci:check`、execIfModified キャッシュで incremental)。ローカルも CI もこれ |
| **git-hooks を全ファイルに実行** | `devenv test` ※ **verify 用途では使わない**（下記「⚠️ `devenv test` を verify に使ってはならない」参照） |
| **Services (軽量)** | `devenv up` (= Supabase + backend + storybook), `stop` (停止), `supabase-start` / `supabase-stop` |
| **Services (frontend apps)** | `dev-web`, `dev-mobile`, `dev-all`, または `devenv up <names...>` |
| **Services (devenv 外)** | `frontend` (turbo dev), `mobile-ios`, `mobile-android`, `mobile-web` (Expo TUI) |

## Required Tasks（pipeline / 依存付き）

| Operation | Command |
|---|---|
| **DB migration (full pipeline)** | `devenv tasks run app:migrate-dev` |
| **DB migration (生成 + 適用のみ)** | `devenv tasks run db:migrate-dev` |
| **DB migration (deploy)** | `devenv tasks run db:migrate-deploy` |
| **Type/Model 生成** | `devenv tasks run model:build` (= model:frontend + model:functions) |
| **Seed (DB + Storage)** | `devenv tasks run seed:all` |
| **Deploy Edge Functions** | `devenv tasks run deploy:functions` |
| **Deploy Supabase 全体** | `devenv tasks run deploy:supabase` |
| **初回ブートストラップ** | 不要（`devenv shell` / `direnv reload` で `setup:*` が自動セットアップ） |

## Prohibited Direct Commands（品質チェック）

以下のような直接実行は**絶対に禁止**。必ず devenv の scripts / tasks を使うこと：

```bash
# ❌ 絶対に直接実行しない
cd frontend && bun run biome check --write
cd frontend && bun run biome format --write
cd frontend && bun run tsc --noEmit
cd frontend && bun run vitest
cd backend-py && uv run ruff check
cd backend-py && uv run ruff format
cd backend-py && uv run mypy
cd backend-py && uv run pytest
cd drizzle && bun run biome check
npx tsc --noEmit

# ❌ Makefile は削除済み — `make X` は `make: *** No targets. Stop.` でエラー終了する
make lint
make ci-check
make migrate-dev

# ✅ 必ず devenv scripts または tasks を使用
lint                              # 全体 lint
lint-frontend                     # Frontend lint
lint-backend-py                   # Backend lint
format                            # 全体 format
format-frontend                   # Frontend format
format-backend-py                 # Backend format
type-check                        # 全体型チェック
type-check-frontend               # Frontend 型チェック
type-check-backend-py             # Backend 型チェック
ci-check                          # CI チェック (lint + format + type)
devenv tasks run app:migrate-dev  # マイグレーション (フルフロー)
devenv tasks run model:build      # モデル/型再生成
```

## Exceptions

Direct command execution is allowed ONLY for:
- **Reading files**: `cat`, `less`, `head`, `tail` (prefer Read tool)
- **Listing files**: `ls`, `find`, `tree` (prefer Glob tool)
- **Git operations**: `git status`, `git diff`, `git log` (read-only)
- **Package info**: `bun list`, `npm list`, `uv pip list` (read-only)

## 品質チェック設計（2 段階構成）

公式 devenv の推奨パターンに従い、品質チェックは **役割を分けた 2 段階構成**:

### 段階 1: コミット時の差分チェック (git-hooks)

`.pre-commit-config.yaml` は `git-hooks.nix` ビルトインを使う:

| Hook | 対象 |
|---|---|
| `biome` | JS/TS/JSON (lint + format、auto-fix、`pass_filenames=true` で変更ファイルのみ) |
| `ruff` | Python lint (`pass_filenames=true`) |
| `ruff-format` | Python format |
| `mypy` | Python type check |
| `denofmt` | Edge Functions format (supabase/functions/ 配下) |
| `denolint` | Edge Functions lint |

`prek` (Rust 実装) が pre-commit を駆動。**コミット 1 回 < 200ms** が普通。

### 段階 2: CI / 手動 verify (ci-check)

`ci-check` script = `devenv tasks run ci:check`。aggregator が配下の verify task を並列・キャッシュ実行する:

```
ci-check  (= devenv tasks run ci:check)
└── ci:check
    ├── lint-ci:frontend / drizzle / backend-py / functions / fsd  (execIfModified)
    ├── format-check:frontend / drizzle / backend-py / functions    (execIfModified)
    └── type-check:frontend / mobile / backend-py / functions       (execIfModified)
```

- `execIfModified` で **mtime + content hash** チェック → 変更なしならスキップ
- キャッシュ: `.devenv/` 配下、`devenv-tasks` Rust binary が管理
- 何も変更してなければ全 task キャッシュヒット → 数秒で完了
- **ローカルも CI も同じ `ci-check`**（`.github/workflows/ci.yml` の verify step は `run: ci-check`）。
  verify task の一覧は `devenv.nix` の `ci:check` に一本化されているので、CI 側で列挙し直さない（drift 防止）

#### ⚠️ `devenv test` を verify に使ってはならない

`ci:check` に `before = [ "devenv:enterTest" ]` を付けて `devenv test` に紐付ける構成は**禁止**。
過去にこれで `ci-check` がローカルで恒常的に落ちていた。enterTest 経由で以下が道連れになる:

| 巻き込まれるもの | 起きること |
|---|---|
| **process phase** (`supabase:start`) | `after` の `model:frontend` が走り、`supabase gen types typescript --local` が **auto-generated な `frontend/packages/types/schema.ts` を上書き**する。ローカル DB が未マイグレーションだと `public.Tables` が空になり `Tables<'users'>` 等が型エラー化（生成物が壊れる破壊的副作用） |
| **`devenv:git-hooks:run`** (prek) | verify task と**並行実行**され、prek が「hook 実行中に worktree の mtime が変わった」を検知して `files were modified by this hook` の **false failure** を出す。`show_output = false` なので原因が見えない |

そもそも hook (biome/ruff/ruff-format/mypy/denofmt/denolint) の検査内容は verify task と**完全に重複**しており、二重に回す意味がない。`devenv test` は **git-hooks を全ファイルに掛けるだけの用途**に留める。

> **使い分け**: 日常の auto-fix は `lint` / `format` script (シンプル sequential、execIfModified なし → 副作用ループ回避)。CI 相当の verify は**ローカル・CI とも `ci-check`**。

#### ⚠️ Biome の設定は 2 つあり、`ci-check` は `scripts/` を見ない

**`ci-check` が通っても `git commit` が biome で落ちることがある。** 設定ファイルが分かれているため。

| 対象ディレクトリ | 適用される設定 | スタイル | `ci-check` の守備範囲 |
|---|---|---|---|
| `frontend/**` | `frontend/biome.json` | **スペース 2 / シングルクォート / セミコロン無し** | ✅ `lint-frontend` が見る |
| `drizzle/**` | `drizzle/biome.json` | 同上系 | ✅ `lint-drizzle` が見る |
| **`scripts/**` などリポジトリ直下** | **ルートの `biome.json`**（`extends: "//"` の親） | **タブ / ダブルクォート / セミコロン有り** | ❌ **見ていない** |

つまり `scripts/*.mjs` `scripts/*.ts` を追加・変更すると、**`ci-check` は素通りするのに
pre-commit hook（prek の biome）で初めて落ちる**。実際にこれで 2 回コミットに失敗している。

**対処**: リポジトリ直下のスクリプトを書いたら、コミット前にルート設定で整形しておく。

```bash
# devenv shell 内。cd はリポジトリルートへ（ルートの biome.json を拾わせる）
biome check --write scripts/mobile/foo.mjs
```

**注意点**:
- ルート設定は **import が ASCII 順に整列していること**まで要求する。
  ファイル先頭の docblock は「最初の import」に紐づくので、**並べ替えが起きると
  docblock ごと移動させられる**。最初から `node:fs → node:http → node:module → node:path → node:url`
  の順で書いておくと事故らない。
- ビルド生成物は biome の対象から外す（`frontend/biome.json` の `!!**/storybook-static` など）。
  外し忘れると数千件のエラーで本物の指摘が埋もれる。

#### ⚠️ `devenv.nix` を編集するときの Nix 文字列エスケープ

`scripts.<name>.exec` は Nix の**インデント文字列** `''...''` で書く。
sed / python などで機械的に生成すると `'''...'''` のような壊れた形になりやすく、
**評価エラーで devenv shell 自体に入れなくなる**（＝そこから先の全コマンドが死ぬ）。

```nix
# ✅ 正
exec = ''exec node "$DEVENV_ROOT/scripts/mobile/foo.mjs" "$@"'';

# ❌ 誤（''\' を使おうとして壊れた形）
exec = '''exec node "..." "$@"''';
```

編集後は必ず評価を確認してから次へ進むこと:

```bash
devenv shell -- bash -c 'type <新しい script 名> >/dev/null && echo OK'
```

#### backend-py の `uv run` は `--all-packages` 必須（import 解決が要るツール）

`backend-py` は uv の **virtual workspace**（root が `package = false`）。素の `uv run` は root の
dependency-groups（mypy/ruff/pytest）しか同期せず、member (`apps/api`, `packages/core`) の依存
= fastapi / pydantic / starlette / structlog を入れない。すると **mypy から third-party が全部 `Any` に見え**、
strict の `disallow_subclassing_any` / `disallow_untyped_decorators` が誤爆する
（`Class cannot subclass "BaseModel" (has type "Any")` 等）。

```bash
# ✅ import 解決が要るツールは --all-packages
uv run --all-packages mypy apps packages
uv run --all-packages pytest

# ✅ ruff は import 解決不要なので素の uv run でよい
uv run ruff check apps packages
```

「`devenv shell` 進入時に `setup:install-backend` が同期済みだから素の `uv run` でよい」は**成立しない**。
`UV_PROJECT_ENVIRONMENT` は文脈で切り替わるため（`devenv test` は `.devenv/test-state/venv` を使う）、
同期済みの venv が使われるとは限らない。

## devenv script 命名規則（MANDATORY）

devenv の `scripts.<name>` で新規 script を定義する際は、**bash 組み込みコマンドと衝突する名前を使用してはならない**。

| 禁止例（bash builtin 衝突） | 安全な代替 |
|---|---|
| `test` | `unit-test`, `test-frontend` |
| `time` | `bench`, `time-it` |
| `kill`, `printf`, `read`, `true`, `false`, `let`, `local`, `set`, `trap`, `wait`, `exec`, `eval`, `command`, `type`, `hash`, `exit`, `echo` 等 | ハイフン付きの具体的な名前 |

**理由**: bash は **builtin を PATH より優先**するため、衝突する名前で script を定義しても CI の `run: <script>` で**builtin が呼ばれて意図と違う挙動になる**。`test` の場合は引数なしで exit 1 が返って `-e` で即落ちした事故が実際に起きている（`.claude/skills/devenv-cicd/SKILL.md` 「過去の事故と教訓」参照）。

**確認方法**: 新規 script を `devenv.nix` に追加する前に必ず `type <name>` で組み込みでないことを確認する。

```bash
type test           # → test is a shell builtin   ❌ 使用不可
type unit-test      # → unit-test not found       ✅ 使用可（または既存 script なら PATH のパス表示）
```

ハイフン付きの kebab-case（`lint-frontend`, `format-check`, `test-db`, `unit-test`, `dev-web` など）は builtin と衝突しないので安全。本リポジトリの既存命名もこれを踏襲している。

## Enforcement

This command usage policy is **CRITICAL and NON-NEGOTIABLE**.

品質チェックを直接コマンドで実行することは、以下の問題を引き起こす：
- 環境依存の差異による不整合
- CI/CD パイプラインとの乖離
- 意図しない副作用（設定差異によるフォーマット崩れ等）
- profile (env) 設定が読み込まれず、本番設定で local 開発するリスク

**違反は一切許容しない。**
