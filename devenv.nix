{ pkgs, ... }:

{
  # .env は Docker Compose 用（devenv の dotenv 統合は使わない）
  dotenv.disableHint = true;

  packages = [
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
    dev.exec = "make frontend";
    backend.exec = "make run";
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
