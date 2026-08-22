#!/usr/bin/env bash
# Terraform ラッパー。devenv の tf-* script から呼ばれる。
#
#   tf.sh <subcommand> <app> [extra args...]
#     例: tf.sh plan myapp
#         tf.sh apply myapp -auto-approve
#
# 役割:
#   1. 実行バイナリの解決（既定は terraform。TF_BIN で上書き可）
#   2. **トークン名の橋渡し**（同じ資格情報を別名で読む provider のためだけ）
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
# 既定は HashiCorp 公式の terraform（devenv.nix が公式配布バイナリを入れている）。
# OpenTofu に切り替える場合は TF_BIN=tofu（terraform/README.md の手順を参照）。
TF_BIN="${TF_BIN:-terraform}"
have "$TF_BIN" || die "'$TF_BIN' が見つかりません。devenv shell 内で実行してください（TF_BIN で切替可）。"

# ── 2. トークン名の橋渡し ────────────────────────────────────────────────────
# Doppler のキー名は「その資格情報を使うツールが実際に読む名前」に揃えてある
# （.claude/rules/env-naming.md §4）。したがって大半の値は読み替え不要でそのまま届く:
#
#   SUPABASE_ACCESS_TOKEN → supabase provider / supabase CLI がこの名前で読む
#   DOPPLER_TOKEN         → doppler provider がこの名前で読む
#
# 読み替えが要るのは「同じ資格情報を 2 つのツールが別名で読む」ケースだけ:
#
#   VERCEL_TOKEN          → vercel CLI の名前。Terraform provider は VERCEL_API_TOKEN
#   GH_TOKEN              → gh CLI の公式名。Terraform provider は GITHUB_TOKEN
#                           （GITHUB_ prefix は GitHub Actions が全面的に予約しており
#                            Doppler 側に置けないので、正本は GH_TOKEN のまま）
#
# いずれもこのプロセス内の export であって Doppler への登録ではない（同ルール §5 の対象外）。
bridge_env() {
  # bridge_env FROM TO — FROM が空なら何もしない（未設定は各 provider 側でエラーにする）
  local from="$1" to="$2"
  local val="${!from:-}"
  [ -n "$val" ] || return 0
  export "$to=$val"
}

bridge_env VERCEL_TOKEN         VERCEL_API_TOKEN
bridge_env GH_TOKEN             GITHUB_TOKEN
# DB パスワードは tfvars に書かず変数として渡す（supabase CLI 側は SUPABASE_DB_PASSWORD を直接読む）。
bridge_env SUPABASE_DB_PASSWORD TF_VAR_supabase_db_password

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
