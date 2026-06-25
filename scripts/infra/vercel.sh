#!/usr/bin/env bash
# Vercel project の作成 + GitHub repo 接続 + rootDirectory 設定 + 静的な非機密 env 投入。
# CLI には既知の対話プロンプトバグ(#15763: preview env)や rootDirectory 設定フラグ欠如が
# あるため、**REST API(https://api.vercel.com) を直叩き**する（VERCEL_TOKEN で Bearer 認証）。
#
# ⚠️ 前提: Vercel GitHub App が対象 repo に install 済み（dashboard, 一度きり）でないと
#    gitRepository 紐付けは失敗する（runbook Phase 0）。
# ⚠️ secret（外部 API キー等）は投入しない → Doppler ネイティブ連携。
#    Supabase URL/publishable key・Railway エンドポイント等の **生成値は wire.sh が自動配線**する
#    （手動管理しない）。ここで投入するのは env/frontend/.env.<env> の **真に静的な非機密値**のみ。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"
# shellcheck source=scripts/infra/vercel_lib.sh
. "$SCRIPT_DIR/vercel_lib.sh"

ensure_project() {
  local name="$1"
  if vapi GET "/v9/projects/${name}" >/dev/null 2>&1; then
    ok "Vercel project '$name' は存在"
  else
    log "Vercel project '$name' を作成（repo 接続 + rootDirectory）..."
    local body
    body="$(jq -n --arg name "$name" --arg repo "$GH_REPO" --arg root "$VERCEL_ROOT_DIR" \
      '{name:$name, framework:"nextjs", rootDirectory:$root,
        gitRepository:{type:"github", repo:$repo}}')"
    vapi POST "/v11/projects" "$body" >/dev/null \
      || die "project 作成に失敗（GitHub App install 済みか / API version を確認）"
    ok "作成: $name"
  fi
  # rootDirectory を冪等に再保証
  vapi PATCH "/v9/projects/${name}" \
    "$(jq -n --arg root "$VERCEL_ROOT_DIR" '{rootDirectory:$root}')" >/dev/null 2>&1 || true
  local pid; pid="$(vapi GET "/v9/projects/${name}" 2>/dev/null | jq -r '.id')"
  record_output "VERCEL_PROJECT_ID" "$pid"
  record_output "VERCEL_PROJECT" "$name"
}

# env/frontend/.env.<env> の静的な非機密 KEY=VALUE を投入（生成値は wire.sh 担当）。
push_static_env() {
  local name="$1" env="$2"
  local file="$PROJECT_ROOT/env/frontend/.env.${env}"
  [ -f "$file" ] || { warn "static env file 無し（skip）: env/frontend/.env.${env}"; return 0; }
  local line key val
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    key="${line%%=*}"; val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"
    [ -n "$key" ] || continue
    vercel_env_set "$name" "$key" "$val" "$env"
  done < "$file"
}

main() {
  require_tool curl
  require_tool jq
  load_config
  require_env VERCEL_TOKEN
  : "${APP_NAME:?}"; : "${GH_REPO:?}"; : "${VERCEL_ROOT_DIR:?}"

  ensure_project "$APP_NAME"

  local env
  for env in $INFRA_ENVS; do
    push_static_env "$APP_NAME" "$env"
  done

  ok "Vercel project OK（生成値の配線は wire.sh、runtime secret は Doppler→Vercel 連携）"
}

main "$@"
