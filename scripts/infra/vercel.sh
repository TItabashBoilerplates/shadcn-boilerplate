#!/usr/bin/env bash
# Vercel project の作成 + GitHub repo 接続 + rootDirectory 設定 + 静的な非機密 env 投入。
#
# 2 つの Vercel project を作る:
#   - web     : Next.js フロント（framework=nextjs, rootDirectory=frontend/apps/web）
#   - backend : uv workspace（rootDirectory=backend-py）。framework は付けない（"other"）。
#     → backend-py/vercel.json の `services` がアプリごとに Dockerfile を指し（api =
#       apps/api/Dockerfile.vercel）、Vercel が service 単位で別コンテナをビルドする
#       （https://vercel.com/docs/functions/container-images）。アプリ追加時は vercel.json に
#       service + rewrite を足すだけ（provisioning 側の変更不要）。
#
# CLI には既知の対話プロンプトバグ(#15763: preview env)や rootDirectory 設定フラグ欠如が
# あるため、**REST API(https://api.vercel.com) を直叩き**する（VC_TOKEN で Bearer 認証）。
#
# ⚠️ 前提: Vercel GitHub App が対象 repo に install 済み（dashboard, 一度きり）でないと
#    gitRepository 紐付けは失敗する（runbook Phase 0）。
# ⚠️ secret（外部 API キー等）は投入しない → Doppler ネイティブ連携。
#    Supabase URL/publishable key・backend エンドポイント等の **生成値は wire.sh が自動配線**する
#    （手動管理しない）。ここで投入するのは env/frontend/.env.<env> の **真に静的な非機密値**のみ。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"
# shellcheck source=scripts/infra/vercel_lib.sh
. "$SCRIPT_DIR/vercel_lib.sh"

# ensure_project NAME ROOT_DIR [FRAMEWORK]
#   FRAMEWORK 省略時は framework を付けない（Dockerfile コンテナ等の "other" project）。
ensure_project() {
  local name="$1" root="$2" framework="${3:-}"
  local out_id="$4" out_name="$5"   # record_output 用のキー名
  if vapi GET "/v9/projects/${name}" >/dev/null 2>&1; then
    ok "Vercel project '$name' は存在"
  else
    log "Vercel project '$name' を作成（repo 接続 + rootDirectory=${root}）..."
    local body
    if [ -n "$framework" ]; then
      body="$(jq -n --arg name "$name" --arg repo "$GH_REPO" --arg root "$root" --arg fw "$framework" \
        '{name:$name, framework:$fw, rootDirectory:$root,
          gitRepository:{type:"github", repo:$repo}}')"
    else
      body="$(jq -n --arg name "$name" --arg repo "$GH_REPO" --arg root "$root" \
        '{name:$name, framework:null, rootDirectory:$root,
          gitRepository:{type:"github", repo:$repo}}')"
    fi
    vapi POST "/v11/projects" "$body" >/dev/null \
      || die "project '$name' 作成に失敗（GitHub App install 済みか / API version を確認）"
    ok "作成: $name"
  fi
  # rootDirectory を冪等に再保証
  vapi PATCH "/v9/projects/${name}" \
    "$(jq -n --arg root "$root" '{rootDirectory:$root}')" >/dev/null 2>&1 || true
  local pid; pid="$(vapi GET "/v9/projects/${name}" 2>/dev/null | jq -r '.id')"
  record_output "$out_id" "$pid"
  record_output "$out_name" "$name"
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
  require_env VC_TOKEN
  : "${APP_NAME:?}"; : "${GH_REPO:?}"; : "${VERCEL_ROOT_DIR:?}"
  : "${VERCEL_BACKEND_PROJECT:?}"; : "${VERCEL_BACKEND_ROOT_DIR:?}"

  # web（Next.js）
  ensure_project "$APP_NAME" "$VERCEL_ROOT_DIR" "nextjs" \
    "VERCEL_PROJECT_ID" "VERCEL_PROJECT"

  # backend（FastAPI / Dockerfile.vercel コンテナ）。framework は付けない。
  ensure_project "$VERCEL_BACKEND_PROJECT" "$VERCEL_BACKEND_ROOT_DIR" "" \
    "VERCEL_BACKEND_PROJECT_ID" "VERCEL_BACKEND_PROJECT_NAME"

  local env
  for env in $INFRA_ENVS; do
    push_static_env "$APP_NAME" "$env"
  done

  ok "Vercel project OK（web + backend）。生成値の配線は wire.sh、runtime secret は Doppler→Vercel 連携）"
}

main "$@"
