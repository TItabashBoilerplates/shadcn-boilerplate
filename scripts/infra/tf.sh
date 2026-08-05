#!/usr/bin/env bash
# Terraform(OpenTofu) ラッパー。devenv の tf-* script から呼ばれる。
#
#   tf.sh <subcommand> <app> [extra args...]
#     例: tf.sh plan myapp
#         tf.sh apply myapp -auto-approve
#
# 役割:
#   1. 実行バイナリの解決（既定は tofu。TF_BIN で上書き可）
#   2. **トークンの読み替え**（Doppler の非予約キー名 → provider が読む環境変数）
#   3. アプリごとの workspace 選択 + tfvars の指定
#
# トークンは devenv script が `doppler run` で bootstrap config から注入する。
# 値は stdout / ログに出さない（キー名のみ扱う）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TF_DIR="$PROJECT_ROOT/terraform"

# ── 1. 実行バイナリ ──────────────────────────────────────────────────────────
# 既定は OpenTofu（devenv.nix が pkgs.opentofu を入れている）。
# HashiCorp 製 CLI を使う場合は TF_BIN=terraform（terraform/README.md の手順を参照）。
TF_BIN="${TF_BIN:-tofu}"
have "$TF_BIN" || die "'$TF_BIN' が見つかりません。devenv shell 内で実行してください（TF_BIN で切替可）。"

# ── 2. トークンの読み替え ────────────────────────────────────────────────────
# Doppler には `GITHUB_` / `SUPABASE_` / `VERCEL_` prefix のキーを登録できないため
# （.claude/rules/env-naming.md）、bootstrap config では prefix を落とした名前で保持し、
# provider が読む名前へこのプロセス内でのみ写す（= Doppler への登録ではないので同ルール §5 の対象外）。
bridge_env() {
  # bridge_env FROM TO — FROM が空なら何もしない（未設定は各 provider 側でエラーにする）
  local from="$1" to="$2"
  local val="${!from:-}"
  [ -n "$val" ] || return 0
  export "$to=$val"
}

bridge_env SB_ACCESS_TOKEN          SUPABASE_ACCESS_TOKEN
bridge_env VC_TOKEN                 VERCEL_API_TOKEN
bridge_env GH_TOKEN                 GITHUB_TOKEN
bridge_env DOPPLER_MANAGEMENT_TOKEN DOPPLER_TOKEN
# DB パスワードは tfvars に書かず変数として渡す。
bridge_env SB_DB_PASSWORD           TF_VAR_supabase_db_password

# ── 3. 引数 ─────────────────────────────────────────────────────────────────
usage() {
  cat >&2 <<'USAGE'
usage: tf-<subcommand> <app> [extra args...]

  <app> は terraform/apps/<app>.tfvars に対応する名前。
  workspace も同名で選択される（state をアプリごとに分離するため）。

  例:
    tf-init myapp
    tf-plan myapp
    tf-apply myapp
    tf-apply myapp -auto-approve
    tf-output myapp
USAGE
  exit 1
}

[ "$#" -ge 1 ] || usage
SUBCOMMAND="$1"; shift
[ "$#" -ge 1 ] || usage
APP="$1"; shift

VAR_FILE="$TF_DIR/apps/${APP}.tfvars"
if [ ! -f "$VAR_FILE" ]; then
  die "tfvars がありません: terraform/apps/${APP}.tfvars
  → terraform/apps/example.example.tfvars をコピーして作成してください。"
fi

cd "$TF_DIR"

# ── 4. init / workspace ─────────────────────────────────────────────────────
# init は毎回実行してよい（provider が揃っていれば数秒で終わる冪等な操作）。
log "$TF_BIN init（provider / backend の同期）"
"$TF_BIN" init -input=false >/dev/null

# アプリごとに state を分離する。既存なら選択、無ければ作成。
if ! "$TF_BIN" workspace select "$APP" >/dev/null 2>&1; then
  log "workspace '$APP' を作成"
  "$TF_BIN" workspace new "$APP" >/dev/null
fi
ok "workspace: $APP"

# ── 5. 実行 ─────────────────────────────────────────────────────────────────
case "$SUBCOMMAND" in
  init)
    ok "init 完了（workspace=$APP）"
    ;;
  plan | apply | destroy)
    exec "$TF_BIN" "$SUBCOMMAND" -input=false -var-file="$VAR_FILE" "$@"
    ;;
  output)
    exec "$TF_BIN" output "$@"
    ;;
  *)
    die "未知のサブコマンド: $SUBCOMMAND（init|plan|apply|destroy|output）"
    ;;
esac
