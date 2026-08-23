#!/usr/bin/env bash
# ==============================================================================
# maestro.sh — Maestro UI / E2E テストの実行口（環境切り替えつき）
#
#   devenv scripts の `e2e` / `e2e-web` / `e2e-mobile` / `e2e-ui` から呼ばれる。
#
# ------------------------------------------------------------------------------
# 環境の切り替えは Maestro 公式の 2 つの仕組みだけで作ってある
# （config.yaml に env を書くキーは公式に存在しない。docs/_research/2026-08-23-maestro-e2e.md）
#
#   1. `--config <file>` … **どのフローを走らせるか**
#        local  → .maestro/config.yaml         （mailbox / admin も含めて全部）
#        remote → .maestro/config.remote.yaml  （Mailpit と service_role を要る
#                                               フローを除外）
#   2. `-e KEY=VALUE`    … **どの URL・どの資格情報を使うか**
#        このスクリプトがプロファイルごとに解決して渡す。
#
#   フロー側は `${WEB_BASE_URL || "http://localhost:3000"}` のように既定値つきで
#   受けているので、素の `maestro test <flow>` でもローカル既定値で動く。
#
# ------------------------------------------------------------------------------
# 使い方
#
#   scripts/e2e/maestro.sh [--env local|staging|production]
#                          [--platform web|android|ios|all]
#                          [--suite all|ui|e2e|smoke]
#                          [--headed] [--no-start-web] [--dry-run]
#                          [-- <maestro に素通しする引数>]
#
#   例:
#     maestro.sh                                   # ローカル・全部
#     maestro.sh --platform web --suite ui         # ローカルの Web UI テストだけ
#     maestro.sh --env production --platform web --suite smoke
#     maestro.sh --platform android --suite e2e    # エミュレータ必須
# ==============================================================================
set -euo pipefail

ROOT="${DEVENV_ROOT:-$(git rev-parse --show-toplevel)}"
WORKSPACE="$ROOT/.maestro"
RESULTS="$ROOT/e2e-results/maestro"

PROFILE="local"
PLATFORM="all"
SUITE="all"
HEADED=0
START_WEB=1
DRY_RUN=0
SHOTS=1
PASSTHRU=()

log()  { printf '\033[1;34m[e2e]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[e2e]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[e2e]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 引数
while [ $# -gt 0 ]; do
  case "$1" in
    --env|--profile) PROFILE="${2:?--env requires a value}"; shift 2 ;;
    --env=*|--profile=*) PROFILE="${1#*=}"; shift ;;
    --platform)      PLATFORM="${2:?--platform requires a value}"; shift 2 ;;
    --platform=*)    PLATFORM="${1#*=}"; shift ;;
    --suite)         SUITE="${2:?--suite requires a value}"; shift 2 ;;
    --suite=*)       SUITE="${1#*=}"; shift ;;
    --headed)        HEADED=1; shift ;;
    --no-start-web)  START_WEB=0; shift ;;
    --no-shots)      SHOTS=0; shift ;;
    --dry-run)       DRY_RUN=1; shift ;;
    -h|--help)       sed -n '2,35p' "$0" | sed 's/^# \?//'; exit 0 ;;
    --)              shift; PASSTHRU+=("$@"); break ;;
    *)               PASSTHRU+=("$1"); shift ;;
  esac
done

case "$PROFILE" in local|staging|production) ;; *) die "unknown --env '$PROFILE' (local|staging|production)" ;; esac
case "$PLATFORM" in web|android|ios|mobile|all) ;; *) die "unknown --platform '$PLATFORM' (web|android|ios|all)" ;; esac
case "$SUITE" in all|ui|e2e|smoke) ;; *) die "unknown --suite '$SUITE' (all|ui|e2e|smoke)" ;; esac

# ---------------------------------------------------------------- プロファイル解決
#
# ここが「フルローカルのデバッグ」と「本番のテスト」の分かれ目。
# ローカルの値は devenv が env/<svc>/.env.local から shell に入れている。
# リモートの値は Doppler が入れる（キー名に GITHUB_ / SUPABASE_ / VERCEL_ の
# 予約 prefix を使わないこと。`.claude/rules/env-naming.md`）。
LOCALE="${E2E_LOCALE:-en}"
MOBILE_SCHEME="${E2E_MOBILE_SCHEME:-mobile}"
TEST_PASSWORD="${E2E_TEST_PASSWORD:-E2ePassw0rd!x}"

case "$PROFILE" in
  local)
    CONFIG="$WORKSPACE/config.yaml"
    WEB_BASE_URL="${E2E_WEB_BASE_URL:-${NEXT_PUBLIC_APP_URL:-http://localhost:3000}}"
    # 使い捨てユーザーを作るための service_role。ローカル Supabase の
    # 決定的な既定値が env/backend/.env.local から入っている。
    E2E_SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
    E2E_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
    MAIL_API_URL="${E2E_MAIL_API_URL:-http://127.0.0.1:54324}"
    ACCOUNT_EMAIL="${E2E_EMAIL:-}"
    ACCOUNT_PASSWORD="${E2E_PASSWORD:-}"
    ;;
  staging|production)
    CONFIG="$WORKSPACE/config.remote.yaml"
    # リモートは URL も資格情報も**必ず外から**渡す。既定値を持たせると
    # 「本番を狙ったつもりが localhost を叩いて緑だった」が起きる。
    WEB_BASE_URL="${E2E_WEB_BASE_URL:-}"
    [ -n "$WEB_BASE_URL" ] || die "E2E_WEB_BASE_URL is required for --env $PROFILE (set it in Doppler)"
    # service_role は**絶対に**リモートへ持ち出さない。空にすることで
    # ensure-test-user.js が「既存アカウントを使う」モードに落ちる。
    E2E_SUPABASE_URL=""
    E2E_SERVICE_ROLE_KEY=""
    MAIL_API_URL=""
    ACCOUNT_EMAIL="${E2E_EMAIL:-}"
    ACCOUNT_PASSWORD="${E2E_PASSWORD:-}"
    if [ "$SUITE" != "ui" ] && { [ -z "$ACCOUNT_EMAIL" ] || [ -z "$ACCOUNT_PASSWORD" ]; }; then
      die "E2E_EMAIL / E2E_PASSWORD are required for --env $PROFILE with --suite $SUITE
     本番では使い捨てユーザーを作れないので、既存アカウント（ストア審査用の
     デモアカウントを想定）の資格情報が要る。Doppler から渡すこと。
     UI テストだけなら --suite ui で走らせられる。"
    fi
    ;;
esac

APP_ID="${E2E_APP_ID:-}"
if [ "$PLATFORM" != "web" ] && [ -z "$APP_ID" ]; then
  # boilerplate の app.json には bundleIdentifier / package がまだ無い。
  # 派生プロジェクトで決まったら E2E_APP_ID で渡す（app.json から自動で
  # 拾えるならそちらを優先）。
  APP_ID="$(node -e '
    try {
      const app = require(process.argv[1]).expo ?? {};
      process.stdout.write(app.ios?.bundleIdentifier || app.android?.package || "");
    } catch { process.stdout.write(""); }
  ' "$ROOT/frontend/apps/mobile/app.json" 2>/dev/null || true)"
fi

# ---------------------------------------------------------------- 実行対象
FLOW_DIRS=()
case "$PLATFORM" in
  web)               FLOW_DIRS=("$WORKSPACE/web/ui" "$WORKSPACE/web/e2e") ;;
  android|ios|mobile) FLOW_DIRS=("$WORKSPACE/mobile/ui" "$WORKSPACE/mobile/e2e") ;;
  all)               FLOW_DIRS=("$WORKSPACE/web/ui" "$WORKSPACE/web/e2e" "$WORKSPACE/mobile/ui" "$WORKSPACE/mobile/e2e") ;;
esac

# `--platform all` のとき、エミュレータ / シミュレータが繋がっていなければ
# モバイルのフローは走らせない。
#
# 「デバイスが無いので全部赤」は**アプリの問題と区別がつかない**赤であり、
# 赤を無視する習慣を作る。走らせなかったことは黙らずに出す。
if [ "$PLATFORM" = "all" ]; then
  devices="$(maestro list-devices 2>/dev/null || true)"
  if ! printf '%s' "$devices" | grep -qiE "^[[:space:]]*(android|ios)$|emulator|simulator"; then
    warn "Android エミュレータ / iOS シミュレータが見つからないので mobile のフローを外します"
    warn "  起動: maestro start-device --platform android（または ios）"
    FLOW_DIRS=("$WORKSPACE/web/ui" "$WORKSPACE/web/e2e")
  fi
fi

# **プラットフォームはディレクトリで、スイートはタグで**絞る。
# `--include-tags a,b` は OR（「いずれかを含む」）なので、両方をタグでやると
# web の UI テストと mobile の E2E が一緒に走ってしまう。
TAG_ARGS=()
if [ "$SUITE" != "all" ]; then
  TAG_ARGS=(--include-tags "$SUITE")
fi

# 認証メールの**リンク / コードを実際に使う**フロー（`needs-email-templates`）は、
# `supabase/config.toml` で `[auth.email.template.*]` が配線されていることが前提。
#
# 既定の Supabase テンプレートが送るのは `{{ .ConfirmationURL }}` 形式のリンクで、
# `@supabase/ssr`（PKCE）が要求する `/auth/confirm?token_hash=...` ではない。
# つまり配線前に走らせると、**アプリのバグではない理由で必ず赤くなる**。
#
# この boilerplate は config.toml を意図的に置いていない（.claude/rules/supabase-config.md §0）。
# そこで **config.toml の有無を見て自動で出し入れ**する:
#   - 無い → 除外し、理由と有効化条件を毎回はっきり出す（黙って skip しない）
#   - 有る → 何もしない（派生プロジェクトでは自動的に走り出す）
if [ ! -f "$ROOT/supabase/config.toml" ]; then
  TAG_ARGS+=(--exclude-tags needs-email-templates)
  warn "supabase/config.toml が無いので、認証メールのリンクを踏むフローを除外します"
  warn "  （既定テンプレートは token_hash 形式ではないため /auth/confirm に着地できない）"
  warn "  有効化: supabase/config.toml に [auth.email.template.recovery] 等を配線する"
  warn "  → .claude/rules/supabase-config.md §2 / .maestro/README.md"
fi

MAESTRO_PLATFORM=""
case "$PLATFORM" in
  web)     MAESTRO_PLATFORM="web" ;;
  android) MAESTRO_PLATFORM="android" ;;
  ios)     MAESTRO_PLATFORM="ios" ;;
esac

# Android エミュレータは独自の仮想ネットワークにいるので、ホストの localhost は
# 10.0.2.2 になる。ここを忘れると「Android だけメールが取れない」になる。
if [ "$PLATFORM" = "android" ]; then
  E2E_SUPABASE_URL="${E2E_SUPABASE_URL//127.0.0.1/10.0.2.2}"
  E2E_SUPABASE_URL="${E2E_SUPABASE_URL//localhost/10.0.2.2}"
  MAIL_API_URL="${MAIL_API_URL//127.0.0.1/10.0.2.2}"
  MAIL_API_URL="${MAIL_API_URL//localhost/10.0.2.2}"
fi

# ---------------------------------------------------------------- ローカルの前提を整える
ensure_local_stack() {
  [ "$PROFILE" = "local" ] || return 0

  if ! curl -sf -o /dev/null "$E2E_SUPABASE_URL/rest/v1/" 2>/dev/null; then
    log "Supabase not reachable -> supabase-start"
    supabase-start
  fi

  case "$PLATFORM" in web|all) ;; *) return 0 ;; esac
  if curl -sf -o /dev/null "$WEB_BASE_URL/${LOCALE}/login" 2>/dev/null; then
    return 0
  fi
  if [ "$START_WEB" = 0 ]; then
    die "web app not reachable at $WEB_BASE_URL (--no-start-web が指定されている)"
  fi

  log "web not reachable -> starting next dev at $WEB_BASE_URL"
  mkdir -p "$RESULTS"
  # `-H 127.0.0.1` は付けない。Next.js 16 + next-intl では明示ホスト指定で
  # middleware が同じパスへ 307 を返し続け（ERR_TOO_MANY_REDIRECTS）になる。
  local port="${WEB_BASE_URL##*:}"
  case "$port" in *[!0-9]* | "") port=3000 ;; esac
  ( cd "$ROOT/frontend/apps/web" && exec bun run dev -- -p "$port" ) \
    > "$RESULTS/web-dev.log" 2>&1 &
  WEB_PID=$!
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "$WEB_BASE_URL/${LOCALE}/login" 2>/dev/null && break
    sleep 3
  done
  curl -sf -o /dev/null "$WEB_BASE_URL/${LOCALE}/login" 2>/dev/null \
    || die "web did not become ready (see $RESULTS/web-dev.log)"
  log "web ready (pid $WEB_PID)"
}

cleanup() {
  if [ -n "${SHOTS_PID:-}" ]; then
    kill "$SHOTS_PID" 2>/dev/null || true
  fi
  if [ -n "${WEB_PID:-}" ]; then
    log "stopping the web dev server we started (pid $WEB_PID)"
    kill "$WEB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------- コンテナ / root 実行の下準備
#
# Maestro の Web ドライバは Selenium 経由で Chrome を起動するが、**起動引数を
# 設定する公式の口が無い**。root で動くコンテナ（CCR サンドボックス・CI）では
# 次の 2 つで必ず落ちるので、ここで面倒を見る。詳細と実測は
# docs/_research/2026-08-23-maestro-e2e.md §5。
#   1. "Running as root without --no-sandbox is not supported"
#   2. PATH 上の chromedriver が Selenium の落とす Chrome とバージョン不一致
# macOS など通常の開発環境では**何もしない**。
prepare_web_driver() {
  # `--platform all` は `-p` を付けない（Maestro に繋がっているデバイスを選ばせる）が、
  # Web デバイスが選ばれる可能性がある以上、下準備は必要。
  case "$PLATFORM" in web|all) ;; *) return 0 ;; esac
  [ "$(id -u)" = "0" ] || return 0

  local dir shim
  for dir in "$HOME"/.cache/selenium/chrome/*/*; do
    [ -d "$dir" ] || continue
    [ -f "$dir/chrome" ] || continue
    [ -f "$dir/chrome-real" ] && continue
    mv "$dir/chrome" "$dir/chrome-real"
    shim="$dir/chrome"
    {
      printf '#!/bin/sh\n'
      printf '# Maestro/Selenium が起動する Chrome に --no-sandbox を足すシム。\n'
      printf '# root のコンテナでは付けないと Chrome が即終了する（crbug.com/638180）。\n'
      printf 'exec "%s/chrome-real" --no-sandbox --disable-dev-shm-usage "$@"\n' "$dir"
    } > "$shim"
    chmod +x "$shim"
    log "patched Chrome launcher for root container: $shim"
  done

  # バージョンの合わない chromedriver が PATH にいると Selenium Manager が
  # それを優先し、"only supports Chrome version N" で落ちる。該当する 1 本だけ
  # PATH から外して、Selenium に一致するドライバを取りに行かせる。
  local drv
  drv="$(command -v chromedriver || true)"
  if [ -n "$drv" ]; then
    local drv_dir chrome_major drv_major
    drv_dir="$(dirname "$drv")"
    drv_major="$("$drv" --version 2>/dev/null | sed -nE 's/^ChromeDriver ([0-9]+).*/\1/p')"
    chrome_major="$(ls -d "$HOME"/.cache/selenium/chrome/*/* 2>/dev/null | sed -nE 's#.*/([0-9]+)\..*#\1#p' | tail -1)"
    if [ -n "$drv_major" ] && [ -n "$chrome_major" ] && [ "$drv_major" != "$chrome_major" ]; then
      warn "chromedriver $drv_major != chrome $chrome_major -> dropping $drv_dir from PATH"
      PATH="$(printf '%s' "$PATH" | tr ':' '\n' | grep -vx "$drv_dir" | paste -sd: -)"
      export PATH
    fi
  fi
}

# ---------------------------------------------------------------- 実行
ENV_ARGS=(
  -e "WEB_BASE_URL=$WEB_BASE_URL"
  -e "LOCALE=$LOCALE"
  -e "MOBILE_SCHEME=$MOBILE_SCHEME"
  -e "TEST_PASSWORD=$TEST_PASSWORD"
  -e "SUPABASE_URL=$E2E_SUPABASE_URL"
  -e "SUPABASE_SERVICE_ROLE_KEY=$E2E_SERVICE_ROLE_KEY"
  -e "MAIL_API_URL=$MAIL_API_URL"
  -e "E2E_EMAIL=$ACCOUNT_EMAIL"
  -e "E2E_PASSWORD=$ACCOUNT_PASSWORD"
)
[ -n "$APP_ID" ] && ENV_ARGS+=(-e "APP_ID=$APP_ID")

CMD=(maestro)
[ -n "$MAESTRO_PLATFORM" ] && CMD+=(--platform "$MAESTRO_PLATFORM")
CMD+=(test --config "$CONFIG")
# `--headless` は Web 専用フラグ。`all` のときも付けておく（他プラットフォームでは無視される）。
case "$PLATFORM" in
  web|all) [ "$HEADED" = 0 ] && CMD+=(--headless) ;;
esac
CMD+=("${TAG_ARGS[@]}")
# testOutputDir は config にも書いてあるが、**CWD 相対**に解決されるので
# runner から呼ぶと repo の外（../e2e-results）に出てしまう。CLI フラグは
# config より優先される（公式明記）ので、必ず絶対パスで上書きする。
CMD+=(--test-output-dir "$RESULTS")
CMD+=(--format JUNIT --output "$RESULTS/report.xml")
CMD+=("${ENV_ARGS[@]}")
[ ${#PASSTHRU[@]} -gt 0 ] && CMD+=("${PASSTHRU[@]}")
CMD+=("${FLOW_DIRS[@]}")

log "profile=$PROFILE platform=$PLATFORM suite=$SUITE"
log "config=$(basename "$CONFIG")  web=$WEB_BASE_URL  app=${APP_ID:-<unset>}"
if [ "$PROFILE" = "local" ]; then
  log "supabase=$E2E_SUPABASE_URL  mail=$MAIL_API_URL  account=$([ -n "$E2E_SERVICE_ROLE_KEY" ] && echo 'ephemeral (admin API)' || echo 'provided')"
else
  log "account=provided (E2E_EMAIL)  — mailbox / admin なフローは除外される"
fi

if [ "$DRY_RUN" = 1 ]; then
  # 値は出さない（資格情報を混ぜないため、-e はキー名だけ見せる）
  printf '%s ' "${CMD[@]}" | sed -E 's/(SUPABASE_SERVICE_ROLE_KEY|E2E_PASSWORD|TEST_PASSWORD)=[^ ]*/\1=<redacted>/g'
  printf '\n'
  exit 0
fi

for d in "${FLOW_DIRS[@]}"; do
  [ -d "$d" ] || die "flow directory not found: $d"
done

ensure_local_stack
prepare_web_driver
mkdir -p "$RESULTS"

# 実行のたびに出る宣伝と匿名解析を止める（CI のログが読めなくなるため）
export MAESTRO_CLI_NO_ANALYTICS="${MAESTRO_CLI_NO_ANALYTICS:-true}"
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED="${MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED:-true}"

# スクリーンショットを「順番に見られる 1 本の道」に積み直す。
# --watch は実行中に走り、新しいスクショが出るたびに
# e2e-results/maestro/shots/NNN-<flow>-<name>.png へ通し番号つきで複製する
# （フローごとのバンドルに散らばったままでは、走っている最中に追えない）。
if [ "$SHOTS" = 1 ]; then
  node "$ROOT/scripts/e2e/shots.mjs" --watch --reset --dir "$RESULTS" &
  SHOTS_PID=$!
fi

# 走らせる直前にもう一度だけ生存確認する。
# ここが落ちていると全フローが 2 秒で失敗し、しかもエラーは
# 「要素が見つからない」なので**アプリのバグに見える**（実際に踏んだ）。
case "$PLATFORM" in
  web|all)
    curl -sf -o /dev/null "$WEB_BASE_URL/${LOCALE}/login" 2>/dev/null \
      || die "web app is not responding at $WEB_BASE_URL just before the run
     （前の実行で起動したサーバが死んでいる / 別プロセスがポートを掴んでいる可能性）"
    ;;
esac

log "running: maestro test (report -> $RESULTS/report.xml)"
set +e
"${CMD[@]}"
STATUS=$?
set -e

if [ "$SHOTS" = 1 ]; then
  kill "$SHOTS_PID" 2>/dev/null || true
  SHOTS_PID=""
  # 走り終わったら、ステップ列（commands.json）と突き合わせた 1 枚の HTML にする。
  node "$ROOT/scripts/e2e/shots.mjs" --dir "$RESULTS"
  log "screenshots: $RESULTS/shots/  (open $RESULTS/storyboard.html)"
fi

exit $STATUS
