#!/usr/bin/env bash
# Railway の project / environment(dev,staging) / 非機密 variables を用意する。
#
# ⚠️ 構造的制約（公式仕様・runbook Phase 0/2）:
#   - GitHub repo の OAuth リンク + App install は **dashboard 専用**（CLI 不可）。
#     これが済んでいる前提で `railway add --repo` を使う。
#   - branch→environment の auto-deploy 紐付けも **dashboard 専用**。
#   - `railway add --repo` が auto-deploy 連携 service を作るか空 service かは要検証
#     （未確定なら dashboard で service を作成）。
# ⚠️ secret は投入しない（runtime secret は Doppler→Railway ネイティブ連携で sync）。
# 認証: RAILWAY_API_TOKEN（account/workspace, project 作成用）/ RAILWAY_TOKEN（project 操作用）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"

# Railway の環境名（このリポジトリの env 名に合わせる）。production は Railway 既定。
railway_env_name() { echo "$1"; }  # dev|staging|production をそのまま使う

ensure_environment() {
  local envname="$1"
  # production は既定で存在。dev/staging は無ければ作成（冪等・best-effort）。
  if [ "$envname" = "production" ]; then
    ok "Railway environment 'production'（既定）"
    return 0
  fi
  if railway environment "$envname" >/dev/null 2>&1; then
    ok "Railway environment '$envname' は存在"
  else
    railway environment new "$envname" >/dev/null 2>&1 \
      && ok "Railway environment '$envname' を作成" \
      || warn "environment '$envname' 作成 skip（既存 or 要 dashboard）"
  fi
}

# env/backend/.env.<env> の非機密 KEY=VALUE を Railway variables に投入。
push_nonsecret_vars() {
  local envname="$1"
  local file="$PROJECT_ROOT/env/backend/.env.${envname}"
  [ -f "$file" ] || { warn "env file 無し（skip）: env/backend/.env.${envname}"; return 0; }
  local line key val
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    key="${line%%=*}"; val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"
    [ -n "$key" ] || continue
    railway variables --set "${key}=${val}" --environment "$envname" >/dev/null 2>&1 \
      && ok "railway var ${envname}: ${key}" \
      || warn "railway var ${envname}: ${key} 投入 skip"
  done < "$file"
}

main() {
  require_tool railway
  load_config
  require_env RAILWAY_API_TOKEN
  : "${APP_NAME:?}"; : "${GH_REPO:?}"

  # project: 既にリンク済みなら status が通る。未作成なら init。
  if railway status >/dev/null 2>&1; then
    ok "Railway project は link 済み"
  else
    local ws_args=(); [ -n "$(optional_env RAILWAY_WORKSPACE_ID)" ] && ws_args=(--workspace "$RAILWAY_WORKSPACE_ID")
    railway init --name "$APP_NAME" "${ws_args[@]}" >/dev/null 2>&1 \
      && ok "Railway project '$APP_NAME' を作成" \
      || warn "railway init skip（既存 or 要 dashboard）。runbook 参照"
  fi

  # GitHub repo を service として接続（dashboard で App install 済み前提）。
  railway add --repo "$GH_REPO" >/dev/null 2>&1 \
    && ok "Railway service を repo '$GH_REPO' に接続" \
    || warn "railway add --repo skip。dashboard で repo 接続を確認（runbook Phase 2）"

  local env
  for env in $INFRA_ENVS; do
    ensure_environment "$env"
    push_nonsecret_vars "$env"
  done

  warn "branch→environment の auto-deploy 紐付けは dashboard 専用。runbook Phase 2 で設定。"
}

main "$@"
