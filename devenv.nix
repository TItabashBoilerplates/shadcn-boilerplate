{ pkgs, config, lib, ... }:

let
  # ===== Terraform（HashiCorp 公式配布バイナリ）=====
  #
  # `pkgs.terraform` を使わない理由: Terraform 1.6 以降は BUSL のため nixpkgs が
  # バイナリを再配布できず、**必ずソースからの Go ビルド**になる（devenv shell の初回が
  # 数分〜、ネットワーク前提）。ここでは releases.hashicorp.com の公式 zip を
  # そのまま取り込むことで、ビルド無しで本物の terraform を入れる。
  #
  # OpenTofu ではなく Terraform を使うのは、**HCP Terraform の managed run が
  # terraform バイナリしか実行しない**ため（OpenTofu は state 置き場としては使えるが
  # run / Sentinel / private module registry は Terraform 専用）。
  # 詳細は terraform/README.md「実行バイナリ」。
  #
  # バージョンを上げるときは:
  #   curl -sS https://releases.hashicorp.com/terraform/<V>/terraform_<V>_SHA256SUMS
  #   で hex を取り、SRI（sha256-<base64>）に変換して下表を差し替える。
  terraformVersion = "1.15.8";

  terraformDist = {
    "x86_64-linux" = { platform = "linux_amd64"; hash = "sha256-0lzntpAgE62QXbPS6rC+TNkFiH/oi4GmFxuNVQPDHz0="; };
    "aarch64-linux" = { platform = "linux_arm64"; hash = "sha256-iJHp3O3J47iVC8avnU2K8fTPreMGL1O53EA6ifbOjJw="; };
    "x86_64-darwin" = { platform = "darwin_amd64"; hash = "sha256-4ugS54N3EVm/dY/U5V1tybsI9j4q8sY9ISchgHoCxdw="; };
    "aarch64-darwin" = { platform = "darwin_arm64"; hash = "sha256-8hARDFaYuU2AOnpjzbAlG1RVwVCEFHiAjiu7ND+V7Wg="; };
  };

  terraformCli =
    let
      dist = terraformDist.${pkgs.stdenv.hostPlatform.system}
        or (throw "terraform: 未対応の platform ${pkgs.stdenv.hostPlatform.system}（devenv.nix の terraformDist に追加してください）");
    in
    pkgs.stdenvNoCC.mkDerivation {
      pname = "terraform";
      version = terraformVersion;

      src = pkgs.fetchurl {
        url = "https://releases.hashicorp.com/terraform/${terraformVersion}/terraform_${terraformVersion}_${dist.platform}.zip";
        inherit (dist) hash;
      };

      nativeBuildInputs = [ pkgs.unzip ];
      sourceRoot = ".";

      installPhase = ''
        runHook preInstall
        install -Dm755 terraform "$out/bin/terraform"
        runHook postInstall
      '';

      meta = {
        description = "HashiCorp Terraform (official prebuilt binary)";
        homepage = "https://www.terraform.io/";
        # BUSL-1.1。社内利用は許諾範囲内だが、nixpkgs 的には unfree 扱いになるライセンス。
        # devenv.yaml で allow_unfree: true 済み。
        license = lib.licenses.bsl11;
        mainProgram = "terraform";
      };
    };

  # 環境ごとの **非機密** env ファイル読み込み（ENV 駆動）。Doppler（loadDopplerByEnv）と同じく
  # 環境変数 ENV を見て読み込む対象を切り替える。env/ の構成は env/README.md を参照。
  #
  # ここで読むのは非機密 config（URL/port 等）の env/<svc>/.env.$ENV のみ。
  # **シークレットは Doppler が唯一のソース**（loadDopplerByEnv）。`.env.secrets` のファイル
  # フォールバックは廃止した（ユーザー方針）。bash パーサがクォート・エスケープを正しく処理する。
  # `[ -f X ] && . X` で gard しているので env ファイル未配置でもエラーにならない。
  loadEnvFilesForEnv = ''
    set -a
    for _svc in backend frontend migration; do
      _f="$DEVENV_ROOT/env/$_svc/.env.''${ENV:-local}"
      [ -f "$_f" ] && . "$_f"
    done
    unset _svc _f
    set +a
  '';

  # Doppler からのシークレット読み込み（Doppler-first・ファイルフォールバック付き・ENV 駆動）。
  #
  # 方針: **シークレットだけ Doppler、非機密 config はファイル**。
  #   - シークレット（API キー等）→ **Doppler が唯一のソース**。ファイルフォールバックは廃止。
  #   - 非機密の環境変数（ローカル Supabase URL / backend URL / port 等。
  #     env/{backend,frontend,migration}/.env.$ENV）→ 引き続きファイルで管理（loadEnvFilesForEnv）。
  #
  # **どの Doppler config を参照するかは環境変数 ENV で切り替える**。本リポジトリの deploy
  # スクリプト（scripts/supabase/*.sh）も `ENV="${ENV:-}"` で local/staging/production を
  # 切り替えており、その ENV 規約にそのまま合わせる:
  #   ENV=local（または未設定） → --config を付けず `doppler setup` のローカル紐付け config
  #                               （公式推奨は dev_personal）を使う。
  #   ENV=dev                   → --config dev
  #   ENV=staging               → --config stg
  #   ENV=production            → --config prd
  #   それ以外                  → --config "$ENV"（そのまま config 名として扱う）
  #
  # 動作: doppler が認証・setup 済みなら secrets を取得して env に注入する。
  # **取得できない場合（未ログイン / 未 setup / token 無し）はフォールバックが無いので、
  # シークレット未ロードを明示警告する**（.claude/rules/error-handling.md: 唯一のソースが
  # 失敗したらサイレントにしない）。shell 自体は止めない（doppler login を打てるように）。
  # `--format env` は KEY="value" 形式なので bash パーサがクォート・エスケープを正しく扱う。
  loadDopplerByEnv = ''
    if [ -n "''${DOPPLER_SKIP:-}" ]; then
      # GitHub Actions は **Doppler → GitHub Secrets のネイティブ sync** 済みの値を
      # workflow の secrets 参照で job env から受け取る。よって Actions 内で doppler CLI を
      # 叩く必要が無い（token も不要）。取得失敗の警告を出さないよう明示的にスキップする。
      # 詳細: .claude/skills/doppler/references/cicd.md
      echo "🔕 Doppler スキップ (DOPPLER_SKIP=''${DOPPLER_SKIP}) — シークレットは実行環境から供給される前提"
    elif command -v doppler >/dev/null 2>&1; then
      _dpl_args=""
      _dpl_label="local scope (doppler setup)"
      case "''${ENV:-local}" in
        local|"") ;;
        dev|development)     _dpl_args="--config dev"; _dpl_label="config: dev (ENV=$ENV)" ;;
        stg|staging)         _dpl_args="--config stg"; _dpl_label="config: stg (ENV=$ENV)" ;;
        prd|prod|production) _dpl_args="--config prd"; _dpl_label="config: prd (ENV=$ENV)" ;;
        *)                   _dpl_args="--config ''${ENV}"; _dpl_label="config: ''${ENV} (ENV=$ENV)" ;;
      esac
      if _doppler_env="$(cd "$DEVENV_ROOT" && doppler secrets download --no-file --format env $_dpl_args 2>/dev/null)"; then
        set -a
        eval "$_doppler_env"
        set +a
        unset _doppler_env
        echo "🔐 Doppler secrets loaded ($_dpl_label)"
      else
        echo "⚠️  シークレット未ロード: Doppler から取得できません（$_dpl_label）。" >&2
        echo "    フォールバックは廃止済み。'doppler login' → 'doppler setup' を実行してください。" >&2
        echo "    （GitHub Actions は Doppler→GitHub sync 済みの secrets を使うため DOPPLER_SKIP=1 で本処理をスキップします）" >&2
        echo "    詳細: .claude/skills/doppler/SKILL.md" >&2
      fi
      unset _dpl_args _dpl_label
    else
      echo "⚠️  doppler CLI が見つかりません（devenv shell 内で実行していますか）。" >&2
    fi
  '';

  # backend (api) service の exec body。
  # local profile の `processes.backend` と base の `containers.backend` の両方から
  # 参照したいので let-binding で一度だけ定義する。
  #
  # backend-py は uv workspace 化済み (apps/api, apps/mcp, packages/core)。
  # ワークスペースルートで `uv sync --all-packages` すれば api と core が editable install
  # されるため、`api.app:app` は PYTHONPATH 操作なしで解決できる。
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
    cd "$DEVENV_ROOT/backend-py"
    uv sync --all-packages --group dev
    exec "$UV_PROJECT_ENVIRONMENT/bin/uvicorn" api.app:app \
      --proxy-headers --reload \
      --host 0.0.0.0 --port 4040
  '';

  # MCP server skeleton の exec body。`apps/mcp/` は雛形のみで実装はまだない。
  # `processes.backend-mcp` は `start.enable = false` (opt-in)。
  # 実装後は `uv run --package mcp-server mcp-server` 等に差し替え、ready probe を設定する。
  backendMcpExec = ''
    set -euo pipefail
    cd "$DEVENV_ROOT/backend-py"
    uv sync --all-packages --group dev
    exec uv run --package mcp-server python -c \
      'print("mcp-server placeholder; implement apps/mcp/src/mcp_server/main.py")'
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
    # Tauri の devUrl（src-tauri/tauri.conf.json）と一致させること。
    # `dev-desktop` は Vite だけを起動する。ネイティブウィンドウを出すのは
    # `cd frontend/apps/desktop && nr tauri:dev`（Rust のビルドが要るため devenv 外）。
    desktop = { port = 1420; };
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
  #
  # 設計: dev サーバー本体は **foreground で直接 exec** する（`nr dev` / `nr start` 等）。
  # backend + storybook だけ devenv supervisor で detached 起動し、Next.js / Expo Metro の
  # ような「開発者が一番見たいプロセス」は素のまま foreground に置いて
  # 標準の dev server UX（カラフルなログ・hot reload・キーバインド）をそのまま活かす。
  #
  # frontendApps の各エントリの `exec` を process spec と dev script の両方で再利用するため、
  # mobile の `exec nr start` のような上書きも自動で反映される。
  #
  # 終了時の Supabase / detached プロセスの停止は手動運用（`supabase-stop` / `stop` script）。
  mkDevScript = name: cfg:
    let
      appExec = cfg.exec or ''
        cd "$DEVENV_ROOT/frontend/apps/${name}"
        exec nr dev
      '';
    in {
      exec = ''
        set -e
        echo "🚀 Ensuring backend + storybook are running (detached)..."
        devenv up -d backend storybook 2>/dev/null || true
        echo "▶️  Starting ${name} dev server (foreground)..."
        ${appExec}
      '';
      description = "Backend + storybook (detached) + ${name} dev server (foreground)";
    };

  # 全アプリを並列起動する `dev-all` は複数 dev server を 1 ターミナルで束ねる必要があるので
  # devenv の supervisor を使い続ける。`start.enable = false` を CLI 引数だけでは上書きできない
  # devenv 2.0 native の仕様回避として `--option` を併用する。
  # 詳細: docs/_research/2026-04-28-devenv-process-start-enable.md
  devAllExec =
    let
      appNames = lib.attrNames frontendApps;
      overrides = lib.concatMapStringsSep " " (n:
        ''--option "processes.${n}.start.enable:bool" true''
      ) appNames;
    in ''
      exec devenv ${overrides} up backend storybook ${lib.concatStringsSep " " appNames}
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
    # Doppler CLI（シークレット管理）。secrets の単一ソース化に向けた下準備。
    # 使い方・移行方針は .claude/skills/doppler/SKILL.md を参照。
    pkgs.doppler
    # infra-bootstrap（scripts/infra/*）が使う CLI。
    #   - gh : GitHub environments / 承認ゲート / secret 設定（github.sh）
    #   - jq : 各 API レスポンスの JSON 整形（supabase/vercel/github）
    # Vercel の **プロビジョニング**は CLI バグ（vercel/vercel#15763: preview env が
    # --non-interactive でも対話を要求 / rootDirectory 設定フラグ欠如）を避けるため
    # REST API(curl) 直叩き。日常運用向けの vercel CLI 自体は `scripts.vercel` で提供する。
    # backend も Vercel（Dockerfile.vercel コンテナ）へデプロイするため、デプロイ用 CLI は REST API 直叩きで代替。
    pkgs.gh
    pkgs.jq
    # IaC（terraform/）の実行バイナリ。公式配布 zip をそのまま取り込む（let 節の terraformCli）。
    # OpenTofu に切り替えたい場合は pkgs.opentofu に差し替え、
    # terraform/.terraform.lock.hcl を作り直して TF_BIN=tofu を export する
    # （registry が registry.terraform.io → registry.opentofu.org に変わるため）。
    terraformCli

    # ===== 外部サービス CLI（nixpkgs 収録ぶん）=====
    # nixpkgs に無いものは devenv script (bunx 経由) で提供する。一覧と選定理由は
    # docs/_research/2026-08-06-service-clis.md を参照。
    #
    # Stripe CLI（決済）。`stripe login` / `stripe listen --forward-to <edge function>` で
    # Webhook をローカル転送し、`stripe trigger <event>` でイベントを再現する。
    # Webhook ハンドラは Edge Functions 側に置く（.claude/rules/supabase-first.md）。
    pkgs.stripe-cli
    # Sentry CLI（監視・エラートラッキング）。source map / debug file のアップロードと
    # release / deploy 作成に使う。CI からも同じバイナリを呼べるよう nix で固定する。
    pkgs.sentry-cli
    # LiveKit CLI（リアルタイム音声・映像）。backend-py の AI/ML 機能が LiveKit を使う。
    # `lk token create` / `lk room list` などローカル検証用。
    pkgs.livekit-cli
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
  # ENV=local として loadEnvFilesForEnv を実行し、`start.enable = true` のプロセスが立ち上がる。
  # `supabase:start` task は backend process の `before` に登録されているので、
  # `devenv up` 一発で Supabase → backend の順に起動する。
  #
  # 起動制御:
  #   - `start.enable = true` (default): `devenv up` で自動起動 (= backend / storybook)
  #   - `start.enable = false`         : opt-in（= frontendApps の各エントリ）
  #     devenv 2.0 native process manager は `devenv up <name>` の引数で渡しても
  #     `start.enable = false` のプロセスは起動しない（NotStarted で登録するのみ）。
  #     - `dev-<name>` script: process としては起動せず、detached の backend + storybook
  #       だけ devenv に管理させて、dev server 本体は素の `nr dev` を foreground exec する。
  #     - `dev-all` / 直接 `devenv up <name>`: `--option processes.<name>.start.enable:bool true`
  #       で上書きする（mkDevScript / devAllExec を参照）。
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

    # ----- Opt-in: backend-py モノレポの追加サーバ -----

    # MCP server (skeleton)。実装後 `start.enable = true` に切り替え + ready probe 追加。
    backend-mcp = {
      exec = backendMcpExec;
      start.enable = false;
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
  # `loadEnvFilesForEnv` は `[ -f X ] && . X` で gard されているので env ファイル未配置でも
  # エラーにならない。env ファイルを `env/{backend,frontend,migration}/.env.<ENV>` に
  # 配置すれば即 `-P <profile>`（= 該当 ENV）で読み込まれる。env/ の構成は env/README.md。
  #
  # 新環境を追加したい場合:
  #   1. env/{backend,frontend,migration}/.env.<name> を作成（任意・後置きでも OK）
  #   2. このブロックに profile を 1 つ追加（`export ENV="<name>"` + 各ローダ）
  #
  # 各 profile は `export ENV=<name>` してから loadEnvFilesForEnv（ENV 別の非機密 config）→
  # loadDopplerByEnv（ENV 別の Doppler シークレット）を呼ぶ。profile の enterShell は base
  # enterShell の後に走るので、ここで設定した ENV・config・Doppler が後勝ちで最終値になる。
  profiles = {
    # dev 環境（共有開発インスタンス・チーム用ステージなど）。
    dev.module.enterShell = ''
      export ENV="dev"
    '' + loadEnvFilesForEnv + loadDopplerByEnv;

    # staging 環境（マイグレーション・デプロイ等のリモート操作用）。
    staging.module.enterShell = ''
      export ENV="staging"
    '' + loadEnvFilesForEnv + loadDopplerByEnv;

    # production 環境（マイグレーション・デプロイ等のリモート操作用）。
    production.module.enterShell = ''
      export ENV="production"
    '' + loadEnvFilesForEnv + loadDopplerByEnv;

    # ===== android: Expo (React Native) の Android ネイティブビルド toolchain =====
    #
    # **opt-in profile にしている理由**: JDK 17 + Android SDK (platform / build-tools /
    # platform-tools / cmdline-tools / cmake) + NDK r27b で closure が数 GB になる。
    # base に入れると web / backend しか触らない開発者と CI まで全員がダウンロードする羽目に
    # なるため、Android を触るときだけ `-P android` で有効化する。
    #
    # 使い方（ENV profile とは直交するので併用できる）:
    #   devenv shell -P android              # Android toolchain 入りの shell に入る
    #   devenv shell -P android -- mobile-android-run
    #   devenv shell -P android -P staging   # staging env + Android toolchain
    #   devenv shell -P android-emulator     # ↑ + エミュレータ + system image（さらに重い）
    #
    # バージョンは **react-native 0.86 の版数カタログに厳密に一致させている**
    # (frontend/node_modules/react-native/gradle/libs.versions.toml):
    #   minSdk 24 / targetSdk 36 / compileSdk 36 / buildTools 36.0.0 / ndk 27.1.12297006
    #   / AGP 8.12.0 / Kotlin 2.1.20 / Java 17
    # nixpkgs の Android SDK は **read-only な /nix/store 上に構成される**ため、Gradle が
    # 「無いバージョンを sdkmanager で追加インストール」する救済が効かない。**版数がズレると
    # そのままビルド失敗になる**ので、react-native を上げたら上記 toml を見て必ず追従すること。
    #
    # 前提: devenv.yaml の `nixpkgs.allow_unfree: true`（Android SDK は unfree ライセンス）。
    android.module = {
      android = {
        enable = true;

        # JDK 17 (`languages.java.jdk.package`) を既定にする公式スイッチ。
        # 副作用として `languages.javascript.npm.enable` も立つ（本リポジトリの既定は bun だが、
        # Expo CLI / autolinking が npx 経由の呼び出しをするので入っていて困らない）。
        reactNative.enable = true;

        # compileSdk / targetSdk = 36。35 は一部ライブラリが compileSdk 35 のまま参照するため同梱。
        platforms.version = [ "35" "36" ];

        # 先頭要素が GRADLE_OPTS の aapt2 override と LD_LIBRARY_PATH に使われるので、
        # react-native が要求する 36.0.0 を必ず先頭に置く。
        buildTools.version = [ "36.0.0" ];

        # reanimated / worklets / expo-modules-core / screens が externalNativeBuild.cmake を持つので
        # NDK は必須。バージョンは react-native の ndkVersion と一致させる。
        ndk.enable = true;
        ndk.version = [ "27.1.12297006" ];

        # 上記ライブラリはいずれも cmake の version を明示していない = AGP 8.x の既定 3.22.1 が使われる。
        cmake.version = [ "3.22.1" ];

        # 重い & 実機 / 既存エミュレータでは不要。必要なら `-P android-emulator` を使う。
        emulator.enable = false;
        systemImages.enable = false;

        # Android SDK sources と legacy add-on は Expo のビルドに不要（ダウンロード削減）。
        sources.enable = false;
        googleAPIs.enable = false;
        googleTVAddOns.enable = false;
        extras = [ ];
      };

      # devenv の android モジュールが設定するのは ANDROID_HOME だけ。Expo CLI / Gradle には
      # ANDROID_SDK_ROOT を見る経路も残っているので同じ値を明示的に通す（食い違うと AGP が警告する）。
      #
      # ⚠️ `env.ANDROID_SDK_ROOT = config.env.ANDROID_HOME` と書いてはいけない。profile module 内から
      # マージ後の `config.env` を参照しつつ `env` を定義すると評価が循環し、devenv が
      # **エラーも出さず profile を丸ごと無視する**（`devenv info -P android` が env を一切
      # 表示しなくなるだけ、という気づきにくい壊れ方をする）。shell 変数として展開すれば回避できる。
      enterShell = ''
        export ANDROID_SDK_ROOT="$ANDROID_HOME"
      '';

      scripts = {
        # CNG (Continuous Native Generation): android/ はコミットせず毎回生成する。
        # expo run:android は内部で prebuild → Gradle assembleDebug → adb install まで行う。
        "mobile-android-run" = {
          exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx expo run:android "$@"'';
          description = "Build & install the Android app locally (expo run:android)";
        };

        "mobile-android-prebuild" = {
          exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx expo prebuild --platform android "$@"'';
          description = "Generate the native Android project (expo prebuild, CNG)";
        };

        # クラウドを使わないローカル EAS ビルド。frontend/apps/mobile/eas.json の
        # profile 定義が前提（未作成なら eas-cli が案内を出す）。
        #
        # ⚠️ npm パッケージ名は **`eas-cli`**（bin 名が `eas`）。`nlx eas` と書くと bunx が
        # npm 上の**無関係な `eas` パッケージ**（"Embedded Async Simple Javascript templating",
        # bin 無し）を解決してしまうので必ず `nlx eas-cli` と書くこと。
        # バージョンは固定しない: Expo 公式が「eas-cli を project dependency に入れるのは
        # dependency conflict を招くので強く非推奨」としており、pin したい場合の正規経路は
        # eas.json の `cli.version` フィールド（https://docs.expo.dev/eas/json/）。
        "build-mobile-android-local" = {
          exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx eas-cli build --platform android --local "$@"'';
          description = "Build mobile (Android) via EAS on this machine (--local)";
        };

        # toolchain が期待どおりに解決できているかの自己診断。
        # 「Gradle が SDK を見つけられない」系の切り分けを最初の 1 コマンドで終わらせる。
        "android-info" = {
          exec = ''
            set -u
            echo "JAVA_HOME         = ''${JAVA_HOME:-<unset>}"
            echo "java              = $(java -version 2>&1 | head -1)"
            echo "ANDROID_HOME      = ''${ANDROID_HOME:-<unset>}"
            echo "ANDROID_SDK_ROOT  = ''${ANDROID_SDK_ROOT:-<unset>}"
            echo "ANDROID_NDK_ROOT  = ''${ANDROID_NDK_ROOT:-<unset>}"
            echo "adb               = $(adb --version 2>/dev/null | head -1)"
            echo "platforms         = $(ls "$ANDROID_HOME/platforms" 2>/dev/null | tr '\n' ' ')"
            echo "build-tools       = $(ls "$ANDROID_HOME/build-tools" 2>/dev/null | tr '\n' ' ')"
            echo "ndk               = $(ls "$ANDROID_HOME/ndk" 2>/dev/null | tr '\n' ' ')"
            echo "cmake             = $(ls "$ANDROID_HOME/cmake" 2>/dev/null | tr '\n' ' ')"
          '';
          description = "Print the resolved Android/JDK toolchain (troubleshooting)";
        };
      };
    };

    # android + エミュレータ / system image。実機も既存の Android Studio エミュレータも無い場合に使う。
    # system image は 1 プラットフォーム × 1 ABI でも GB 級なので、`android` から分離している。
    # NOTE: 親 profile が platforms.version を定義しているため、ここで再定義すると listOf が
    # **連結**されてしまう。system image を絞りたいときは abis / systemImageTypes 側で調整すること。
    # ===== store-listing: ストア掲載画像の撮影・生成 toolchain =====
    #
    # **ストアへの反映自体には何も要らない**（`store.sh` の反映スクリプトは Node と
    # fetch だけで動く）。この profile が要るのは**画像を作る側**の 2 つ:
    #   - chromium        : Storybook から撮る経路（screenshots-storybook）が使うブラウザ。
    #                       playwright-core はブラウザを自動 DL しない軽量版なので、
    #                       実行体をここで宣言的に供給する（各自の Chrome 有無に依存させない）。
    #   - imagemagick     : Play のアイコン縮小（512x512）とフィーチャーグラフィックの生成
    #
    # 使い方:
    #   devenv shell -P store-listing -- screenshots-storybook
    #   devenv shell -P store-listing -- build-play-feature-graphic
    #   # iOS の実機撮影は macOS + Xcode が必要（Linux では --platform android のみ）
    #   # Android のエミュレータが要る場合は -P android-emulator と併用する
    #
    # > 以前は fastlane（deliver / supply）でアップロードしていたが、Ruby ランタイム
    # > 一式を引き込むわりに **iPad の画像を iPhone のセットへ入れる**（deliver は
    # > 解像度から端末クラスを推定する）などの取り違えが起きるため、App Store Connect /
    # > Play の API を直接叩く実装（`scripts/mobile/store.sh`）に置き換えた。
    store-listing.module = {
      packages = [ pkgs.chromium pkgs.imagemagick ];
    };

    android-emulator = {
      extends = [ "android" ];
      module = {
        android = {
          emulator.enable = true;
          systemImages.enable = true;
          systemImageTypes = [ "google_apis" ];
          abis = [ "x86_64" ];
        };
      };
    };

    # ===== desktop: Tauri v2（apps/desktop）のネイティブビルド toolchain =====
    #
    # **opt-in profile にしている理由**: Linux で Tauri をビルドするには WebKitGTK と
    # GTK3 の開発ヘッダが要り、closure が数 GB になる。web / mobile しか触らない開発者と
    # CI に負わせる理由が無いので、デスクトップを触るときだけ有効化する（android と同じ方針）。
    #
    #   devenv shell -P desktop                    # Tauri toolchain 入りの shell
    #   devenv shell -P desktop -- bash -c 'cd frontend/apps/desktop && nr tauri:dev'
    #   devenv shell -P desktop -- bash -c 'cd frontend/apps/desktop && nr tauri:build'
    #
    # **macOS / Windows ではこの profile は不要**（Xcode Command Line Tools / MSVC +
    # WebView2 という OS 側の前提だけで足りる）。ここで入れているのは
    # **Linux の WebKitGTK 依存**であり、Tauri 公式の Linux 前提条件に対応する。
    # @see https://v2.tauri.app/start/prerequisites/
    #
    # ⚠️ これらが無いと `cargo check` の時点で
    #    「HINT: you may need to install a package such as glib-2.0」等で落ちる
    #    （Rust さえあればビルドできる、ではない）。
    desktop.module = { pkgs, ... }: {
      packages = with pkgs; [
        # Tauri 本体（wry / tao）がリンクする WebView とウィンドウ系。
        # webkitgtk は **abi=4.1 の派生**を使う（4.0 は EOL で Tauri 2 が要求しない）。
        webkitgtk_4_1
        gtk3
        libsoup_3
        glib-networking

        # ⚠️ gtk3 / webkitgtk からの伝播に頼らず **明示的に並べる**。
        # `cargo check` は `glib-2.0.pc` `cairo.pc` 等を pkg-config で直接引くため、
        # 伝播が効かない構成に変わった瞬間に
        #   「HINT: you may need to install a package such as glib-2.0」
        # で落ちる。実際にこのメッセージで詰まった。
        glib
        cairo
        pango
        gdk-pixbuf
        atk

        # ビルド時に pkg-config でヘッダを探すため必須
        pkg-config

        # Tauri 公式の Linux 前提（https://v2.tauri.app/start/prerequisites/）:
        #   libayatana-appindicator3 … システムトレイ
        #   libxdo(xdotool)          … ウィンドウ操作
        libayatana-appindicator
        xdotool

        # AppImage / deb / rpm のバンドルに使う
        openssl
        librsvg
        patchelf
      ];

      languages.rust.enable = true;
    };
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

    # Doppler 初期セットアップ（init）。supabase:start 等と同様にブートストラップに組み込む。
    # `doppler setup` は doppler.yaml に基づきローカルを project/config に紐付ける（idempotent）。
    # `doppler login`（ブラウザ認証）は対話操作なので自動化しない → 未ログイン時はこの task は
    # 静かに no-op し、enterShell の loadDopplerByEnv が「⚠️ シークレット未ロード」で login を促す。
    # 旧 setup:secrets（.env.secrets 雛形コピー）は廃止済み（シークレットは Doppler 管理）。
    "setup:doppler" = {
      exec = ''
        command -v doppler >/dev/null 2>&1 || exit 0
        # login 済みなら doppler.yaml の紐付けを適用（未 login / placeholder project なら静かに諦める）
        doppler setup --no-interactive --silent >/dev/null 2>&1 || true
        exit 0
      '';
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

    # backend-py workspace deps 同期。
    # uv workspace 化したので `--all-packages` で apps/api, apps/mcp, packages/core の
    # editable install をまとめて行う。`--all-groups` で root の dev group も入る。
    "setup:install-backend" = {
      exec = ''
        cd "$DEVENV_ROOT/backend-py"
        echo "📦 Installing backend-py workspace dependencies..."
        uv sync --all-packages --all-groups --frozen || {
          echo ""
          echo "⚠️  uv sync failed (lockfile may be out of sync)."
          echo "   Run 'cd backend-py && uv lock && uv sync --all-packages --all-groups' manually."
          exit 1
        }
      '';
      execIfModified = [
        "backend-py/uv.lock"
        "backend-py/pyproject.toml"
        "backend-py/apps/api/pyproject.toml"
        "backend-py/apps/mcp/pyproject.toml"
        "backend-py/packages/core/pyproject.toml"
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
    #
    # リモート適用時の接続先の受け渡しについて（実測に基づく設計）:
    #
    # devenv の enterShell は `set -a; . env/<svc>/.env.$ENV` を行うため、**その ENV の env ファイルが
    # 存在する場合、外から渡した同名変数は上書きされる**。実測:
    #   ENV 未指定  → POSTGRES_URL は env/*/.env.local の 127.0.0.1:54322 に上書きされる
    #   ENV=production → env/*/.env.production が無いので外から渡した値が残る
    # つまり ENV に依存した「上書きされない」前提は、将来 .env.<ENV> を置いた瞬間に壊れる。
    #
    # そこで **devenv が定義しない名前** `MIGRATE_POSTGRES_URL` を輸送用に使い、ここで最後に
    # POSTGRES_URL へ反映する。この名前は enterShell も env ファイルも触らないため、
    # ENV の解決結果に関わらず確実に伝わる（実測で確認済み）。
    #
    # ガード: リモート適用の意図が明示されている（MIGRATE_POSTGRES_URL あり、または ENV≠local）
    # のに接続先がローカル値なら中止する。「リモートに流したつもりが実はローカル」を静かに通さない。
    # 値（パスワードを含む）は表示せず host:port だけ出す。
    "db:migrate-deploy".exec = ''
      set -euo pipefail
      cd "$DEVENV_ROOT/drizzle"

      _remote_intent=0
      if [ -n "''${MIGRATE_POSTGRES_URL:-}" ]; then
        export POSTGRES_URL="$MIGRATE_POSTGRES_URL"
        _remote_intent=1
      fi
      [ "''${ENV:-local}" != "local" ] && _remote_intent=1

      if [ -z "''${POSTGRES_URL:-}" ]; then
        echo "✗ 接続先が未設定です（POSTGRES_URL / MIGRATE_POSTGRES_URL のいずれも空）。" >&2
        exit 1
      fi
      if [ "$_remote_intent" = "1" ]; then
        case "$POSTGRES_URL" in
          *127.0.0.1*|*localhost*)
            echo "✗ リモート適用の指定（ENV=''${ENV:-local}）なのに接続先がローカル値です。" >&2
            echo "  リモートに適用されないため中止します。接続先は MIGRATE_POSTGRES_URL で渡してください。" >&2
            echo "  例: MIGRATE_POSTGRES_URL=\"\$SECRET_URL\" ENV=production devenv tasks run db:migrate-deploy" >&2
            exit 1 ;;
        esac
      fi
      echo "🚀 Deploying migrations... (ENV=''${ENV:-local}, target=$(printf '%s' "$POSTGRES_URL" | sed -E 's|^[^@]*@||; s|[/?].*$||'))"
      nr migrate:pre
      nr migrate
      nr migrate:post
    '';

    # local 環境のフルフロー: migration → 型生成。
    # `migrate-dev` という慣用名なのでこちらが「ユーザーが普段叩くやつ」。
    # 型生成・コピーは model:build に委譲し DRY を担保 (重複定義しない)。
    "app:migrate-dev" = {
      exec = ''
        set -euo pipefail
        echo "🚀 Full migrate-dev pipeline..."
        cd "$DEVENV_ROOT/drizzle"
        nr migrate:pre
        nr generate
        nr migrate
        nr migrate:post
        cd "$DEVENV_ROOT"
        echo "🔧 Generating types from migrated schema..."
        devenv tasks run model:build
        echo "✨ Migration + type generation done!"
      '';
      after = [ "supabase:start" ];
    };

    # ---------- Type/Model 生成 ----------
    # 注: コピー先 (frontend/packages/db-schema/src/schema, supabase/functions/shared/drizzle)
    # は auto-generated。コピー前に rm -rf でゴーストファイル (削除されたテーブル等) を一掃する。
    "model:frontend" = {
      exec = ''
        set -euo pipefail
        mkdir -p "$DEVENV_ROOT/frontend/packages/types"
        supabase gen types typescript --local > "$DEVENV_ROOT/frontend/packages/types/schema.ts"
        echo "🔧 Copying Drizzle schema to @workspace/db-schema..."
        rm -rf "$DEVENV_ROOT/frontend/packages/db-schema/src/schema"
        mkdir -p "$DEVENV_ROOT/frontend/packages/db-schema/src/schema"
        cp -r "$DEVENV_ROOT/drizzle/schema/"* "$DEVENV_ROOT/frontend/packages/db-schema/src/schema/"
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
        rm -rf "$DEVENV_ROOT/supabase/functions/shared/drizzle"
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
    # scripts/supabase/deploy-functions.sh に一本化している。
    # 以前はここに関数名（watermark / stripe-*）を列挙していたが、**このリポジトリに実在しない**
    # 関数を指しており、実在する helloworld / onesignal-send / onesignal-webhooks は
    # 一つもデプロイされない状態だった。引数なしの `functions deploy` が
    # supabase/functions/ 配下を全てデプロイするので、関数追加時の変更も不要。
    # verify_jwt は関数ごとに config.toml の [functions.<name>] で指定する
    # （`--no-verify-jwt` を全関数に一律で付けるのは誤り）。
    "deploy:functions".exec = ''exec ./scripts/supabase/deploy-functions.sh'';

    "deploy:config".exec = ''exec ./scripts/supabase/deploy-config.sh'';
    "deploy:buckets".exec = ''exec ./scripts/supabase/deploy-buckets.sh'';
    "deploy:link".exec = ''exec ./scripts/supabase/link.sh'';
    "deploy:supabase".exec = ''exec ./scripts/supabase/deploy.sh'';

    # ---------- Quality CI gate（execIfModified キャッシュ + namespace 並列）----------
    # 設計方針 (詳細は docs/_research/2026-04-28-devenv-quality-checks.md):
    #   - **コミット時の差分チェック**は git-hooks (pre-commit) が担当（変更ファイルだけ）
    #   - **CI / 手動 verify** は ここの tasks が担当（execIfModified で incremental skip）
    #   - `ci:check` aggregator が全 verify task を束ねる。`ci-check` script と CI の両方が
    #     `devenv tasks run ci:check` を呼ぶ → ローカルと CI で検査対象が完全一致
    #     （`devenv test` には紐付けない。理由は "ci:check" task のコメント参照）
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
      exec = ''cd "$DEVENV_ROOT/backend-py" && uv run ruff check apps packages'';
      execIfModified = [
        "backend-py/apps/*/src/**/*.py"
        "backend-py/packages/*/src/**/*.py"
        "backend-py/pyproject.toml"
        "backend-py/apps/*/pyproject.toml"
        "backend-py/packages/*/pyproject.toml"
      ];
    };
    "lint-ci:functions" = {
      exec = ''deno lint "$DEVENV_ROOT/supabase/functions/"'';
      execIfModified = [
        "supabase/functions/**/*.ts"
        "supabase/functions/**/deno.json"
      ];
    };
    # ⚠️ 新しいアプリを apps/ に足したら**必ずここにも足す**。
    # 足し忘れても ci-check は緑のままなので、FSD 境界が検査されていないことに
    # 気づけない（実際に apps/desktop 追加時に漏れた）。
    # また各アプリの eslint.config.mjs には **パーサと import/resolver の両方**が
    # 必要で、resolver が無いと `@/...` を解決できず boundaries が
    # **external とみなして黙って飛ばす**（エラーにならない）。
    "lint-ci:fsd" = {
      exec = ''
        cd "$DEVENV_ROOT/frontend/apps/web" && nr lint:fsd
        cd "$DEVENV_ROOT/frontend/apps/mobile" && nr lint:fsd
        cd "$DEVENV_ROOT/frontend/apps/desktop" && nr lint:fsd
      '';
      execIfModified = [
        "frontend/apps/web/**/*.ts"
        "frontend/apps/web/**/*.tsx"
        "frontend/apps/mobile/**/*.ts"
        "frontend/apps/mobile/**/*.tsx"
        "frontend/apps/desktop/**/*.ts"
        "frontend/apps/desktop/**/*.tsx"
        "frontend/apps/web/steiger.config.*"
        "frontend/apps/mobile/steiger.config.*"
        "frontend/apps/*/eslint.config.mjs"
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
      exec = ''cd "$DEVENV_ROOT/backend-py" && uv run ruff format --check apps packages'';
      execIfModified = [
        "backend-py/apps/*/src/**/*.py"
        "backend-py/packages/*/src/**/*.py"
        "backend-py/pyproject.toml"
        "backend-py/apps/*/pyproject.toml"
        "backend-py/packages/*/pyproject.toml"
      ];
    };
    "format-check:functions" = {
      exec = ''deno fmt --check "$DEVENV_ROOT/supabase/functions/"'';
      execIfModified = [
        "supabase/functions/**/*.ts"
        "supabase/functions/**/deno.json"
      ];
    };
    # IaC（terraform/）。TF_BIN で OpenTofu にも切り替えられる（既定は terraform）。
    "format-check:terraform" = {
      exec = ''cd "$DEVENV_ROOT/terraform" && ''${TF_BIN:-terraform} fmt -check -recursive'';
      execIfModified = [
        "terraform/**/*.tf"
        "terraform/**/*.tfvars"
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
    # `nlx tsc` は node_modules/.bin/tsc を引くが、**TS6 と TS7 が同じ bin 名を要求するため
    # どちらが勝つかがインストール順に依存する**（= ある日静かに TS6 に戻る）。
    # `nr type-check` は workspace-tsc 経由で TS7 を明示的に解決する
    # （解決ロジックと 7.1 移行手順は frontend/tooling/tsc/resolve.mjs）。
    "type-check:mobile" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && nr type-check'';
      execIfModified = [
        "frontend/apps/mobile/**/*.ts"
        "frontend/apps/mobile/**/*.tsx"
        "frontend/apps/mobile/tsconfig*.json"
        "frontend/apps/mobile/package.json"
      ];
    };
    # drizzle は Bun workspace の外（独立プロジェクト）で typescript を持たないため、
    # frontend の workspace-tsc を絶対パスで呼ぶ。
    # ⚠️ この task が無かったせいで drizzle の型エラー 5 件が長期間検出されていなかった。
    "type-check:drizzle" = {
      exec = ''cd "$DEVENV_ROOT/drizzle" && "$DEVENV_ROOT/frontend/node_modules/.bin/workspace-tsc" --noEmit'';
      execIfModified = [
        "drizzle/**/*.ts"
        "drizzle/tsconfig.json"
        "drizzle/package.json"
      ];
    };
    # `--all-packages` 必須。backend-py は uv の **virtual workspace** (root は package = false) なので、
    # 素の `uv run` は root の dependency-groups (mypy/ruff/pytest) しか同期せず、
    # member (apps/api, packages/core) の依存 = fastapi / pydantic / starlette / structlog を入れない。
    # すると mypy から見て third-party が全部 `Any` になり、strict の disallow_subclassing_any /
    # disallow_untyped_decorators が誤爆する（"Class cannot subclass BaseModel (has type Any)" 等）。
    # `devenv test` は UV_PROJECT_ENVIRONMENT を .devenv/state/venv から **.devenv/test-state/venv** に
    # 切り替えるため、setup:install-backend が同期した venv は使われない。よって「shell 起動時に
    # 同期済みだから素の uv run でよい」は成立しない。→ import 解決が要るツールは --all-packages を付ける。
    "type-check:backend-py" = {
      exec = ''cd "$DEVENV_ROOT/backend-py" && uv run --all-packages mypy apps packages'';
      execIfModified = [
        "backend-py/apps/*/src/**/*.py"
        "backend-py/packages/*/src/**/*.py"
        "backend-py/pyproject.toml"
        "backend-py/apps/*/pyproject.toml"
        "backend-py/packages/*/pyproject.toml"
      ];
    };
    # ⚠️ 失敗を握りつぶさないこと（`.claude/rules/error-handling.md`）。
    # 以前は各 function の `deno check` を `|| echo "⚠️ Type check failed"` で受けていたため、
    # **型エラーがあっても task は exit 0 になり ci-check が緑のまま通っていた**。
    # 実際にこれで `delete-account` の deno.json 欠落（`@supabase/supabase-js` が
    # not a dependency）が CI をすり抜けている。ログに警告は出るが誰も読まない。
    # → 失敗した function 名を集めたうえで、最後に必ず非 0 で落とす。
    "type-check:functions" = {
      exec = ''
        failed=""
        for dir in "$DEVENV_ROOT"/supabase/functions/*/; do
          [ -f "$dir/index.ts" ] || continue
          func_name=$(basename "$dir")
          if [ -f "$dir/deno.json" ]; then
            (cd "$dir" && deno cache --config=deno.json index.ts) >/dev/null 2>&1 || true
            (cd "$dir" && deno check --config=deno.json index.ts) || failed="$failed $func_name"
          else
            deno check "$dir/index.ts" || failed="$failed $func_name"
          fi
        done
        if [ -n "$failed" ]; then
          echo "❌ Type check failed for:$failed"
          exit 1
        fi
      '';
      execIfModified = [
        "supabase/functions/**/*.ts"
        "supabase/functions/**/deno.json"
      ];
    };
    # IaC の静的検証。`-backend=false` で backend への接続なしに provider schema だけ取得して
    # 構文・型・参照を検査する（credential 不要 = CI でも安全に回せる）。
    "type-check:terraform" = {
      exec = ''
        cd "$DEVENV_ROOT/terraform"
        ''${TF_BIN:-terraform} init -backend=false -input=false >/dev/null
        exec ''${TF_BIN:-terraform} validate
      '';
      execIfModified = [
        "terraform/**/*.tf"
        "terraform/.terraform.lock.hcl"
      ];
    };

    # ----- Aggregator: 全 verify を一発実行 -----
    # `after = [ ... ]` で配下の verify task をすべて要求 → namespace 内で並列実行 + キャッシュ。
    #
    # ⚠️ `before = [ "devenv:enterTest" ]` は **付けない**（= `devenv test` には紐付けない）。
    # 以前は紐付けていたが、`devenv test` に載せると enterTest 経由で以下 2 つが道連れになり、
    # ci-check がローカルで恒常的に落ちていた:
    #
    #   1. **process phase**: `supabase:start` → `after` の `model:frontend` が走り、
    #      `supabase gen types typescript --local` で **auto-generated な schema.ts を上書き**する。
    #      ローカル DB が未マイグレーションだと public.Tables が空になり、
    #      `Tables<'users'>` 等が型エラーになる（生成物が壊れる破壊的副作用）。
    #   2. **devenv:git-hooks:run (prek)**: verify task と **並行実行**されるため、
    #      prek が「hook 実行中に worktree のファイル mtime が変わった」を検知して
    #      `files were modified by this hook` で false failure を出す
    #      （mypy 自体は Success。show_output = false なので原因が見えない）。
    #
    # そもそも hook (biome/ruff/ruff-format/mypy/denofmt/denolint) の検査内容は
    # 配下の verify task と完全に重複しており、`devenv test` で二重に回す意味がない。
    # → `ci-check` script は `devenv tasks run ci:check` を直接叩く（CI と同一経路）。
    "ci:check" = {
      exec = ''echo "✅ All CI checks passed"'';
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
        "format-check:terraform"
        "type-check:frontend"
        "type-check:mobile"
        "type-check:drizzle"
        "type-check:backend-py"
        "type-check:functions"
        "type-check:terraform"
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
    # ---------- Init（初回セットアップ・対話）----------
    # 開発開始前に一度だけ実行する初期化コマンド。外部サービスの対話認証（Doppler login 等）を
    # 含むため、自動 bootstrap（setup:* task）ではなくこの明示コマンドで行う。
    # 依存インストール等の非対話セットアップは `devenv shell` 進入時の setup:* task が自動実行する。
    "init" = {
      exec = ''
        echo "🚀 プロジェクト初期化（初回のみ）"
        echo ""
        echo "── 1) Doppler（シークレット管理）─────────────"
        if ! command -v doppler >/dev/null 2>&1; then
          echo "  ⚠️  doppler が見つかりません。devenv shell 内で実行してください。"
        else
          if doppler me >/dev/null 2>&1; then
            echo "  ✓ Doppler ログイン済み"
          else
            echo "  → ブラウザ認証を開きます（doppler login）"
            doppler login
          fi
          echo "  → ローカルを project/config に紐付けます（doppler setup）"
          echo "    ※ doppler.yaml の <doppler-project> を実プロジェクト名に置換してから実行"
          doppler setup || echo "  ⚠️  doppler setup 未完了（doppler.yaml の project 名を確認してください）"
        fi
        echo ""
        echo "── 2) Supabase ローカル ───────────────────────"
        echo "  → 'supabase-start' で起動（Docker 必須）。'devenv up' でも自動起動します。"
        echo ""
        echo "✅ 初期化完了。'devenv up' / 'dev-web' / 'dev-all' で開発を開始できます。"
        echo "   シークレットは Doppler から自動ロードされます（成功時 '🔐 Doppler secrets loaded'）。"
      '';
      description = "初回セットアップ（Doppler login+setup 等。一度だけ対話実行）";
    };

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

    # ---------- 外部 PaaS プロビジョニング（一度きりの初期構築）----------
    # scripts/infra/* を `doppler run` で包み、bootstrap config のトークン
    # （VC_TOKEN / SB_ACCESS_TOKEN / SB_DB_PASSWORD / GH_TOKEN 等）を環境変数として
    # 注入する。値は露出しない。
    # ※ キー名に VERCEL_/SUPABASE_/GITHUB_ prefix を使わないのは Doppler の予約 prefix 制約
    #   （.claude/rules/env-naming.md）。CLI が要求する名前へは scripts/infra/lib.sh が読み替える。
    #
    # ⚠️ これは「コマンド一発で全自動」ではない。各 PaaS の GitHub 連携 OAuth・repo 接続・
    #    Doppler→PaaS の secret 連携は dashboard 専用（docs/deployment/README.md の Phase 0/2）。
    #    本 script は scriptable な部分（project/env/GitHub 承認ゲート）のみを冪等に作る。
    # 事前に scripts/infra/config.env（config.example.env をコピー）を用意すること。
    "infra-bootstrap" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec doppler run -- bash scripts/infra/bootstrap.sh "$@"
      '';
      description = "外部 PaaS の project/env/承認ゲートを冪等プロビジョニング（要 config.env + dashboard 事前 OAuth）";
    };

    # ---------- IaC（terraform/）----------
    # 宣言的プロビジョニング。scripts/infra/tf.sh が
    #   ① 実行バイナリ解決（既定 terraform / TF_BIN で切替）
    #   ② トークン読み替え（SB_ACCESS_TOKEN→SUPABASE_ACCESS_TOKEN 等）
    #   ③ アプリごとの workspace 選択 + apps/<app>.tfvars 指定
    # を行う。トークンは `doppler run` が bootstrap config から注入する（値は露出しない）。
    #
    # 使い方: tf-plan <app>  /  tf-apply <app>  （<app> = terraform/apps/<app>.tfvars）
    # ワンショットのインフラ展開。Terraform apply → Supabase 反映まで 1 コマンド。
    #   infra-deploy <app> [env...]
    #
    # 「PaaS 側に取りに来させる」配線のうち、**Vercel はこれに含まれている**
    # （Terraform の vercel_project.git_repository が repo を接続するので、以降は
    #  git push で Vercel が自分で取りに来る）。Supabase の GitHub 連携だけは
    # Management API にも CLI にも接続手段が無いため含められず、こちらから push する。
    "infra-deploy" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec doppler run -- bash scripts/infra/deploy.sh "$@"
      '';
      description = "インフラ展開を一発実行（terraform apply + Supabase config/functions/buckets 反映）";
    };

    "tf-init" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec doppler run -- bash scripts/infra/tf.sh init "$@"
      '';
      description = "Terraform init + workspace 選択（tf-init <app>）";
    };

    "tf-plan" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec doppler run -- bash scripts/infra/tf.sh plan "$@"
      '';
      description = "Terraform plan（tf-plan <app>）";
    };

    "tf-apply" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec doppler run -- bash scripts/infra/tf.sh apply "$@"
      '';
      description = "Terraform apply（tf-apply <app>。本番相当の変更は plan を確認してから）";
    };

    "tf-output" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec doppler run -- bash scripts/infra/tf.sh output "$@"
      '';
      description = "Terraform output 表示（tf-output <app>）";
    };

    # fmt / validate は credential 不要なので doppler を挟まない。
    "tf-fmt" = {
      exec = ''
        cd "$DEVENV_ROOT/terraform"
        exec ''${TF_BIN:-terraform} fmt -recursive "$@"
      '';
      description = "Terraform format（terraform/ 配下、auto-fix）";
    };

    "tf-validate" = {
      exec = ''exec devenv tasks run type-check:terraform'';
      description = "Terraform validate（構文・型・参照の静的検証、cached）";
    };

    # frontend/apps/<name> を Vercel project 化（GitHub 連携 + rootDirectory）してデプロイする。
    # infra-bootstrap（web + backend を固定で作る一括プロビジョニング）とは別で、
    # **アプリを 1 つ後から足す / 手で本番へ出す**ための ad-hoc 経路。config.env は不要。
    #   vercel-deploy                          # frontend/apps/web を本番デプロイ
    #   vercel-deploy frontend/apps/lp         # 任意のアプリ
    #   vercel-deploy frontend/apps/lp --no-deploy   # project + env だけ（配信は git push）
    # token は VC_TOKEN → VERCEL_TOKEN → `vercel login` 済みの CLI 認証情報、の順で解決する。
    # 手順の詳細・つまずきどころは .claude/skills/vercel-deploy/SKILL.md。
    "vercel-deploy" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/infra/vercel_deploy.sh" "$@"'';
      description = "アプリを Vercel project 化（GitHub 連携）してデプロイ（--no-deploy / --preview / --dry-run）";
    };

    # ---------- モバイルリリース（EAS: クラウド / ローカルの両対応）----------
    # 各 script が Doppler の secrets を自己注入するので prefix 不要。
    # 前提と必要なシークレットは scripts/mobile/release-*.sh の冒頭 / .claude/skills/mobile-release/。
    "mobile-release-ios" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/release-ios.sh" "$@"'';
      description = "iOS を build → TestFlight（既定 expo.dev / --local でローカルビルド）";
    };

    "mobile-release-android" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/release-android.sh" "$@"'';
      description = "Android を build → Play 内部テスト（既定 expo.dev / --local でローカルビルド）";
    };

    "screenshots-mobile" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/screenshots.sh" "$@"'';
      description = "ストア掲載用スクショを simulator/emulator で撮影→検証（--upload で送信）";
    };

    "screenshots-storybook" = {
      exec = ''exec node "$DEVENV_ROOT/scripts/mobile/screenshots-storybook.mjs" "$@"'';
      description = "Storybook からストア用スクショを撮影（忠実度警告つき。実機描画が要る画面は screenshots-mobile を使う）";
    };

    "screenshots-validate" = {
      exec = ''exec node "$DEVENV_ROOT/scripts/mobile/validate-screenshots.mjs" "$@"'';
      description = "既存スクショがストア要求（サイズ/縦横比/枚数）を満たすか検証";
    };

    "mobile-metadata" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/release-ios.sh" --metadata-only "$@"'';
      description = "store.config.js を App Store Connect へ同期（ビルドしない）";
    };

    # ---------- ストアへの反映（App Store Connect / Google Play の API を直接叩く）----------
    # すべて `--dry-run` を受け付ける。**本番の掲載情報・課金商品を書き換えるので、
    # 必ず先に --dry-run で差分を確認すること。**
    # 資格情報は store.sh が Doppler から自己注入する（呼ぶ側の準備は不要）。
    "store-push-ios-screenshots" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" push-ios-screenshots "$@"'';
      description = "store-listing/ios のスクショを App Store Connect へ反映";
    };

    "store-push-play-listing" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" push-play-listing "$@"'';
      description = "play.config.js の文言 + アイコン + スクショを Google Play へ反映";
    };

    "store-create-ios-subscriptions" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" create-ios-subscriptions "$@"'';
      description = "iap.config.js のサブスク商品を App Store Connect に作成";
    };

    "store-equalize-ios-prices" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" equalize-ios-prices "$@"'';
      description = "App Store の販売地域すべてへ等価価格を展開（商品作成後に必須）";
    };

    "store-create-play-subscriptions" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" create-play-subscriptions "$@"'';
      description = "iap.config.js のサブスク商品を Google Play に作成";
    };

    "store-create-play-offers" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" create-play-offers "$@"'';
      description = "Play の無料トライアル（offer）を作成して有効化";
    };

    # ---------- アップロード後のリリース進行（mobile-release-* の続き）----------
    # `mobile-release-ios` / `-android` は**アップロードまで**しかやらない。
    # TestFlight への配布・審査提出・Play のロールアウトはここから先で、
    # 以前は App Store Connect / Play Console を人が開いて押す必要があった。
    # 迷ったら書き込まない `store-status` を先に実行する。
    # 人が画面で入力するしかない項目を出す。**資格情報も通信も要らない**ので、
    # ストアのアカウントを作る前でも実行できる（最初に実行するのが正しい）。
    "store-preflight" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" preflight "$@"'';
      description = "人が入力するしかない申告を値つきで一覧（API が無いものだけ。--json 可）";
    };

    "store-status" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" status "$@"'';
      description = "両ストアの状態と次にすべきことを表示（書き込まない。--json 可）";
    };

    "store-push-data-safety" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" push-data-safety "$@"'';
      description = "Play の Data safety を CSV から反映（公式 API。edits に乗らず即時反映）";
    };

    "store-testflight" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" testflight "$@"'';
      description = "TestFlight へ配布（--wait で処理完了待ち／--groups で配布先指定）";
    };

    "store-submit-ios" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" submit-ios "$@"'';
      description = "App Store の審査へ提出（--status / --cancel / --phased）";
    };

    "store-release-play" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/store.sh" release-play "$@"'';
      description = "Play のトラック公開・段階的公開（--track / --rollout / --halt）";
    };

    "build-play-feature-graphic" = {
      exec = ''exec node "$DEVENV_ROOT/scripts/mobile/build-play-feature-graphic.mjs" "$@"'';
      description = "Play のフィーチャーグラフィック(1024x500)を生成（要 -P store-listing）";
    };

    "sync-eas-env" = {
      exec = ''exec bash "$DEVENV_ROOT/scripts/mobile/sync-eas-env.sh" "$@"'';
      description = "Doppler の EXPO_PUBLIC_* を EAS の Environment Variables へ同期";
    };

    # ---------- Doppler（シークレット管理・移行下準備）----------
    # 完全移行に向けた補助 script。詳細・移行手順は .claude/skills/doppler/SKILL.md。
    "doppler-setup" = {
      exec = ''
        set -e
        echo "🔐 Doppler セットアップ"
        echo "  1) ブラウザ認証: doppler login"
        echo "  2) ローカルを project/config に紐付け: doppler setup"
        echo "     （リポジトリ root の doppler.yaml に基づく場合）: doppler setup --no-interactive"
        echo ""
        echo "現在の設定:"
        doppler configure 2>/dev/null || echo "  （未設定）"
      '';
      description = "Doppler login / setup の案内 + 現在の設定表示";
    };

    # 取得確認用。実際の env への注入は enterShell（Doppler-first）が自動で行う。
    "doppler-pull" = {
      exec = ''exec doppler secrets download --no-file --format env "$@"'';
      description = "Doppler の secrets を dotenv 形式で表示（--config <name> でconfig指定）";
    };

    # 指定した .env ファイルを Doppler の config に一括投入する（汎用アップローダ）。
    # 例: doppler-import /tmp/secrets.dev.env --config dev
    #     （事前に doppler login + doppler setup、または DOPPLER_TOKEN が必要）
    # 非機密の .env.local は Doppler に載せない（ファイル管理のまま）。投入後は元 .env を削除する。
    "doppler-import" = {
      exec = ''
        set -euo pipefail
        if [ "$#" -lt 1 ]; then
          echo "usage: doppler-import <file.env> [--config <name>] [--project <name>]" >&2
          echo "  例: doppler-import /tmp/secrets.dev.env --config dev" >&2
          exit 1
        fi
        _file="$1"; shift
        [ -f "$_file" ] || { echo "file not found: $_file" >&2; exit 1; }
        # 予約 prefix が 1 つでも混ざると upload 後の sync が config ごと壊れるので事前に弾く
        # （.claude/rules/env-naming.md）。キー名のみ表示し、値は出さない。
        if _bad="$(grep -oE '^[[:space:]]*(GITHUB|SUPABASE|VERCEL)_[A-Za-z0-9_]*' "$_file" | tr -d ' ' | sort -u)" \
           && [ -n "$_bad" ]; then
          echo "✗ 予約 prefix（GITHUB_/SUPABASE_/VERCEL_）のキーが含まれています:" >&2
          printf '    %s\n' $_bad >&2
          echo "  各 PF の予約名前空間で、sync が予約値違反になり config 全体が届かなくなります。" >&2
          echo "  → Supabase の値は Vercel Marketplace 連携 / default secrets が供給するので不要です。" >&2
          echo "  → 自前で持つ必要がある場合は SB_* / VC_* / GH_* に改名してください。" >&2
          echo "  詳細: .claude/rules/env-naming.md" >&2
          exit 1
        fi
        exec doppler secrets upload "$_file" "$@"
      '';
      description = "指定した .env ファイルを Doppler に一括アップロード（doppler-import <file> --config <name>）";
    };

    # 1 キーを最小タイプで投入する糖衣。値は **非表示入力**（argv/履歴に残さない）。
    #   doppler-set OPENAI_API_KEY            # → dev stg prd へ一括（同じ値）
    #   doppler-set STRIPE_SECRET_KEY dev     # → dev だけ
    #   doppler-set STRIPE_SECRET_KEY stg prd # → 任意の config を列挙
    # dev に入れるとローカル(dev_personal)は継承で自動反映。prd 投入はフェーズ制に注意。
    "doppler-set" = {
      exec = ''
        set -euo pipefail
        if [ "$#" -lt 1 ]; then
          echo "usage: doppler-set <KEY> [config...]   （config 省略時は dev stg prd）" >&2
          exit 1
        fi
        _key="$1"; shift
        # 予約 prefix は各 PF の名前空間。登録するとネイティブ連携の sync が予約値違反で
        # 落ち、その config 全体が届かなくなる（.claude/rules/env-naming.md）。
        case "$_key" in
          GITHUB_*|SUPABASE_*|VERCEL_*)
            echo "✗ '$_key' は予約 prefix（GITHUB_/SUPABASE_/VERCEL_）のため Doppler に登録できません。" >&2
            echo "  各 PF の予約名前空間で、sync が予約値違反になり config 全体が届かなくなります。" >&2
            echo "  → Supabase の値は Vercel Marketplace 連携 / Edge Functions の default secrets が供給します。" >&2
            echo "  → 自前で持つ必要がある場合は SB_* / VC_* / GH_* に改名してください。" >&2
            echo "  詳細: .claude/rules/env-naming.md" >&2
            exit 1 ;;
        esac
        if [ "$#" -ge 1 ]; then _cfgs="$*"; else _cfgs="dev stg prd"; fi
        printf 'value for %s (入力は非表示, Enter で確定): ' "$_key" >&2
        IFS= read -rs _val; echo >&2
        [ -n "$_val" ] || { echo "空の値のため中止" >&2; exit 1; }
        for _c in $_cfgs; do
          printf '%s' "$_val" | doppler secrets set "$_key" --config "$_c" --no-interactive --silent >/dev/null
          echo "✓ $_key → $_c" >&2
        done
        unset _val
      '';
      description = "Doppler に1キーを複数 config へ一括セット（値は非表示入力。config 省略=dev stg prd）";
    };

    # ---------- MCP 設定の一元管理 ----------
    # 正本 = ルートの .mcp.json（Claude が直読）。これを編集して mcp-sync を実行すると
    # Codex(.codex/config.toml) と Cursor(.cursor/mcp.json) へ形式変換して投影する。
    # 生成物は手動編集禁止（.claude/rules/auto-generated.md）。
    "mcp-sync" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec deno run --allow-read --allow-write scripts/sync-mcp.ts
      '';
      description = "Sync .mcp.json (正本) → Codex / Cursor の MCP 設定を再生成";
    };

    # gluestack-ui MCP サーバ（stdio）。公式 github.com/gluestack/mcp は npm 未公開・bin なしで
    # npx から起動できないため、ランチャが pinned commit の clone + install をキャッシュして起動する。
    # .mcp.json からは `bash scripts/mcp/gluestack-mcp.sh` として呼ばれる。手動確認用に script も公開。
    "gluestack-mcp" = {
      exec = ''
        cd "$DEVENV_ROOT"
        exec bash scripts/mcp/gluestack-mcp.sh "$@"
      '';
      description = "gluestack-ui MCP サーバを stdio で起動（手動確認用。通常は .mcp.json 経由）";
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
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx eas-cli build --platform ios'';
      description = "Build mobile (iOS) via EAS";
    };

    "build-mobile-android" = {
      exec = ''cd "$DEVENV_ROOT/frontend/apps/mobile" && exec nlx eas-cli build --platform android'';
      description = "Build mobile (Android) via EAS";
    };

    # ---------- Lint ----------
    # auto-fix 系: scripts に直接処理 (シンプル sequential、execIfModified なし → 副作用ループ回避)
    "lint-frontend"     = { exec = ''cd "$DEVENV_ROOT/frontend" && nr lint''; description = "Biome lint (frontend, auto-fix)"; };
    "lint-drizzle"      = { exec = ''cd "$DEVENV_ROOT/drizzle" && nr lint''; description = "Biome lint (drizzle, auto-fix)"; };
    "lint-backend-py"   = { exec = ''cd "$DEVENV_ROOT/backend-py" && uv run ruff check --fix apps packages''; description = "Ruff lint (backend-py workspace, auto-fix)"; };

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
    "format-backend-py" = { exec = ''cd "$DEVENV_ROOT/backend-py" && uv run ruff format apps packages''; description = "Ruff format (backend-py workspace, auto-fix)"; };
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
        tf-fmt
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
    "type-check-drizzle"    = { exec = ''exec devenv tasks run type-check:drizzle''; description = "TS type check (drizzle, cached)"; };
    "type-check-backend-py" = { exec = ''exec devenv tasks run type-check:backend-py''; description = "MyPy type check (backend-py, cached)"; };
    "check-functions"       = { exec = ''exec devenv tasks run type-check:functions''; description = "Deno check (edge functions, cached)"; };

    # 集約: namespace match で並列 + キャッシュ
    "type-check" = {
      exec = ''exec devenv tasks run type-check'';
      description = "Type check all subprojects (parallel + cached)";
    };

    # ---------- CI gate ----------
    # `ci:check` aggregator task を直接起動する（`devenv test` は使わない。
    # 理由は task "ci:check" のコメント参照 = process phase による生成物破壊 + prek の false failure）。
    # 配下の lint-ci:* / format-check:* / type-check:* が namespace 並列 + execIfModified キャッシュで実行される。
    # → 何も変更してなければ全 task キャッシュヒットで秒で終わる。
    # → 一部だけ変更すれば影響範囲のみ走る (incremental)。
    # → CI (.github/workflows/ci.yml) もこの script を呼ぶので、ローカルと CI で検査対象が一致する。
    "ci-check" = {
      exec = ''exec devenv tasks run ci:check'';
      description = "Full CI gate (ci:check aggregator, cached, incremental)";
    };

    # ---------- Build ----------
    "build-frontend" = { exec = ''cd "$DEVENV_ROOT/frontend" && nr build''; description = "Build frontend (Next.js)"; };

    # ---------- Tests ----------
    "test-frontend"   = { exec = ''cd "$DEVENV_ROOT/frontend" && nr test''; description = "Vitest (frontend)"; };
    # pytest は member (api/core) とその依存を import するので `--all-packages` 必須
    # (type-check:backend-py のコメント参照)。ruff は import 解決不要なので素の uv run でよい。
    "test-backend-py" = { exec = ''cd "$DEVENV_ROOT/backend-py" && uv run --all-packages pytest''; description = "pytest (backend-py workspace)"; };
    "test-db"         = { exec = ''supabase test db --local''; description = "pgTAP DB tests"; };
    # NOTE: `test` という名前は bash 組み込みコマンド（`[` と等価）と衝突し、
    # PATH 上の同名スクリプトより builtin が優先される。CI で `run: test` を呼ぶと
    # 引数なしの builtin `test` が exit 1 を返してジョブが落ちるため、`unit-test`
    # に名前を変えてある。
    "unit-test" = {
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
    # CCR / web-sandbox only: Maestro has no runnable target here (web=0 devices,
    # mobile=no emulator), so drive the web app via Playwright + prebaked Chromium.
    "e2e-web-ccr" = { exec = ''exec bash "$DEVENV_ROOT/e2e/run-ccr.sh"''; description = "Web E2E for CCR sandbox (Playwright + Chromium)"; };

    # ---------- Drizzle ----------
    "drizzle-push"     = { exec = ''cd "$DEVENV_ROOT/drizzle" && nr push''; description = "Drizzle: push schema (no migration file)"; };
    "drizzle-studio"   = { exec = ''cd "$DEVENV_ROOT/drizzle" && exec nr studio''; description = "Drizzle Studio (GUI)"; };
    "drizzle-validate" = { exec = ''cd "$DEVENV_ROOT/drizzle" && nr check''; description = "Drizzle: schema validate"; };

    # ---------- Storybook standalone ----------
    "storybook-local" = { exec = ''cd "$DEVENV_ROOT/frontend" && exec bun run storybook''; description = "Storybook standalone (without devenv up)"; };
    "build-storybook" = { exec = ''cd "$DEVENV_ROOT/frontend" && bun run build-storybook''; description = "Build Storybook"; };

    # Storybook は「ビルド成功・型 OK・lint OK」を全部満たしたまま描画だけ壊れることがある
    # （実際に全ストーリーが無スタイル / 実行時エラーで落ちた事故がある）。
    # 実行時エラー・未翻訳キー・入力欄の font-size を computed style で実測する。
    "verify-storybook-render" = {
      exec = ''exec node "$DEVENV_ROOT/scripts/frontend/verify-storybook-render.mjs" "$@"'';
      description = "Verify Storybook stories actually render (needs build-storybook first)";
    };

    # ---------- Skill / dev tooling ----------
    # uipro-cli: UI/UX Pro Max skill installer (https://www.npmjs.com/package/uipro-cli)
    # bunx 経由で都度実行（bun のキャッシュを利用、グローバル node_modules を作らない）。
    "uipro" = {
      exec = ''cd "$DEVENV_ROOT" && exec bunx uipro-cli "$@"'';
      description = "Run uipro-cli (UI/UX Pro Max skill installer) via bunx";
    };

    # ---------- 外部サービス CLI（nixpkgs 未収録 → bunx 経由）----------
    # 公式 CLI ではあるが nixpkgs に derivation が無いもの。`uipro` と同じく bunx で都度実行し、
    # グローバル node_modules を作らない（bun のキャッシュが効くので 2 回目以降は即時）。
    # バージョンは固定しない: どちらもリモート API を叩く運用ツールで、古い CLI を固定すると
    # サーバ側 API 変更に追従できなくなるため（EAS CLI を nixpkgs で固定しない判断と同じ）。
    # 一覧と選定理由は docs/_research/2026-08-06-service-clis.md を参照。

    # Resend CLI（メール配信）。`resend login` → `resend emails send` / `resend domains list` 等。
    # npm パッケージ名は `resend-cli`、bin 名は `resend`（https://resend.com/docs/cli）。
    # 使い方は skills-lock 管理の `resend-cli` skill（resend/resend-skills）が持っている。
    "resend" = {
      exec = ''cd "$DEVENV_ROOT" && exec bunx resend-cli "$@"'';
      description = "Run the official Resend CLI via bunx (email delivery)";
    };

    # Adapty CLI（モバイル課金 / paywall）。npm パッケージ名も bin 名も `adapty`
    # （https://adapty.io/docs/developer-cli）。認証は OAuth device flow で
    # ~/.config/adapty/config.json に保存されるため Doppler 管理の対象外。
    "adapty" = {
      exec = ''cd "$DEVENV_ROOT" && exec bunx adapty "$@"'';
      description = "Run the official Adapty CLI via bunx (mobile subscriptions/paywalls)";
    };

    # fal CLI（生成 AI 推論 / serverless）。PyPI パッケージ名も コマンド名も `fal`
    # （https://docs.fal.ai/serverless/getting-started/installation）。npm ではなく Python 製なので
    # bunx ではなく **uvx**（= `uv tool run`）で実行する。backend-py の dependency-group には
    # 入れない: fal は運用ツールでアプリの実行時依存ではなく、`uv sync --all-packages` や CI の
    # インストール時間を無駄に増やすため。
    #
    # ⚠️ 認証は 2 系統ある（fal 1.79.1 の `fal/auth/__init__.py::key_credentials` で確認）:
    #   1. **API キー** `FAL_KEY`（`<id>:<secret>`）… アプリコード（`fal_client`）が使う。
    #      env にあると `~/.fal` の OAuth トークンより**優先される**。
    #   2. **OAuth**（`fal auth login` / Auth0 device flow）… 開発者個人の資格情報。
    #      `~/.fal/auth0_token`（`FAL_HOME_DIR` で変更可）に保存され、他マシンへ持ち出せない。
    #   `FAL_FORCE_AUTH_BY_USER=1` を立てると key 系（env / `~/.fal` の profile key / colab /
    #   `FAL_KEY_ID`+`FAL_KEY_SECRET`）を**すべて無視**して 2 に倒れる。
    #
    # 本リポジトリは fal を **CLI に一元化**している（fal-ai MCP は廃止）。そのうえで、
    # devenv shell は Doppler のシークレットを丸ごと env へ流し込む（loadDopplerByEnv）ため、
    # 素の `uvx fal` だとローカルでも常に `FAL_KEY` が OAuth を上書きしてしまう。
    # そこで実行環境に応じて認証モードを解決してから CLI を起動する:
    #
    #   | 環境                                     | mode | 使う資格情報                          |
    #   |------------------------------------------|------|---------------------------------------|
    #   | 開発者のローカルマシン（既定）           | user | `fal auth login` の OAuth             |
    #   | クラウド sandbox（CCR / Codespaces 等）  | key  | Doppler の `FAL_ADMIN_KEY` or `FAL_KEY` |
    #   | CI（GitHub Actions）                     | key  | 同上                                  |
    #
    # ブラウザを開けない環境では device flow を通せないので key に倒す、という判断。
    # `FAL_AUTH_MODE=user|key` で明示上書きできる（ローカルで CI 相当を再現したい時など）。
    # key mode は `FAL_ADMIN_KEY` があればそれを優先する: `fal deploy` 等は ADMIN スコープが
    # 要る一方、アプリ実行時に配る `FAL_KEY` は API スコープに留めたいため（両者を 1 キーで
    # 兼ねない）。詳細は .claude/skills/fal/SKILL.md §3。
    "fal" = {
      exec = ''
        set -euo pipefail
        cd "$DEVENV_ROOT"

        _fal_mode="''${FAL_AUTH_MODE:-}"
        if [ -z "$_fal_mode" ]; then
          # ブラウザを開けない実行環境の判定（CI / クラウド sandbox）。
          # `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` は Claude Code on the web（CCR）が注入する。
          # ローカルの Claude Code でも立つ `CLAUDECODE` / `IS_SANDBOX` は判定に使わない
          # （ローカルは OAuth を通せるので user のままにする）。
          if [ -n "''${CI:-}" ] || [ -n "''${GITHUB_ACTIONS:-}" ] \
            || [ -n "''${CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE:-}" ] \
            || [ -n "''${CODESPACES:-}" ] || [ -n "''${GITPOD_WORKSPACE_ID:-}" ]; then
            _fal_mode=key
          else
            _fal_mode=user
          fi
        fi

        case "$_fal_mode" in
          key)
            # ADMIN スコープのキーがあれば優先（deploy 等）。無ければアプリ用 FAL_KEY。
            if [ -n "''${FAL_ADMIN_KEY:-}" ]; then
              FAL_KEY="$FAL_ADMIN_KEY"
            fi
            if [ -z "''${FAL_KEY:-}" ]; then
              echo "❌ fal: FAL_KEY が未設定です（auth mode: key）。" >&2
              echo "   このマシンは CI / クラウド sandbox と判定されており、OAuth（fal auth login）は使えません。" >&2
              echo "   Doppler に FAL_KEY（アプリ用 / API スコープ）または FAL_ADMIN_KEY（deploy 用 / ADMIN スコープ）" >&2
              echo "   を登録してください（doppler MCP 経由。値はチャット/ログに出さない）。" >&2
              echo "   ローカルの OAuth を使いたい場合は FAL_AUTH_MODE=user fal ... 。詳細: .claude/skills/fal/SKILL.md §3" >&2
              exit 1
            fi
            export FAL_KEY
            unset FAL_FORCE_AUTH_BY_USER || true
            ;;
          user)
            # Doppler 由来の key が OAuth を上書きしないよう、両方の手段で確実に無効化する。
            unset FAL_KEY FAL_KEY_ID FAL_KEY_SECRET || true
            export FAL_FORCE_AUTH_BY_USER=1
            if [ ! -f "''${FAL_HOME_DIR:-$HOME/.fal}/auth0_token" ]; then
              echo "ℹ️  fal: 未ログインです（auth mode: user）。'fal auth login' を実行してください。" >&2
              echo "   ブラウザを開けない環境なら 'fal auth login --no-browser'、" >&2
              echo "   キーで動かすなら FAL_AUTH_MODE=key fal ... 。" >&2
            fi
            ;;
          *)
            echo "❌ fal: FAL_AUTH_MODE の値が不正です: '$_fal_mode'（'user' か 'key'）" >&2
            exit 1
            ;;
        esac

        exec uvx fal "$@"
      '';
      description = "Run the official fal CLI via uvx (local=OAuth / CI・sandbox=FAL_KEY from Doppler)";
    };

    # Vercel CLI。**日常運用（logs / env pull / inspect / microfrontends pull / 手動 deploy）
    # 向け**であって、インフラのプロビジョニングには使わない。
    # provisioning（scripts/infra/vercel.sh）が REST API を直叩きしているのは、
    #   - `vercel env add <name> preview` が --yes/--force/--non-interactive を付けても
    #     git branch を対話で聞いてくる（vercel/vercel#15763、2026-08 時点 open。
    #     公式 issue の回避策も「REST API を使う」）
    #   - rootDirectory を設定する CLI フラグが無い
    # の 2 点が理由で、CLI 全般が使えないという話ではない。
    # nixpkgs に derivation が無いので bunx 経由（frontend/README.md の
    # `bun add -g vercel` によるグローバル導入はこの script で置き換える）。
    "vercel" = {
      exec = ''exec bunx vercel "$@"'';
      description = "Run the Vercel CLI via bunx (logs / env / deploy. provisioning は REST API)";
    };

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

  # OCI コンテナイメージ（`devenv container build backend` で生成 = Nix/nix2container で
  # イメージを直接ビルド。**Dockerfile は生成しない**）。
  # Vercel の本番デプロイには使わない: Vercel は git-push でサービスを **自前ビルド**する方式で
  # （`backend-py/vercel.json` の service = `apps/api/Dockerfile.vercel` をビルド）、ビルド済み
  # イメージを参照する vercel.json フィールドが無いため、Nix イメージを流し込む経路が無い。
  # このイメージはローカルでの OCI 検証や他レジストリ（GHCR / fly.io 等）配布用に残している。
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
    #
    # NOTE: --write を付けない（check モード）。理由:
    #   - prek の patch 機構と biome --write の組み合わせで毎回「files were modified」
    #     と報告されてループする現象が発生する（staged content と working tree が
    #     一致していても biome が再書き込みするため）。
    #   - auto-fix は scripts (`lint`, `format`) や IDE 連携で行う。
    #     pre-commit の役割は「壊れたコードを通さないゲート」で十分。
    biome = {
      enable = true;
      # --no-errors-on-unmatched: biome.json で除外されたファイル
      # (skills-lock.json 等) のみが渡されたケースで exit 1 になるのを抑止。
      entry = lib.mkForce "${pkgs.biome}/bin/biome check --no-errors-on-unmatched";
    };

    # ----- Python: Ruff (lint) -----
    # backend-py workspace の apps/<name>/src と packages/<name>/src のみ対象。
    # リポジトリ root 直下や .claude/skills 等にある Python ファイル（外部ツール同期由来）は
    # backend-py の ruff 設定を意図しないため対象から外す。
    # プロジェクト単位の verify は `lint-backend-py` task で行う。
    ruff = {
      enable = true;
      files = "^backend-py/(apps|packages)/[^/]+/src/.*\\.py$";
    };

    # ----- Python: Ruff (format) -----
    ruff-format = {
      enable = true;
      files = "^backend-py/(apps|packages)/[^/]+/src/.*\\.py$";
    };

    # ----- Python: Mypy (type check) -----
    # 型エラーの早期検出を優先しコミット時にもフルチェック相当を回す。
    # ファイル単位の false positive (import 整合性が一時的に崩れた中間状態) は許容し、
    # 引っかかったら fix → re-commit で対応する。
    # プロジェクト単位の最終確認は `type-check:backend-py` task (devenv test 経由) で重ねて行う。
    # tests/ は pytest で動的型チェック相当を行うため mypy 対象外（pyproject.toml の exclude
    # は CLI 個別ファイル渡しでは効かないので、ここでも明示除外する）。
    #
    # ビルトインの mypy フックは project root から `mypy` を直接呼ぶため、
    # backend-py の uv venv (workspace 共有) にインストールされたパッケージを解決できず
    # import-not-found が大量に出る。
    # `cd backend-py && uv run mypy apps packages` の形に上書きすることで venv 内の
    # mypy + 全依存を見つけられるようにする。pass_filenames=false でファイル列を
    # 受け取らずワークスペース全体で実行 (= type-check:backend-py task と同じ挙動)。
    mypy = {
      enable = true;
      files = "^backend-py/(apps|packages)/[^/]+/src/.*\\.py$";
      pass_filenames = false;
      # `--all-packages`: virtual workspace の member 依存 (fastapi/pydantic/…) まで同期させる。
      # 素の `uv run` だと third-party が Any になり strict mypy が誤爆する
      # (詳細は task "type-check:backend-py" のコメント参照)。
      entry = lib.mkForce ''${pkgs.bash}/bin/bash -c 'cd "$(git rev-parse --show-toplevel)/backend-py" && uv run --all-packages mypy apps packages' '';
    };

    # ----- Edge Functions: Deno format -----
    # deno fmt/lint は以下のいずれかで "No target files found" exit 1 になる:
    #   (a) 引数 0 件
    #   (b) 渡された引数が全て削除済み (pre-commit は deleted file path も regex 一致なら渡してくる)
    #   (c) 渡された引数が全て supabase/functions/deno.json の fmt/lint.exclude に含まれる
    #       (例: shared/drizzle/, shared/types/supabase/ などの auto-generated 領域)
    # wrapper で削除済みは事前フィルタし、残りを呼んで "No target files found" が出たら exit 0 に
    # 倒す (= 「対象ファイルなし」は失敗ではなくスキップ扱い)。
    denofmt = {
      enable = true;
      files = "^supabase/functions/.*\\.ts$";
      entry = lib.mkForce ''${pkgs.bash}/bin/bash -c 'files=(); for f in "$@"; do [ -f "$f" ] && files+=("$f"); done; [ ''${#files[@]} -eq 0 ] && exit 0; out=$(${pkgs.deno}/bin/deno fmt "''${files[@]}" 2>&1); rc=$?; if [ $rc -ne 0 ] && printf "%s" "$out" | grep -q "No target files found"; then exit 0; fi; printf "%s\n" "$out"; exit $rc' --'';
    };

    # ----- Edge Functions: Deno lint -----
    denolint = {
      enable = true;
      files = "^supabase/functions/.*\\.ts$";
      entry = lib.mkForce ''${pkgs.bash}/bin/bash -c 'files=(); for f in "$@"; do [ -f "$f" ] && files+=("$f"); done; [ ''${#files[@]} -eq 0 ] && exit 0; out=$(${pkgs.deno}/bin/deno lint "''${files[@]}" 2>&1); rc=$?; if [ $rc -ne 0 ] && printf "%s" "$out" | grep -q "No target files found"; then exit 0; fi; printf "%s\n" "$out"; exit $rc' --'';
    };
  };

  # base enterShell。profile 未指定（= local 既定）で local 環境 env を読み込む。
  # `-P staging` / `-P production` を付けた場合は、profile の enterShell が後追いで実行され、
  # `set -a; source` の後勝ち動作で staging/production の値（と ENV / Doppler）が local を上書きする。
  #
  # ENV 既定: 外部から `ENV=...` を渡していなければ local（deploy スクリプトの規約と同じ）。
  # シークレットは loadDopplerByEnv が ENV に応じた Doppler config から読む（local→ローカル参照）。
  # ファイルフォールバックは廃止（未接続時は警告のみ・shell は止めない）。ローカルは公式推奨の
  # dev_personal を `doppler setup`/doppler.yaml で紐付ける。ローカル非機密（URL/port 等）は .env.local。
  # 詳細は .claude/skills/doppler/SKILL.md。
  enterShell = ''
    export ENV="''${ENV:-local}"
    ${loadEnvFilesForEnv}
    ${loadDopplerByEnv}
    echo "devenv: Node $(node -v), Python $(python3 -V), Deno $(deno -v), Bun $(bun -v), uv $(uv -V)"
    echo ""
    echo "📋 Quick start:"
    echo "  devenv up                         # supabase + backend + storybook (light, local 既定)"
    echo "  dev-web                           #   ↑ + Next.js (frontend/apps/web)"
    echo "  dev-mobile                        #   ↑ + Expo Metro (frontend/apps/mobile)"
    echo "  dev-all                           #   ↑ + 両方"
    echo "  mobile-ios / mobile-android       # Expo TUI 別ターミナル (devenv 外)"
    echo "  devenv shell -P android           # Android ネイティブビルド toolchain (JDK17 + SDK + NDK)"
    echo "    └ mobile-android-run            #   expo run:android (ローカル実機ビルド)"
    echo "  devenv tasks run db:migrate-dev   # DB schema migration"
    echo "  ci-check                          # full CI gate"
    echo "  stop                              # stop everything"
  '';
}
