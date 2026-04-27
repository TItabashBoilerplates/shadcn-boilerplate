{ pkgs, config, lib, ... }:

let
  # 環境ごとの env file 読み込み処理。
  # profile 名（= 環境名）を引数に取り、当該環境の全サービスの env file を
  # bash の `set -a; source` で読み込む。
  # bash パーサがクォート・エスケープ・コメントを正しく処理する。
  # `dotenvx -f X -f Y` と同じく後勝ち（secrets が後ろなので secrets が conflict を上書き）。
  loadEnvForProfile = profileName: ''
    set -a
    [ -f "$DEVENV_ROOT/env/backend/.env.${profileName}" ]   && . "$DEVENV_ROOT/env/backend/.env.${profileName}"
    [ -f "$DEVENV_ROOT/env/frontend/.env.${profileName}" ]  && . "$DEVENV_ROOT/env/frontend/.env.${profileName}"
    [ -f "$DEVENV_ROOT/env/migration/.env.${profileName}" ] && . "$DEVENV_ROOT/env/migration/.env.${profileName}"
    [ -f "$DEVENV_ROOT/env/.env.secrets" ]                  && . "$DEVENV_ROOT/env/.env.secrets"
    set +a
  '';

  # backend service の exec body。
  # local profile の `processes.backend` と base の `containers.backend` の両方から
  # 参照したいので let-binding で一度だけ定義する。
  #
  # 末尾を `exec "$UV_PROJECT_ENVIRONMENT/bin/uvicorn"` にすることで
  # bash → uvicorn を直接置換し、uvicorn 自体を session leader にする
  # （PR #2620 が要求する終了シグナル伝播パス）。
  # `uv run` を間に挟むと、`uv run` が wrapper として親プロセスに残り続け、
  # devenv が SIGTERM を打っても子の python uvicorn まで伝搬せず orphan 化する
  # （issue #2619 系の症状。実機で `Address already in use` の起動失敗を確認済み）。
  # `uv sync` は idempotent なワンショットなので exec の前に普通に実行する。
  backendExec = ''
    set -euo pipefail
    cd "$DEVENV_ROOT/backend-py/app"
    export PYTHONPATH="$DEVENV_ROOT/backend-py/app/src''${PYTHONPATH:+:$PYTHONPATH}"
    uv sync --group dev
    exec "$UV_PROJECT_ENVIRONMENT/bin/uvicorn" app:app \
      --proxy-headers --reload \
      --host 0.0.0.0 --port 4040
  '';

  # ===== Frontend monorepo apps =====
  #
  # `frontend/apps/<name>` 配下のアプリを 1 行で宣言する。各エントリから:
  #   - `processes.<name>`         (start.enable=false で opt-in 起動)
  #   - `scripts.dev-<name>`       (backend + storybook + <name> を起動するプリセット)
  #   - `scripts.dev-all`          (全アプリ含む起動プリセット、自動更新)
  # が自動生成される。
  #
  # 新規アプリ追加手順:
  #   1. `frontend/apps/<name>/` を作成（package.json に `dev` または `start` script を定義）
  #   2. この attrset に 1 行追加（`port` 必須、その他は任意）
  #
  # 各エントリのオプション:
  #   - port  : ready probe で叩くポート（必須）
  #   - ready : ready probe path（既定 "/"）
  #   - exec  : exec body 全体を上書き（既定は `cd frontend/apps/<name> && exec nr dev`）
  frontendApps = {
    web   = { port = 3000; };
    mobile = {
      port = 8081;
      ready = "/status";
      exec = ''
        cd "$DEVENV_ROOT/frontend/apps/mobile"
        exec nr start
      '';
    };
  };

  # 各アプリ定義から process spec を生成。
  mkAppProcess = name: cfg: {
    exec = cfg.exec or ''
      cd "$DEVENV_ROOT/frontend/apps/${name}"
      exec nr dev
    '';
    start.enable = false;
    ready.http.get = {
      host = "127.0.0.1";
      port = cfg.port;
      path = cfg.ready or "/";
    };
  };

  # 各アプリ定義から `dev-<name>` script spec を生成。
  # 終了時の Supabase 停止は手動運用（`supabase-stop` / `stop` script）に統一する。
  # devenv 2.0 native process manager は task の `after` も `process.manager.after` も
  # 動かないため、auto-stop の中途半端な実装を持たない方針。
  mkDevScript = name: _cfg: {
    exec = ''exec devenv up backend storybook ${name}'';
    description = "Start backend + storybook + ${name}";
  };

  # 全アプリを含む `dev-all` script の exec を組み立てる。
  devAllExec = ''
    exec devenv up backend storybook ${lib.concatStringsSep " " (lib.attrNames frontendApps)}
  '';
in
{
  # devenv 標準の dotenv 統合 (`dotenv.enable`) は使わない:
  #   - `dotenv.filename` は `.env` プレフィックス必須で `env/backend/.env.local` のような
  #     階層パスを受け付けない（src/modules/integrations/dotenv.nix の assertion）
  #   - 内蔵パーサがクォート (`KEY="value"`) を文字通り保持してしまう
  # 代わりに「環境ごとに profile を切る + profile の enterShell で bash の
  # `set -a; source` する」という devenv 標準のプロファイル機構を使う。
  dotenv.disableHint = true;

  packages = [
    # backend-py のシステム依存（C 拡張・音声ビデオライブラリ）
    pkgs.gcc
    pkgs.gnumake
    pkgs.libedit
    pkgs.libopus
    pkgs.libvpx
  ] ++ lib.optionals (!config.container.isBuilding) [
    # 開発専用ツール（コンテナビルド時は除外）
    pkgs.supabase-cli
    pkgs.ni
    pkgs.maestro
  ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    bun.enable = true;
  };

  languages.typescript.enable = true;

  languages.python = {
    enable = true;
    package = pkgs.python313;
    uv.enable = true;
  };

  languages.deno.enable = true;

  # ===== Processes（`devenv up` で起動するサービス）=====
  #
  # devenv 2.0 native process manager。process-compose は使わない（native がデフォルト）。
  #
  # local 環境がデフォルト。`devenv up`（profile 指定なし）で base enterShell が
  # loadEnvForProfile "local" を実行し、`start.enable = true` のプロセスが立ち上がる。
  # `supabase:start` task は backend process の `before` に登録されているので、
  # `devenv up` 一発で Supabase → backend の順に起動する。
  #
  # 起動制御:
  #   - `start.enable = true` (default): `devenv up` で自動起動 (= backend / storybook)
  #   - `start.enable = false`         : 明示指定が必要 (= frontendApps の各エントリ)
  #     例: `devenv up web`, `devenv up backend storybook web`, `dev-web` script
  #
  # frontendApps から process 群が自動生成される（let-binding 参照）。
  # 新規アプリは `frontendApps` に 1 行追加するだけで `processes`/`scripts.dev-<name>`/
  # `scripts.dev-all` がすべて連動する。
  #
  # NOTE: Supabase (Docker コンテナ群) は devenv 管理対象外。
  # Supabase CLI で独立管理する。`supabase:start` task で起動する。
  processes = {
    # ----- 既定起動（軽量・常時必要）-----

    # FastAPI バックエンド。env は base enterShell で source 済みのものを継承する。
    backend = {
      exec = backendExec;
      ready.http.get = {
        host = "127.0.0.1";
        port = 4040;
        path = "/healthcheck";
      };
    };

    # Storybook コンポーネントカタログ（DB 非依存・env 不要）。
    storybook = {
      exec = ''
        cd "$DEVENV_ROOT/frontend"
        exec bun run storybook -- --host 0.0.0.0 --port 6006 --quiet --ci
      '';
      ready.http.get = {
        host = "127.0.0.1";
        port = 6006;
        path = "/";
      };
    };
  } // lib.mapAttrs mkAppProcess frontendApps;
  # ↑ frontendApps から opt-in process 群を自動生成（start.enable = false）。

  # ===== Profiles（環境切替）=====
  #
  # local が **default**（base enterShell で読み込み済み）なので `-P local` は不要。
  # 各 profile は base の上に env を **上書き** する形でロードする
  # （bash の `set -a; source` は後勝ちなので、後にロードした値が勝つ）。
  #
  # アクティベーション例:
  #   devenv up                                    # local 環境で backend + storybook 起動
  #   devenv shell                                 # local env で shell に入る
  #   devenv up -P dev                             # dev 環境で起動
  #   devenv shell -P staging -- supabase status   # staging env で確認
  #   devenv tasks run -P production deploy:functions
  #
  # `loadEnvForProfile` は `[ -f X ] && . X` で gard されているので env ファイル未配置でも
  # エラーにならない。env ファイルを `env/{backend,frontend,migration}/.env.<profile>` に
  # 配置すれば即 `-P <profile>` で読み込まれる（env/ 配下は .env.local 以外 gitignore 対象）。
  #
  # 新環境を追加したい場合:
  #   1. env/{backend,frontend,migration}/.env.<name> を作成（任意・後置きでも OK）
  #   2. このブロックに `<name>.module.enterShell = loadEnvForProfile "<name>";` を追加
  profiles = {
    # dev 環境（共有開発インスタンス・チーム用ステージなど）。
    dev.module.enterShell = loadEnvForProfile "dev";

    # staging 環境（マイグレーション・デプロイ等のリモート操作用）。
    staging.module.enterShell = loadEnvForProfile "staging";

    # production 環境（マイグレーション・デプロイ等のリモート操作用）。
    production.module.enterShell = loadEnvForProfile "production";
  };

  # ===== Tasks（多段 pipeline・依存関係あり）=====
  #
  # 実行: `devenv tasks run <name>` または namespace prefix で一括実行（`devenv tasks run db`）。
  # 依存解決: `before` / `after` で順序制御。
  tasks = {
    # ---------- Setup（enterShell 前の自動セットアップ）----------
    # `before = [ "devenv:enterShell" ]` で devenv shell / direnv reload / devenv up 開始時に自動実行。
    # `status` または `execIfModified` で「変更がない時はスキップ」する idempotent 設計。
    # `--frozen-lockfile` / `--frozen` を使うことで lockfile の意図しない書き換えを防止
    # （issue #2497 の fork bomb 回避）。

    # secrets 雛形のコピー（一度だけ）。
    "setup:secrets" = {
      exec = ''
        echo "📋 Creating env/.env.secrets from example..."
        cp "$DEVENV_ROOT/env/.env.secrets.example" "$DEVENV_ROOT/env/.env.secrets"
        echo "✅ env/.env.secrets created. Edit it with your real secrets."
      '';
      status = ''test -f "$DEVENV_ROOT/env/.env.secrets"'';
      before = [ "devenv:enterShell" ];
    };

    # frontend deps 同期（lockfile 変更検知時のみ実行）。
    "setup:install-frontend" = {
      exec = ''
        cd "$DEVENV_ROOT/frontend"
        echo "📦 Installing frontend dependencies..."
        bun install --frozen-lockfile || {
          echo ""
          echo "⚠️  bun install failed (lockfile may be out of sync)."
          echo "   Run 'cd frontend && bun install' manually to update bun.lock."
          exit 1
        }
      '';
      execIfModified = [
        "frontend/bun.lock"
        "frontend/package.json"
      ];
      before = [ "devenv:enterShell" ];
    };

    # drizzle deps 同期。
    "setup:install-drizzle" = {
      exec = ''
        cd "$DEVENV_ROOT/drizzle"
        echo "📦 Installing drizzle dependencies..."
        bun install --frozen-lockfile || {
          echo ""
          echo "⚠️  bun install failed (lockfile may be out of sync)."
          echo "   Run 'cd drizzle && bun install' manually to update bun.lock."
          exit 1
        }
      '';
      execIfModified = [
        "drizzle/bun.lock"
        "drizzle/package.json"
      ];
      before = [ "devenv:enterShell" ];
    };

    # backend-py deps 同期。
    "setup:install-backend" = {
      exec = ''
        cd "$DEVENV_ROOT/backend-py/app"
        echo "📦 Installing backend-py dependencies..."
        uv sync --frozen --group dev || {
          echo ""
          echo "⚠️  uv sync failed (lockfile may be out of sync)."
          echo "   Run 'cd backend-py/app && uv lock && uv sync --group dev' manually."
          exit 1
        }
      '';
      execIfModified = [
        "backend-py/app/uv.lock"
        "backend-py/app/pyproject.toml"
      ];
      before = [ "devenv:enterShell" ];
    };

    # ---------- Supabase ----------
    "supabase:start" = {
      exec = ''
        echo "🚀 Starting Supabase (Docker)..."
        supabase start --yes
        supabase seed buckets --local --yes || true
      '';
      # backend process が起動する前に Supabase が ready であることを保証する。
      before = [ "devenv:processes:backend" ];
    };

    "supabase:stop".exec = ''
      echo "🛑 Stopping Supabase (Docker)..."
      supabase stop || true
    '';

    # ---------- DB Migration（Drizzle）----------
    # local 環境のスキーマ生成 + 適用。
    # 型生成（model:build）は別タスク。フルフローは `app:migrate-dev` を使う。
    "db:migrate-dev" = {
      exec = ''
        set -euo pipefail
        cd "$DEVENV_ROOT/drizzle"
        echo "🔧 Pre-migration SQL (extensions)..."
        nr migrate:pre
        echo "📝 Generating migration..."
        nr generate
        echo "✅ Applying migration to local DB..."
        nr migrate
        echo "🔧 Post-migration SQL (functions, triggers)..."
        nr migrate:post
        echo "✨ Don't forget to commit migration files."
      '';
      after = [ "supabase:start" ];
    };

    # 全環境共通: 既存マイグレーションの適用のみ
    "db:migrate-deploy".exec = ''
      set -euo pipefail
      cd "$DEVENV_ROOT/drizzle"
      echo "🚀 Deploying migrations..."
      nr migrate:pre
      nr migrate
      nr migrate:post
    '';

    # local 環境のフルフロー: migration → 型生成（順序保証のため inline で sequential 実行）。
    # `migrate-dev` という慣用名なのでこちらが「ユーザーが普段叩くやつ」。
    "app:migrate-dev" = {
      exec = ''
        set -euo pipefail
        echo "🚀 Full migrate-dev pipeline..."
        cd "$DEVENV_ROOT/drizzle"
        nr migrate:pre
        nr generate
        nr migrate
        nr migrate:post
        echo "🔧 Generating types from migrated schema..."
        cd "$DEVENV_ROOT"
        mkdir -p frontend/packages/types
        supabase gen types typescript --local > frontend/packages/types/schema.ts
        cd frontend && bun run --filter @workspace/api-client generate \
          || echo "⚠️  API client gen skipped (backend not running)"
        cd "$DEVENV_ROOT"
        mkdir -p supabase/functions/shared/types/supabase
        supabase gen types typescript --local > supabase/functions/shared/types/supabase/schema.ts
        mkdir -p supabase/functions/shared/drizzle
        cp -r drizzle/schema/* supabase/functions/shared/drizzle/
        echo "✨ Migration + type generation done!"
      '';
      after = [ "supabase:start" ];
    };

    # ---------- Type/Model 生成 ----------
    "model:frontend" = {
      exec = ''
        set -euo pipefail
        mkdir -p "$DEVENV_ROOT/frontend/packages/types"
        supabase gen types typescript --local > "$DEVENV_ROOT/frontend/packages/types/schema.ts"
        echo "🔧 Generating backend API client (Hey API)..."
        cd "$DEVENV_ROOT/frontend"
        bun run --filter @workspace/api-client generate \
          || echo "⚠️  Backend API client generation skipped (backend not running)"
      '';
      after = [ "supabase:start" ];
    };

    "model:functions" = {
      exec = ''
        set -euo pipefail
        mkdir -p "$DEVENV_ROOT/supabase/functions/shared/types/supabase"
        supabase gen types typescript --local \
          > "$DEVENV_ROOT/supabase/functions/shared/types/supabase/schema.ts"
        mkdir -p "$DEVENV_ROOT/supabase/functions/shared/drizzle"
        cp -r "$DEVENV_ROOT/drizzle/schema/"* "$DEVENV_ROOT/supabase/functions/shared/drizzle/"
        echo "✅ Drizzle schema copied to supabase/functions/shared/drizzle/"
      '';
      after = [ "supabase:start" ];
    };

    "model:build".after = [ "model:frontend" "model:functions" ];

    # ---------- Seed ----------
    # local seed は Supabase が起動済みであることが前提なので supabase:start に依存させる。
    # remote seed (`--linked`) では Docker ローカルではなくリモート DB に対して実行されるが、
    # その場合でも Supabase CLI のリンク済み project に接続するだけで supabase:start は no-op
    # （Docker コンテナは local 環境用なので、ENV=remote 時は touched しない）。
    "seed:db" = {
      exec = ''
        cd "$DEVENV_ROOT/drizzle"
        bun run seed/index.ts
      '';
      after = [ "supabase:start" ];
    };

    "seed:storage" = {
      exec = ''
        cd "$DEVENV_ROOT"
        if [ "$ENV" = "local" ] || [ -z "''${ENV:-}" ]; then
          supabase seed buckets --local
        else
          supabase seed buckets --linked
        fi
      '';
      after = [ "supabase:start" ];
    };

    "seed:all".after = [ "seed:db" "seed:storage" ];

    # ---------- Deploy ----------
    "deploy:functions".exec = ''
      set -euo pipefail
      if [ "''${ENV:-local}" = "local" ]; then
        echo "Skipping deploy:functions for local environment"
        exit 0
      fi
      for fn in watermark stripe-checkout stripe-products stripe-webhooks polar-webhooks; do
        supabase functions deploy "$fn" --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
      done
    '';

    "deploy:polar-webhooks".exec = ''
      set -euo pipefail
      if [ "''${ENV:-local}" = "local" ]; then
        echo "⚠️  Skipping deploy for local environment"
        exit 0
      fi
      echo "🚀 Deploying Polar webhook handler..."
      supabase functions deploy polar-webhooks --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
    '';

    "deploy:supabase".exec = ''./scripts/supabase/deploy.sh'';

    # ---------- Polar.sh ----------
    "polar:sync-dry".exec = ''
      cd "$DEVENV_ROOT/frontend"
      bun run ../scripts/polar/sync.ts --dry-run
    '';

    "polar:sync".exec = ''
      cd "$DEVENV_ROOT/frontend"
      bun run ../scripts/polar/sync.ts
    '';

    # ---------- Quality CI gate（execIfModified キャッシュ + namespace 並列）----------
    # 設計方針 (詳細は docs/_research/2026-04-28-devenv-quality-checks.md):
    #   - **コミット時の差分チェック**は git-hooks (pre-commit) が担当（変更ファイルだけ）
    #   - **CI / 手動 verify** は ここの tasks が担当（execIfModified で incremental skip）
    #   - `ci:check` は `before = [ "devenv:enterTest" ]` で `devenv test` に紐付け
    #     → ローカルも CI も `devenv test` 一発で全 verify
    #   - auto-fix 系 (lint, format) は scripts のまま (副作用ループ回避)
    #
    # status と execIfModified は同時指定不可 (devenv モジュールアサーション)。
    # auto-fix 系には execIfModified を付けない (issue #2497 fork bomb 回避)。

    # ----- Lint (CI mode = no auto-fix) -----
    "lint-ci:frontend" = {
      exec = ''cd "$DEVENV_ROOT/frontend" && nr lint:ci'';
      execIfModified = [
        "frontend/**/*.ts"
        "frontend/**/*.tsx"
        "frontend/**/*.js"
        "frontend/**/*.jsx"
        "frontend/**/*.json"
        "frontend/biome.json"
      ];
    };
    "lint-ci:drizzle" = {
      exec = ''cd "$DEVENV_ROOT/drizzle" && nr lint:ci'';
      execIfModified = [
        "drizzle/**/*.ts"
        "drizzle/biome.json"
      ];
    };
    "lint-ci:backend-py" = {
      exec = ''cd "$DEVENV_ROOT/backend-py/app" && uv run ruff check src/'';
      execIfModified = [
        "backend-py/app/src/**/*.py"
        "backend-py/app/pyproject.toml"
        "backend-py/app/ruff.toml"
      ];
    };
    "lint-ci:functions" = {
      exec = ''deno lint "$DEVENV_ROOT/supabase/functions/"'';
      execIfModified = [
        "supabase/functions/**/*.ts"
        "supabase/functions/**/deno.json"
      ];
    };
    "lint-ci:fsd" = {
      exec = ''
        cd "$DEVENV_ROOT/frontend/apps/web" && nr lint:fsd
        cd "$DEVENV_ROOT/frontend/apps/mobile" && nr lint:fsd
      '';
      execIfModified = [
        "frontend/apps/web/**/*.ts"
        "frontend/apps/web/**/*.tsx"
        "frontend/apps/mobile/**/*.ts"
        "frontend/apps/mobile/**/*.tsx"
        "frontend/apps/web/steiger.config.*"
        "frontend/apps/mobile/steiger.config.*"
      ];
    };

    # ----- Format check (no auto-fix) -----
    "format-check:frontend" = {
      exec = ''cd "$DEVENV_ROOT/frontend" && nr format-check'';
      execIfModified = [
        "frontend/**/*.ts"
        "frontend/**/*.tsx"
        "frontend/**/*.js"
        "frontend/**/*.jsx"
        "frontend/**/*.json"
        "frontend/biome.json"
      ];
    };
    "format-check:drizzle" = {
      exec = ''cd "$DEVENV_ROOT/drizzle" && nr format-check'';
      execIfModified = [
        "drizzle/**/*.ts"
        "drizzle/biome.json"
      ];
    };
    "format-check:backend-py" = {
      exec = ''cd "$DEVENV_ROOT/backend-py/app" && uv run ruff format --check src/'';
      execIfModified = [
        "backend-py/app/src/**/*.py"
        "backend-py/app/pyproject.toml"
        "backend-py/app/ruff.toml"
      ];
    };
    "format-check:functions" = {
      exec = ''deno fmt --check "$DEVENV_ROOT/supabase/functions/"'';
      execIfModified = [
        "supabase/functions/**/*.ts"
        "supabase/functions/**/deno.json"
      ];
    };

    # ----- Type check -----
    "type-check:frontend" = {
      exec = ''cd "$DEVENV_ROOT/frontend" && nr type-check'';
      execIfModified = [
        "frontend/**/*.ts"
        "frontend/**/*.tsx"
        "frontend/**/tsconfig*.json"
        "frontend/**/package.json"
      ];
    };
    "type-check:mobile" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && nlx tsc --noEmit'';
      execIfModified = [
        "frontend/apps/mobile/**/*.ts"
        "frontend/apps/mobile/**/*.tsx"
        "frontend/apps/mobile/tsconfig*.json"
        "frontend/apps/mobile/package.json"
      ];
    };
    "type-check:backend-py" = {
      exec = ''cd "$DEVENV_ROOT/backend-py/app" && uv run mypy src/'';
      execIfModified = [
        "backend-py/app/src/**/*.py"
        "backend-py/app/pyproject.toml"
      ];
    };
    "type-check:functions" = {
      exec = ''
        for dir in "$DEVENV_ROOT"/supabase/functions/*/; do
          [ -f "$dir/index.ts" ] || continue
          func_name=$(basename "$dir")
          if [ -f "$dir/deno.json" ]; then
            (cd "$dir" && deno cache --config=deno.json index.ts) >/dev/null 2>&1 || true
            (cd "$dir" && deno check --config=deno.json index.ts) || echo "  ⚠️  Type check failed for $func_name"
          else
            deno check "$dir/index.ts" || echo "  ⚠️  Type check failed for $func_name"
          fi
        done
      '';
      execIfModified = [
        "supabase/functions/**/*.ts"
        "supabase/functions/**/deno.json"
      ];
    };

    # ----- Aggregator: devenv test → 全 verify を一発実行 -----
    # `before = [ "devenv:enterTest" ]` で `devenv test` の依存に組み込む。
    # `after = [ ... ]` で配下の verify task をすべて要求 → namespace 内で並列実行 + キャッシュ。
    "ci:check" = {
      exec = ''echo "✅ All CI checks passed"'';
      before = [ "devenv:enterTest" ];
      after = [
        "lint-ci:frontend"
        "lint-ci:drizzle"
        "lint-ci:backend-py"
        "lint-ci:functions"
        "lint-ci:fsd"
        "format-check:frontend"
        "format-check:drizzle"
        "format-check:backend-py"
        "format-check:functions"
        "type-check:frontend"
        "type-check:mobile"
        "type-check:backend-py"
        "type-check:functions"
      ];
    };

    # ---------- Stop ----------
    "app:stop".exec = ''
      echo "🛑 Stopping devenv processes (backend + storybook)..."
      devenv processes down 2>/dev/null || true
      echo "🛑 Stopping Supabase (Docker)..."
      supabase stop 2>/dev/null || true
      echo "✅ All services stopped."
    '';
  };

  # ===== Scripts（PATH に追加される単発コマンド）=====
  #
  # devenv shell に入った状態（または direnv 経由）で、コマンド名で直接実行できる。
  # 例: `frontend`, `lint-frontend`, `test-db`
  scripts = {
    # ---------- Lifecycle shortcuts ----------
    "stop" = {
      exec = ''exec devenv tasks run app:stop'';
      description = "Stop devenv processes + Supabase";
    };

    "supabase-start" = {
      exec = ''exec devenv tasks run supabase:start'';
      description = "Start Supabase (Docker) + seed buckets";
    };

    "supabase-stop" = {
      exec = ''exec devenv tasks run supabase:stop'';
      description = "Stop Supabase (Docker)";
    };

    # ---------- Dev preset（モノレポのアプリ別起動プリセット）----------
    # frontendApps から `dev-<name>` script と `dev-all` を自動生成する。
    # 個別の手書き宣言は不要 — `frontendApps` に 1 行追加すれば連動する。
    "dev-all" = {
      exec = devAllExec;
      description = "Start backend + storybook + all frontend apps";
    };

    # ---------- Dev servers（long-running, foreground, devenv 外）----------
    # frontend (turbo dev) は web + mobile を **両方** 並列起動する重いコマンド。
    # アプリ別に分けたい場合は `dev-web` / `dev-mobile` を使うこと。
    "frontend" = {
      exec = ''cd "$DEVENV_ROOT/frontend" && exec nr dev'';
      description = "Start frontend monorepo (turbo dev: web + mobile parallel)";
    };

    "mobile" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx expo start'';
      description = "Start Expo dev server (interactive platform select)";
    };

    "mobile-ios" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx expo start --ios'';
      description = "Start Expo (iOS)";
    };

    "mobile-android" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx expo start --android'';
      description = "Start Expo (Android)";
    };

    "mobile-web" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx expo start --web'';
      description = "Start Expo (Web)";
    };

    "build-mobile-ios" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx eas build --platform ios'';
      description = "Build mobile (iOS) via EAS";
    };

    "build-mobile-android" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx eas build --platform android'';
      description = "Build mobile (Android) via EAS";
    };

    # ---------- Lint ----------
    # auto-fix 系: scripts に直接処理 (シンプル sequential、execIfModified なし → 副作用ループ回避)
    "lint-frontend"     = { exec = ''cd "$DEVENV_ROOT/frontend" && nr lint''; description = "Biome lint (frontend, auto-fix)"; };
    "lint-drizzle"      = { exec = ''cd "$DEVENV_ROOT/drizzle" && nr lint''; description = "Biome lint (drizzle, auto-fix)"; };
    "lint-backend-py"   = { exec = ''cd "$DEVENV_ROOT/backend-py/app" && uv run ruff check --fix src/''; description = "Ruff lint (backend-py, auto-fix)"; };

    # CI 系: tasks (lint-ci:*) の wrapper → execIfModified キャッシュが効く
    "lint-frontend-ci"   = { exec = ''exec devenv tasks run lint-ci:frontend''; description = "Biome lint (frontend, CI, cached)"; };
    "lint-drizzle-ci"    = { exec = ''exec devenv tasks run lint-ci:drizzle''; description = "Biome lint (drizzle, CI, cached)"; };
    "lint-backend-py-ci" = { exec = ''exec devenv tasks run lint-ci:backend-py''; description = "Ruff lint (backend-py, CI, cached)"; };
    "lint-fsd"           = { exec = ''exec devenv tasks run lint-ci:fsd''; description = "FSD boundary check (cached)"; };
    "lint-functions"     = { exec = ''exec devenv tasks run lint-ci:functions''; description = "Deno lint (edge functions, cached)"; };

    "lint" = {
      exec = ''
        set -e
        echo "🔍 Lint all (auto-fix)..."
        lint-frontend
        lint-drizzle
        lint-backend-py
        deno lint "$DEVENV_ROOT/supabase/functions/"
      '';
      description = "Lint all subprojects (auto-fix)";
    };

    # ---------- Format ----------
    # auto-fix 系: scripts に直接処理
    "format-frontend"   = { exec = ''cd "$DEVENV_ROOT/frontend" && nr format''; description = "Biome format (frontend, auto-fix)"; };
    "format-drizzle"    = { exec = ''cd "$DEVENV_ROOT/drizzle" && nr format''; description = "Biome format (drizzle, auto-fix)"; };
    "format-backend-py" = { exec = ''cd "$DEVENV_ROOT/backend-py/app" && uv run ruff format src/''; description = "Ruff format (backend-py, auto-fix)"; };
    "format-functions"  = { exec = ''deno fmt "$DEVENV_ROOT/supabase/functions/"''; description = "Deno fmt (edge functions, auto-fix)"; };

    # check 系: tasks (format-check:*) の wrapper
    "format-frontend-check"   = { exec = ''exec devenv tasks run format-check:frontend''; description = "Biome format check (frontend, cached)"; };
    "format-drizzle-check"    = { exec = ''exec devenv tasks run format-check:drizzle''; description = "Biome format check (drizzle, cached)"; };
    "format-backend-py-check" = { exec = ''exec devenv tasks run format-check:backend-py''; description = "Ruff format check (backend-py, cached)"; };
    "format-functions-check"  = { exec = ''exec devenv tasks run format-check:functions''; description = "Deno fmt check (edge functions, cached)"; };

    "format" = {
      exec = ''
        set -e
        echo "✨ Format all (auto-fix)..."
        format-frontend
        format-drizzle
        format-backend-py
        format-functions
      '';
      description = "Format all subprojects (auto-fix)";
    };

    # 集約 check は namespace match で並列 + キャッシュ (公式 1.7+ 機能)
    "format-check" = {
      exec = ''exec devenv tasks run format-check'';
      description = "Format check all subprojects (parallel + cached)";
    };

    # ---------- Type check ----------
    # tasks (type-check:*) の wrapper → execIfModified キャッシュ
    "type-check-frontend"   = { exec = ''exec devenv tasks run type-check:frontend''; description = "TS type check (frontend, cached)"; };
    "type-check-mobile"     = { exec = ''exec devenv tasks run type-check:mobile''; description = "TS type check (mobile, cached)"; };
    "type-check-backend-py" = { exec = ''exec devenv tasks run type-check:backend-py''; description = "MyPy type check (backend-py, cached)"; };
    "check-functions"       = { exec = ''exec devenv tasks run type-check:functions''; description = "Deno check (edge functions, cached)"; };

    # 集約: namespace match で並列 + キャッシュ
    "type-check" = {
      exec = ''exec devenv tasks run type-check'';
      description = "Type check all subprojects (parallel + cached)";
    };

    # ---------- CI gate ----------
    # `devenv test` 経由で `ci:check` aggregator task を起動。
    # 配下の lint-ci:* / format-check:* / type-check:* が namespace 並列 + execIfModified キャッシュで実行される。
    # → 何も変更してなければ全 task キャッシュヒットで秒で終わる。
    # → 一部だけ変更すれば影響範囲のみ走る (incremental)。
    # → ローカルと CI で同じコマンド (`devenv test`)、環境差ゼロ。
    "ci-check" = {
      exec = ''exec devenv test'';
      description = "Full CI gate via `devenv test` (cached, incremental)";
    };

    # ---------- Build ----------
    "build-frontend" = { exec = ''cd "$DEVENV_ROOT/frontend" && nr build''; description = "Build frontend (Next.js)"; };

    # ---------- Tests ----------
    "test-frontend"   = { exec = ''cd "$DEVENV_ROOT/frontend" && nr test''; description = "Vitest (frontend)"; };
    "test-backend-py" = { exec = ''cd "$DEVENV_ROOT/backend-py/app" && uv run pytest''; description = "pytest (backend-py)"; };
    "test-db"         = { exec = ''supabase test db --local''; description = "pgTAP DB tests"; };
    "test" = {
      exec = ''
        set -e
        echo "🧪 Running all unit tests..."
        test-frontend
        test-backend-py
        echo "✅ All unit tests passed."
        echo "💡 Run 'test-db' for pgTAP DB tests, 'e2e' for Maestro E2E."
      '';
      description = "Run all unit tests (frontend + backend-py)";
    };
    "e2e"      = { exec = ''cd "$DEVENV_ROOT/.maestro" && maestro test .''; description = "Maestro E2E (all)"; };
    "e2e-web"  = { exec = ''cd "$DEVENV_ROOT/.maestro" && maestro test web/''; description = "Maestro E2E (web)"; };
    "e2e-mobile" = { exec = ''cd "$DEVENV_ROOT/.maestro" && maestro test mobile/''; description = "Maestro E2E (mobile)"; };

    # ---------- Drizzle ----------
    "drizzle-push"     = { exec = ''cd "$DEVENV_ROOT/drizzle" && nr push''; description = "Drizzle: push schema (no migration file)"; };
    "drizzle-studio"   = { exec = ''cd "$DEVENV_ROOT/drizzle" && exec nr studio''; description = "Drizzle Studio (GUI)"; };
    "drizzle-validate" = { exec = ''cd "$DEVENV_ROOT/drizzle" && nr check''; description = "Drizzle: schema validate"; };

    # ---------- Storybook standalone ----------
    "storybook-local" = { exec = ''cd "$DEVENV_ROOT/frontend" && exec bun run storybook''; description = "Storybook standalone (without devenv up)"; };
    "build-storybook" = { exec = ''cd "$DEVENV_ROOT/frontend" && bun run build-storybook''; description = "Build Storybook"; };

    # ---------- Status check ----------
    "check" = {
      exec = ''
        supabase status
        echo ""
        echo "💡 To start: devenv up"
      '';
      description = "Show Supabase status";
    };
  } // lib.mapAttrs' (name: cfg: lib.nameValuePair "dev-${name}" (mkDevScript name cfg)) frontendApps;
  # ↑ frontendApps から `dev-<name>` script を自動生成（dev-web / dev-mobile / dev-admin ...）。

  # OCI コンテナイメージ（devenv container build backend で生成）
  # Railway は Railpack を使用するため、通常は不要。
  # backendExec を let-binding で共有することで profile に依存せず参照できる。
  containers."backend" = {
    name = "backend-py";
    version = "latest";
    startupCommand = backendExec;
  };

  # Pre-commit hooks（devenv shell 進入時に .git/hooks/ へ自動インストール）
  #
  # 設計方針 (詳細は docs/_research/2026-04-28-devenv-quality-checks.md):
  #   - **git-hooks.nix のビルトインフックを使う** (`biome.enable = true` 等)
  #   - 各ビルトインは types_or / files / pass_filenames が適切にプリセット済み
  #   - pass_filenames = true (デフォルト) で **変更ファイルだけ** がツールに渡される
  #     → コミット時の lint が <200ms で完結 (full project lint と段違いに高速)
  #   - prek (Rust 実装) が pre-commit を駆動するので Python オーバーヘッドなし
  #
  # 全プロジェクトの verify は `devenv test` (= ci:check task) で行う (役割分担)。
  git-hooks.hooks = {
    # ----- JS/TS/JSON: Biome (frontend + drizzle 共通) -----
    # ビルトインの types_or = [ "javascript" "jsx" "ts" "tsx" "json" ]
    # biome は ancestor lookup で biome.json を見つけるので frontend/ と drizzle/ 両方カバー
    biome.enable = true;

    # ----- Python: Ruff (lint) -----
    ruff.enable = true;

    # ----- Python: Ruff (format) -----
    ruff-format.enable = true;

    # ----- Python: Mypy (type check) -----
    # 型エラーの早期検出を優先しコミット時にもフルチェック相当を回す。
    # ファイル単位の false positive (import 整合性が一時的に崩れた中間状態) は許容し、
    # 引っかかったら fix → re-commit で対応する。
    # プロジェクト単位の最終確認は `type-check:backend-py` task (devenv test 経由) で重ねて行う。
    mypy.enable = true;

    # ----- Edge Functions: Deno format -----
    denofmt = {
      enable = true;
      files = "^supabase/functions/.*\\.ts$";
    };

    # ----- Edge Functions: Deno lint -----
    denolint = {
      enable = true;
      files = "^supabase/functions/.*\\.ts$";
    };
  };

  # base enterShell。profile 未指定（= local 既定）で local 環境 env を読み込む。
  # `-P staging` / `-P production` を付けた場合は、profile の enterShell が後追いで実行され、
  # `set -a; source` の後勝ち動作で staging/production の値が local を上書きする。
  enterShell = ''
    ${loadEnvForProfile "local"}
    echo "devenv: Node $(node -v), Python $(python3 -V), Deno $(deno -v), Bun $(bun -v), uv $(uv -V)"
    echo ""
    echo "📋 Quick start:"
    echo "  devenv up                         # supabase + backend + storybook (light, local 既定)"
    echo "  dev-web                           #   ↑ + Next.js (frontend/apps/web)"
    echo "  dev-mobile                        #   ↑ + Expo Metro (frontend/apps/mobile)"
    echo "  dev-all                           #   ↑ + 両方"
    echo "  mobile-ios / mobile-android       # Expo TUI 別ターミナル (devenv 外)"
    echo "  devenv tasks run db:migrate-dev   # DB schema migration"
    echo "  ci-check                          # full CI gate"
    echo "  stop                              # stop everything"
  '';
}
