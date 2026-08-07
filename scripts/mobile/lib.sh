#!/usr/bin/env bash
# モバイルリリース script の共通ヘルパ（scripts/mobile/*.sh が source する）。
#
# 方針:
#   - **値は絶対に出さない**（キー名とファイルパスだけをログに出す）
#   - 一時的な資格情報は `frontend/apps/mobile/credentials/`（.gitignore 済み）に置き、
#     trap で必ず消す
#   - ビルドは **クラウド（expo.dev / EAS）と ローカル（--local）の両方**を同じ手順で扱う
set -euo pipefail

MOBILE_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$MOBILE_LIB_DIR/../.." && pwd)"

# 冒頭のコメントブロック（2 行目から最初の非コメント行まで）を --help の説明に使う。
mobile_usage() {
  awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$1"
}

# ── ログ ────────────────────────────────────────────────────────────────
mlog()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
mok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
mwarn() { printf '\033[0;33m⚠\033[0m %s\n' "$*" >&2; }
mdie()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── 設定（非機密。config.env が無くても既定値で動く）────────────────────
mobile_load_config() {
  local cfg="${MOBILE_CONFIG_FILE:-$MOBILE_LIB_DIR/config.env}"
  if [ -f "$cfg" ]; then
    # shellcheck disable=SC1090
    set -a; . "$cfg"; set +a
  fi
  MOBILE_APP_DIR="${MOBILE_APP_DIR:-frontend/apps/mobile}"
  APP_DIR="$REPO_ROOT/$MOBILE_APP_DIR"
  [ -d "$APP_DIR" ] || mdie "モバイルアプリが見つかりません: $MOBILE_APP_DIR"

  EAS_CLI_SPEC="${EAS_CLI_SPEC:-eas-cli@latest}"
  EAS_PROFILE="${EAS_PROFILE:-production}"
  CRED_DIR="$APP_DIR/credentials"
}

# ── Doppler からのシークレット注入 ──────────────────────────────────────
# 呼ばれた時点で未注入なら、`doppler run` で **自分自身を再実行**する。
#   外側(任意): MOBILE_TOKENS_PROJECT/CONFIG … アカウント共通のトークン
#               （EXPO_TOKEN / APPLE_* / PLAY_SERVICE_ACCOUNT_JSON）を別 project に置く構成用
#   内側      : アプリの Doppler config（ENV に対応。EXPO_PUBLIC_* 等）
# 単一 project 運用（doppler.yaml の既定）なら外側は不要なので自動で省略される。
mobile_doppler_reexec() {
  [ -z "${_MOBILE_DOPPLER:-}" ] || return 0
  command -v doppler >/dev/null 2>&1 \
    || mdie "doppler CLI がありません（devenv shell 内で実行してください）"

  local cfg; cfg="$(mobile_doppler_config)"
  mlog "Doppler からシークレットを注入して再実行します（config: ${cfg}）"
  if [ -n "${MOBILE_TOKENS_PROJECT:-}" ]; then
    exec doppler run --project "$MOBILE_TOKENS_PROJECT" \
                     --config "${MOBILE_TOKENS_CONFIG:-prd}" -- \
         doppler run --config "$cfg" -- \
         env _MOBILE_DOPPLER=1 bash "$0" "$@"
  fi
  exec doppler run --config "$cfg" -- env _MOBILE_DOPPLER=1 bash "$0" "$@"
}

# ENV → Doppler config。devenv.nix の loadDopplerByEnv と同じ対応表にすること。
mobile_doppler_config() {
  case "${ENV:-production}" in
    dev|development)     echo "dev" ;;
    stg|staging)         echo "stg" ;;
    prd|prod|production) echo "prd" ;;
    local)               echo "dev_personal" ;;
    *)                   echo "${ENV}" ;;
  esac
}

# ENV → EAS の Environment 名（eas.json の build.<profile>.environment と対応）。
mobile_eas_environment() {
  case "${ENV:-production}" in
    dev|development)     echo "development" ;;
    stg|staging)         echo "preview" ;;
    prd|prod|production) echo "production" ;;
    *)                   mdie "EAS environment に対応しない ENV です: ${ENV}" ;;
  esac
}

# ── EAS CLI ─────────────────────────────────────────────────────────────
# 認証は EXPO_TOKEN（Doppler）。`eas login` は不要。
eas_cli() { bunx "$EAS_CLI_SPEC" "$@"; }

mobile_require_expo_token() {
  : "${EXPO_TOKEN:?EXPO_TOKEN がありません（Doppler に登録してください）}"
}

# ── credentials/（実行中だけ存在する資格情報）──────────────────────────
mobile_init_credentials() {
  umask 077
  mkdir -p "$CRED_DIR"
  chmod 700 "$CRED_DIR"
}

# base64 でも生テキストでも受け取り、ファイルへ書き出す。
#   mobile_write_secret_file <値> <出力パス> <中身の検証パターン>
# 値は表示しない。検証に落ちたら「デコード結果が想定と違う」とだけ言う。
mobile_write_secret_file() {
  local value="$1" out="$2" expect="$3"
  umask 077
  if printf '%s' "$value" | grep -q "$expect"; then
    printf '%s\n' "$value" >"$out"
  else
    printf '%s' "$value" | base64 -d >"$out" 2>/dev/null \
      || mdie "$(basename "$out") のデコードに失敗しました（base64 か生テキストで登録してください）"
  fi
  grep -q "$expect" "$out" \
    || mdie "$(basename "$out") のデコード結果が想定の形式ではありません"
  chmod 600 "$out"
  mok "資格情報を展開: ${out#"$REPO_ROOT"/}（終了時に削除）"
}

# ── EXPO_PUBLIC_* を EAS の Environment Variables へ push ────────────────
# これが無いと EXPO_PUBLIC_SUPABASE_URL 等がバンドルに焼き込まれず、
# **ビルドしたアプリが起動直後にクラッシュする**。
#
# 対象は env にある EXPO_PUBLIC_* **全部**（この prefix は「バンドルに出てよい公開値」を
# 意味するので、prefix そのものが安全性の判定条件になっている）。サーバ側 secret は
# この prefix を持たないので自動的に除外される。
# EAS は空文字を拒否する（`Variable value can not be empty`）ので空値は push しないが、
# **落としたキーは必ず表示する**（黙って減らさない）。
mobile_push_public_env() {
  local environment="$1" dry="${2:-}"
  local file="$APP_DIR/.env.eas" skipped="" count=0

  : >"$file"
  local line
  while IFS= read -r line; do
    case "$line" in
      EXPO_PUBLIC_*=?*) printf '%s\n' "$line" >>"$file"; count=$((count + 1)) ;;
      EXPO_PUBLIC_*=)   skipped="$skipped ${line%%=*}" ;;
    esac
  done < <(env)

  if [ "$count" -eq 0 ]; then
    rm -f "$file"
    mdie "EXPO_PUBLIC_* が env にありません（Doppler の $(mobile_doppler_config) config を確認）"
  fi

  mlog "EXPO_PUBLIC_* (${count} 件) を EAS[${environment}] へ push"
  cut -d= -f1 "$file" | sed 's/^/    /'
  [ -n "$skipped" ] && mwarn "値が空のため push しないキー:$skipped（該当機能はビルドで無効になる）"

  if [ -n "$dry" ]; then
    mok "[dry-run] env:push は実行しません"
    rm -f "$file"
    return 0
  fi
  ( cd "$APP_DIR" && eas_cli env:push --environment "$environment" --path "$file" --force ) \
    || { rm -f "$file"; mdie "eas env:push に失敗（EXPO_TOKEN と project 設定を確認）"; }
  rm -f "$file"
  mok "EAS[${environment}] への push 完了"
}

# ── クラウドビルドの成果物 URL 抽出 ─────────────────────────────────────
# eas-cli の --json は成果物 URL を artifacts.applicationArchiveUrl に返す
# （トップレベルではない）。配列で返ることもある。
mobile_artifact_url() {
  python3 -c '
import json, sys
d = json.load(sys.stdin)
d = d[0] if isinstance(d, list) and d else d
art = (d or {}).get("artifacts") or {}
print(art.get("applicationArchiveUrl") or (d or {}).get("applicationArchiveUrl") or "")
'
}
