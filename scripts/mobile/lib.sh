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
    # ⚠️ 外側の `doppler run` は自分の DOPPLER_PROJECT / DOPPLER_CONFIG を**子プロセスの env に
    #    入れて**渡す。内側で --project を省くと、アプリの config をトークン側の project から
    #    探しにいき `This token does not have access to requested config 'prd'` で落ちる。
    #    そこで 2 段構成のときだけ、アプリ側の project を明示する。
    local app_project; app_project="$(mobile_doppler_app_project)"
    [ -n "$app_project" ] || mdie "アプリ側の Doppler project が分かりません。\
'doppler setup' で紐付けるか、scripts/mobile/config.env の MOBILE_APP_DOPPLER_PROJECT に書いてください。"
    exec doppler run --project "$MOBILE_TOKENS_PROJECT" \
                     --config "${MOBILE_TOKENS_CONFIG:-prd}" -- \
         doppler run --project "$app_project" --config "$cfg" -- \
         env _MOBILE_DOPPLER=1 bash "$0" "$@"
  fi

  # 1 段だけのときは scope の解決を doppler に任せる（doppler.yaml の `path:` で
  # ディレクトリごとに別 project を紐付けている構成を、こちらで上書きしないため）。
  if [ -n "${MOBILE_APP_DOPPLER_PROJECT:-}" ]; then
    exec doppler run --project "$MOBILE_APP_DOPPLER_PROJECT" --config "$cfg" -- \
         env _MOBILE_DOPPLER=1 bash "$0" "$@"
  fi
  exec doppler run --config "$cfg" -- env _MOBILE_DOPPLER=1 bash "$0" "$@"
}

# アプリ側の Doppler project 名。config.env の宣言が最優先で、無ければ `doppler setup` の
# ローカル紐付け（~/.doppler/.doppler.yaml）から読む。
# --no-read-env は、外側の `doppler run` が入れた DOPPLER_PROJECT を拾わないため（必須）。
mobile_doppler_app_project() {
  if [ -n "${MOBILE_APP_DOPPLER_PROJECT:-}" ]; then
    printf '%s\n' "$MOBILE_APP_DOPPLER_PROJECT"
    return 0
  fi
  doppler configure get project --plain --no-read-env 2>/dev/null || true
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

# 署名 ID（"Apple Distribution: Example Inc. (ABCDE12345)"）から Team ID を取り出す。
# Team ID は ASC API キーからは自動検出できないので、これが最後の頼み。
# ⚠️ grep は不一致で exit 1 を返す。握らないと、set -e + pipefail の呼び出し元が
#    代入の時点で**無言のまま**落ち、「Doppler に登録してください」という案内に到達しない。
mobile_apple_team_id() {
  printf '%s' "${1:-}" | grep -oE '\(([A-Z0-9]{10})\)' | tr -d '()' | head -1 || true
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
  local file="$APP_DIR/.env.eas"

  # ⚠️ 抽出を `env` の行舐めでやると、**改行を含む値が黙って尻切れ**になり、
  #    壊れた値が EAS に入る（ビルドは通り、実行時にしか分からない）。os.environ を直接読む。
  #    出す情報はキー名だけ（値はレポートにもログにも書かない）。
  local report; report="$(mktemp)"
  local PUSHED="" EMPTY="" MULTILINE="" AMBIGUOUS="" COUNT=0 status=0
  MOBILE_ENV_FILE="$file" MOBILE_ENV_REPORT="$report" python3 - <<'PY' || status=$?
import os
import re

PREFIX = "EXPO_PUBLIC_"
NAME = re.compile(r"\AEXPO_PUBLIC_[A-Za-z0-9_]+\Z")

pushed, empty, multiline, ambiguous = [], [], [], []
for key, value in sorted(os.environ.items()):
    if not key.startswith(PREFIX) or not NAME.match(key):
        continue
    if value == "":
        empty.append(key)            # EAS は空文字を拒否する（Variable value can not be empty）
    elif "\n" in value or "\r" in value:
        multiline.append(key)        # 1 行 1 変数の .env には書けない
    else:
        pushed.append(key)
        # dotenv の解釈が処理系で割れる文字。push はするが目視確認を促す。
        if value != value.strip() or any(c in value for c in "\"'#"):
            ambiguous.append(key)

with open(os.environ["MOBILE_ENV_REPORT"], "w", encoding="utf-8") as report:
    report.write(f"PUSHED='{' '.join(pushed)}'\n")
    report.write(f"EMPTY='{' '.join(empty)}'\n")
    report.write(f"MULTILINE='{' '.join(multiline)}'\n")
    report.write(f"AMBIGUOUS='{' '.join(ambiguous)}'\n")
    report.write(f"COUNT={len(pushed)}\n")

if multiline or not pushed:
    raise SystemExit(0)              # 不備があるときは .env.eas を作らない

with open(os.environ["MOBILE_ENV_FILE"], "w", encoding="utf-8") as env_file:
    for key in pushed:
        env_file.write(f"{key}={os.environ[key]}\n")
PY
  if [ "$status" -ne 0 ] || [ ! -s "$report" ]; then
    rm -f "$report"
    mdie "EXPO_PUBLIC_* の抽出に失敗しました（python3 の出力を確認してください）"
  fi
  # shellcheck disable=SC1090
  . "$report"; rm -f "$report"

  if [ -n "$MULTILINE" ]; then
    mdie "改行を含む EXPO_PUBLIC_* は .env 経由で push できません:${MULTILINE}（Doppler の値を 1 行に直すか、EAS 側で直接設定してください）"
  fi
  if [ "$COUNT" -eq 0 ]; then
    mdie "EXPO_PUBLIC_* が env にありません（Doppler の $(mobile_doppler_config) config を確認）"
  fi
  [ -f "$file" ] || mdie ".env.eas を生成できませんでした: ${file}"

  mlog "EXPO_PUBLIC_* (${COUNT} 件) を EAS[${environment}] へ push"
  # shellcheck disable=SC2086
  printf '    %s\n' $PUSHED
  [ -z "$EMPTY" ] || mwarn "値が空のため push しないキー:${EMPTY}（該当機能はビルドで無効になる）"
  [ -z "$AMBIGUOUS" ] || mwarn "引用符 / # / 前後の空白を含む値:${AMBIGUOUS}（push 後に eas env:list で取り違えが無いか確認）"

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
