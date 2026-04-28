---
name: devenv-cicd
description: GitHub Actions × devenv 2.0 による CI/CD ガイダンス。`.github/workflows/` の YAML 編集、`devenv tasks run` を CI で動かす、`enterShell` hook を発火させる、`devenv test` の process phase 回避、Cachix・`.devenv/` キャッシュ、`concurrency` group などについての質問に使用。本リポジトリの ci-check / test ジョブの設計方針を提供。
---

# devenv-cicd Skill

このプロジェクトの CI/CD（GitHub Actions × devenv 2.0）の設計方針と、よくある落とし穴の回避策をまとめる。

対象: `.github/workflows/ci.yml` ほか、devenv で構成された開発環境を CI 上で動かすすべての workflow。

## 大原則

**CI 上の `run:` ステップは原則すべて devenv shell 内で実行する**。`devenv tasks run` を `run:` で素のシェルから直接叩いてはいけない。

理由: `devenv:enterShell` hook を経由しないと `setup:install-frontend` / `setup:install-drizzle` / `setup:install-backend` 等（`before = [ "devenv:enterShell" ]` で登録された task）が発火せず、`bun install --frozen-lockfile` / `uv sync --frozen` が走らないため、`turbo` / `eslint` / `tsc` 等の node_modules / .venv 依存ツールが PATH 上に出現しない状態で verify task が実行されて落ちる。

## 推奨パターン（公式ベストプラクティス準拠）

[Using devenv in GitHub Actions](https://devenv.sh/integrations/github-actions/) で推奨される 3 形態:

| パターン | 使い道 | enterShell hook |
|---|---|---|
| `run: devenv test` | フルチェック（git hooks 含む） | 発火 |
| `run: devenv shell <single-cmd>` | 単一コマンド実行 | 発火 |
| `shell: devenv shell bash -- -e {0}` + `run: \|` | 複数行スクリプト | 発火 |

複数 step に渡って devenv shell を使うなら、**workflow / job レベルで `defaults.run.shell` を設定**して全 `run:` に適用するのが最もシンプル。

```yaml
defaults:
  run:
    shell: devenv shell bash -- -e {0}
```

ただし「devenv 自体をインストールする step」だけは `shell: bash` で override する必要がある（その時点では devenv shell が存在しないため）。

## 本リポジトリの設計

### `.github/workflows/ci.yml` の構成

#### 共通

- `concurrency.group = ${{ github.workflow }}-${{ github.ref }}`、`cancel-in-progress = ${{ github.event_name == 'pull_request' }}`
  - PR への連続 push は古い走行をキャンセルし、main / develop への直接 push はキャンセルしない
- `defaults.run.shell: devenv shell bash -- -e {0}` を **workflow レベル**で設定 → 両 job の全 `run:` で enterShell hook が発火
- `cachix/install-nix-action@v31` + `cachix/cachix-action@v16` (`name: devenv`) で Nix binary cache
- `actions/cache@v4` で `.devenv/` を cache（後述）
- `Install devenv.sh` step は `shell: bash` override + `run: nix profile add nixpkgs#devenv`

#### `ci-check` job（lint + format + type-check）

verify task のみを **直接列挙** して `devenv tasks run ...` で実行する。

```yaml
- name: Run verify tasks
  run: |
    devenv tasks run \
      lint-ci:frontend lint-ci:drizzle lint-ci:backend-py lint-ci:functions lint-ci:fsd \
      format-check:frontend format-check:drizzle format-check:backend-py format-check:functions \
      type-check:frontend type-check:mobile type-check:backend-py type-check:functions
```

**`devenv test` (= `ci:check` aggregator) は使わない**。理由は次節。

#### `test` job（unit tests）

```yaml
- name: Run unit tests
  run: test
```

defaults によりすでに devenv shell 内なので、`devenv shell test` のように二重に書かず devenv script (`test`) を直接呼ぶ。

### なぜ `devenv test` を使わないか

`devenv test` は `ci:check` aggregator (`before = [ "devenv:enterTest" ]`) を起動する。`devenv:enterTest` は **process phase を含む**ため、本リポジトリの設定では:

- `supabase:start` task が `before = [ "devenv:processes:backend" ]` で前置されて Supabase Docker を起動する
- `backend` / `storybook` プロセスも立ち上げようとする

CI で lint / format / type-check しか走らせたくないのに毎回 Supabase Docker と Storybook を起動するのはコスト・時間の無駄。だから `devenv test` の代わりに、aggregator 配下の verify task を `devenv tasks run` で**直接列挙**する。

verify task 自体は `execIfModified` キャッシュ込みで実装されているので、aggregator を経由しなくても効果は同じ。

### Cachix と `.devenv/` キャッシュ

二段で効かせる:

| キャッシュ | 何をキャッシュするか | 効果 |
|---|---|---|
| `cachix/cachix-action@v16` (`name: devenv`) | Nix store（devenv shell の構成要素、bun / nodejs / uv / python など Nix で管理されるパッケージ） | shell の build 時間を秒単位に短縮 |
| `actions/cache@v4` で `path: .devenv` | task runner の state（`execIfModified` ハッシュ DB）、setup task の install ステート | 無変更コミットでは setup / verify task ごとスキップ |

`.devenv/` の cache key は **devenv 構成 + 各種 lockfile** の hash:

```yaml
key: ${{ runner.os }}-devenv-${{ hashFiles('devenv.nix', 'devenv.lock', 'devenv.yaml', 'frontend/bun.lock', 'drizzle/bun.lock', 'backend-py/app/uv.lock') }}
restore-keys:
  - ${{ runner.os }}-devenv-
```

`restore-keys` で部分一致 fallback を効かせると、構成変更があっても近いキャッシュから始めて差分だけ再構築できる。両 job で同じ key を共有しても、`actions/cache` は同 key の重複保存を黙ってスキップするので問題なし。

## やってはいけないパターン

### NG: enterShell を発火させない

```yaml
# ❌ NG: setup:install-* が走らないので turbo / eslint / tsc が見つからない
- name: Run verify tasks
  run: |
    devenv tasks run lint-ci:frontend type-check:frontend ...
```

```yaml
# ✅ OK: defaults または step-level shell で devenv shell 経由
defaults:
  run:
    shell: devenv shell bash -- -e {0}
# ...
- name: Run verify tasks
  run: |
    devenv tasks run lint-ci:frontend type-check:frontend ...
```

### NG: bash で `bun install` / `uv sync` を直接呼ぶ

```yaml
# ❌ NG: setup task の execIfModified キャッシュを無視して毎回 install してしまう
- run: cd frontend && bun install --frozen-lockfile
- run: cd backend-py/app && uv sync --frozen
```

setup task が lockfile 変更を検知して必要なときだけ install する設計なので、CI で重ねて install を呼ばない。`devenv shell` 経由にして hook に任せる。

### NG: `devenv test` を使う（このプロジェクトでは）

```yaml
# ❌ NG: process phase で Supabase Docker / Storybook が毎回起動する
- run: devenv test
```

CI 用途では、verify task を直接列挙する。

### NG: `Install devenv.sh` で defaults を上書きしない

```yaml
# ❌ NG: devenv shell がまだ存在しないのに devenv shell bash -- -e で起動しようとする
- name: Install devenv.sh
  run: nix profile add nixpkgs#devenv
```

```yaml
# ✅ OK: bash で override
- name: Install devenv.sh
  shell: bash
  run: nix profile add nixpkgs#devenv
```

## 新しい verify task / job を追加する手順

1. `devenv.nix` の `tasks` に task を追加（`execIfModified` で対象ファイル glob を指定）
2. 必要に応じて scripts (`xxx-ci`) も追加
3. `.github/workflows/ci.yml` の `ci-check` job の `devenv tasks run ...` リストに task 名を追加
4. enterShell hook は `defaults.run.shell` で既に発火するので、追加の install 系ステップは不要

新しいパッケージ (`frontend/apps/<new>/`) を追加した場合も、`bun.lock` が更新されれば `setup:install-frontend` の `execIfModified` が検知して install するため、CI workflow 側は無変更で動く。

ただし **新しい lockfile（例: `tooling/<new>/bun.lock`）が増えた場合**は、`.devenv/` cache key の `hashFiles(...)` 引数にも追加することを忘れない。さもないと依存変更が cache key に反映されず、stale cache が再利用され続ける。

## 参考テンプレート（最小骨格）

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

defaults:
  run:
    shell: devenv shell bash -- -e {0}

jobs:
  ci-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: cachix/install-nix-action@v31
      - uses: cachix/cachix-action@v16
        with:
          name: devenv
      - name: Cache devenv state
        uses: actions/cache@v4
        with:
          path: .devenv
          key: ${{ runner.os }}-devenv-${{ hashFiles('devenv.nix', 'devenv.lock', 'devenv.yaml', '**/bun.lock', '**/uv.lock') }}
          restore-keys:
            - ${{ runner.os }}-devenv-
      - name: Install devenv.sh
        shell: bash
        run: nix profile add nixpkgs#devenv
      - name: Run verify tasks
        run: |
          devenv tasks run \
            lint-ci:frontend \
            lint-ci:drizzle \
            ...
```

## チェックリスト（PR 前）

- [ ] `defaults.run.shell` か step-level `shell:` で devenv shell が経由されているか
- [ ] `Install devenv.sh` step は `shell: bash` override されているか
- [ ] `devenv test` を CI で叩いていないか（process phase 起動回避）
- [ ] verify task / test を直接列挙しているか
- [ ] `bun install` / `uv sync` を bash から直接呼んでいないか
- [ ] `.devenv/` cache の key に新 lockfile が含まれているか（lockfile を新規追加した場合）
- [ ] `concurrency` group が設定されているか

## 関連ドキュメント

- 公式: [Using devenv in GitHub Actions](https://devenv.sh/integrations/github-actions/)
- 公式 issue（CI 最適化議論）: [What to do to optimize CI? #1575](https://github.com/cachix/devenv/issues/1575)
- 本リポジトリ:
  - `.github/workflows/ci.yml` — 実装
  - `devenv.nix` — task / scripts 定義
  - `.claude/rules/commands.md` — devenv コマンド使用ポリシー
  - `.claude/skills/debugging/SKILL.md` — devenv 2.0 の native process manager / TUI の運用
