{ pkgs, inputs, ... }:

let
  # process-compose v1.94.0+ (MCP サーバー機能を含む)
  # rolling nixpkgs は v1.87.0 のため unstable から取得
  pkgsUnstable = import inputs.nixpkgs-unstable {
    system = pkgs.system;
    config.allowUnfree = pkgs.config.allowUnfree;
  };
in

{
  # dotenv 自動読み込みは無効化（各コマンドで dotenvx を明示的に使用する）
  dotenv.disableHint = true;

  packages = [
    pkgs.supabase-cli
    pkgs.ni
    pkgs.maestro
    # backend-py のシステム依存（C 拡張・音声ビデオライブラリ）
    pkgs.gcc
    pkgs.gnumake
    pkgs.libedit
    pkgs.libopus
    pkgs.libvpx
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

  # process-compose 設定（MCP サーバー + TCP ソケット）
  process.managers.process-compose = {
    # process-compose v1.94.0+ を使用（MCP サーバー機能対応）
    package = pkgsUnstable.process-compose;
    # TCP 経由で REST API にアクセスできるよう Unix ソケット無効化
    unixSocket.enable = false;

    settings = {
      # MCP サーバーを有効化（process-compose v1.94.0+ の組み込み機能）
      mcp_server = {
        host = "localhost";
        port = 8090;
        transport = "sse";
      };

      # MCP デバッグツール（devenv-tasks を完全バイパスして直接実行）
      # devenv の processes セクションは全て devenv-tasks --mode all 経由になり
      # 長時間プロセス(backend/storybook)の完了待ちで MCP が返らなくなるため
      # settings.processes に直接定義して process-compose がそのまま実行する
      processes = {
        # 全プロセスの状態確認（ヘルスエンドポイント直接確認、port 8080 不使用）
        "get-process-status" = {
          command = ''bash -c 'echo "=== backend (4040) ===" && (curl -sf --max-time 3 http://localhost:4040/healthcheck && echo OK) || echo FAIL; echo "=== storybook (6006) ===" && (curl -sf --max-time 3 http://localhost:6006/ >/dev/null && echo OK) || echo FAIL; echo "=== web (3000) ===" && (curl -sf --max-time 3 http://localhost:3000/ >/dev/null && echo OK) || echo FAIL; echo "=== supabase (54321) ===" && (curl -sf --max-time 3 http://localhost:54321/health >/dev/null && echo OK) || echo FAIL' '';
          disabled = true;
          namespace = "mcp";
          mcp = { type = "tool"; };
        };
        # 指定プロセスのログ取得（ログファイル直接読み取り、port 8080 不使用）
        "get-process-logs" = {
          command = ''bash -c 'LOGFILE="/Users/tknr/Development/shadcn-boilerplate/.devenv/state/process-compose/process-compose.log"; S=$(mktemp /tmp/pc.XXXXXX.py); printf "import sys,json\nfor l in sys.stdin:\n l=l.strip()\n if not l:continue\n try:print(json.loads(l).get(\"message\",\"\"))\n except:pass\n" > "$S"; grep -a "\"process\":\"@{process_name}\"" "$LOGFILE" 2>/dev/null | tail -n @{lines} | python3 "$S" 2>/dev/null; rm -f "$S"' '';
          disabled = true;
          namespace = "mcp";
          mcp = {
            type = "tool";
            arguments = [
              {
                name = "process_name";
                type = "string";
                description = "プロセス名 (backend / storybook / web)";
                required = true;
              }
              {
                name = "lines";
                type = "string";
                description = "取得する行数 (例: 50, 100)";
                required = true;
              }
            ];
          };
        };
        # プロセス再起動（バックグラウンドで port 8080 を呼び出してブロック回避）
        "restart-process" = {
          command = ''bash -c 'curl -sf --max-time 10 -X POST "http://localhost:8080/process/restart/@{process_name}" >/tmp/pc-restart-result 2>&1 & sleep 2; cat /tmp/pc-restart-result 2>/dev/null && echo "Restart requested for @{process_name}" || echo "Restart sent (check process-compose TUI)"' '';
          disabled = true;
          namespace = "mcp";
          mcp = {
            type = "tool";
            arguments = [
              {
                name = "process_name";
                type = "string";
                description = "再起動するプロセス名 (backend / storybook / web)";
                required = true;
              }
            ];
          };
        };
        # プロセス起動（バックグラウンドで port 8080 を呼び出してブロック回避）
        "start-process" = {
          command = ''bash -c 'curl -sf --max-time 10 -X POST "http://localhost:8080/process/start/@{process_name}" >/tmp/pc-start-result 2>&1 & sleep 2; cat /tmp/pc-start-result 2>/dev/null && echo "Start requested for @{process_name}" || echo "Start sent (check process-compose TUI)"' '';
          disabled = true;
          namespace = "mcp";
          mcp = {
            type = "tool";
            arguments = [
              {
                name = "process_name";
                type = "string";
                description = "起動するプロセス名 (backend / storybook / web)";
                required = true;
              }
            ];
          };
        };
      };
    };
  };

  # devenv processes（process-compose 経由で管理）
  processes = {
    # FastAPI バックエンド
    backend = {
      exec = ''
        set -euo pipefail
        cd "$DEVENV_ROOT/backend-py/app"
        export PYTHONPATH="$DEVENV_ROOT/backend-py/app/src''${PYTHONPATH:+:$PYTHONPATH}"
        dotenvx run \
          -f "$DEVENV_ROOT/env/backend/local.env" \
          -f "$DEVENV_ROOT/env/secrets.env" \
          -- bash -c '
            uv sync --group dev &&
            exec uv run uvicorn app:app \
              --proxy-headers --reload \
              --host 0.0.0.0 --port 4040
          '
      '';
      process-compose = {
        readiness_probe = {
          http_get = {
            host = "127.0.0.1";
            port = 4040;
            path = "/healthcheck";
          };
          initial_delay_seconds = 5;
          period_seconds = 30;
          timeout_seconds = 2;
          failure_threshold = 5;
        };
      };
    };

    # Storybook コンポーネントカタログ
    storybook = {
      exec = ''
        cd "$DEVENV_ROOT/frontend"
        exec bun run storybook -- --host 0.0.0.0 --port 6006 --quiet
      '';
      process-compose = {
        readiness_probe = {
          http_get = {
            host = "127.0.0.1";
            port = 6006;
            path = "/";
          };
          initial_delay_seconds = 10;
          period_seconds = 3;
          timeout_seconds = 2;
          failure_threshold = 20;
        };
      };
    };

    # Next.js Web フロントエンド
    web = {
      exec = ''
        cd "$DEVENV_ROOT/frontend"
        dotenvx run \
          -f "$DEVENV_ROOT/env/frontend/local.env" \
          -- nr dev
      '';
      process-compose = {
        readiness_probe = {
          http_get = {
            host = "127.0.0.1";
            port = 3000;
            path = "/";
          };
          initial_delay_seconds = 10;
          period_seconds = 3;
          timeout_seconds = 2;
          failure_threshold = 20;
        };
      };
    };

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
    # backend を起動（devenv up のショートカット）
    services.exec = "devenv up";
    # make コマンドのショートカット
    dev.exec = "make frontend";
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
