{ pkgs, config, lib, ... }:

{
  # dotenv 自動読み込みは無効化（各コマンドで dotenvx を明示的に使用する）
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

  # devenv 2.0 の native process manager が以下のプロセスを管理する。
  # process-compose は使わない（process.manager.implementation を指定しないと native が使われる）。
  #
  # NOTE: Supabase (Docker コンテナ群) は devenv 管理対象外。
  # Supabase CLI で独立管理する（`make supabase-start` / `make supabase-stop`）。
  # devenv が管理するのは backend / storybook のみ。
  processes = {
    # FastAPI バックエンド。
    # 前提として Supabase が起動済みであること（`make supabase-start` または `make run`）。
    backend = {
      exec = ''
        set -euo pipefail
        cd "$DEVENV_ROOT/backend-py/app"
        export PYTHONPATH="$DEVENV_ROOT/backend-py/app/src''${PYTHONPATH:+:$PYTHONPATH}"
        dotenvx run \
          -f "$DEVENV_ROOT/env/backend/.env.local" \
          -f "$DEVENV_ROOT/env/.env.secrets" \
          -- bash -c '
            uv sync --group dev &&
            exec uv run uvicorn app:app \
              --proxy-headers --reload \
              --host 0.0.0.0 --port 4040
          '
      '';
      ready.http.get = {
        host = "127.0.0.1";
        port = 4040;
        path = "/healthcheck";
      };
    };

    # Storybook コンポーネントカタログ（DB 非依存、独立起動）。
    # web (Next.js) は `make frontend`、mobile (Expo) は `make mobile*` が担当（devenv 外）。
    # `--ci` を付けて TUI 上でインタラクティブプロンプトが出ないようにする
    # （port 衝突時は別 port に勝手にフォールバックせずエラー終了 → restart で復旧）。
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
  };

  # OCI コンテナイメージ（devenv container build backend で生成）
  # Railway は Railpack を使用するため、通常は不要。
  # Railpack 以外のプラットフォームにデプロイする場合に使用する。
  containers."backend" = {
    name = "backend-py";
    version = "latest";
    startupCommand = config.processes.backend.exec;
  };

  # devenv scripts（devenv profile の bin/ に配置され、PATH で優先される）
  scripts = {
    # dotenvx: pkgs.dotenvx のビルドが壊れているため bun グローバルから実行
    dotenvx.exec = ''
      if [ ! -f "$HOME/.bun/bin/dotenvx" ]; then
        echo "📦 Installing dotenvx..." >&2
        bun install -g @dotenvx/dotenvx >/dev/null 2>&1
      fi
      exec "$HOME/.bun/bin/dotenvx" "$@"
    '';
    # make コマンドのショートカット
    dev.exec = "devenv up";
    lint.exec = "make lint";
    fmt.exec = "make format";
  };

  # Pre-commit hooks（devenv shell 進入時に .git/hooks/ へ自動インストール）
  git-hooks.hooks = {
    frontend-lint = {
      enable = true;
      name = "Frontend Lint (Biome)";
      entry = "make lint-frontend-ci";
      files = "\\.(ts|tsx|js|jsx)$";
      language = "system";
      pass_filenames = false;
    };
    python-lint = {
      enable = true;
      name = "Python Lint (Ruff)";
      entry = "make lint-backend-py-ci";
      files = "\\.py$";
      language = "system";
      pass_filenames = false;
    };
    deno-fmt = {
      enable = true;
      name = "Deno Format Check";
      entry = "deno fmt --check supabase/functions/";
      files = "^supabase/functions/.*\\.ts$";
      language = "system";
      pass_filenames = false;
    };
  };

  enterShell = ''
    # dotenvx を事前インストール（初回のみ）
    if [ ! -f "$HOME/.bun/bin/dotenvx" ]; then
      echo "📦 Installing dotenvx..."
      bun install -g @dotenvx/dotenvx >/dev/null 2>&1
    fi
    echo "devenv: Node $(node -v), Python $(python3 -V), Deno $(deno -v), Bun $(bun -v), uv $(uv -V)"
  '';
}
