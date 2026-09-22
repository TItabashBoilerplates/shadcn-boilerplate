#!/usr/bin/env bash
# Vercel project の作成 + GitHub repo 接続 + 静的な非機密 env 投入。
#
# **project は 1 つだけ**。web(Next.js) と backend-py（FastAPI コンテナ）は
# リポジトリルートの `vercel.json` の `services` として同じ project・同じドメインに載る。
# Vercel 公式が polyglot な monorepo に推奨している構成:
#   > Services let you deploy multiple backends and frontends within a single Vercel
#   > project. ... replacing the need to split monorepos into separate Vercel projects.
#   （https://vercel.com/docs/services）
#
# したがって Root Directory は **リポジトリルート**（rootDirectory を設定しない）。
# framework も指定しない（service ごとに vercel.json が持つ）。
#   ⚠️ rootDirectory が残っているとルートの vercel.json が読まれず services が無視される。
#   ⚠️ コンテナのビルドコンテキストは Dockerfile のあるディレクトリで固定
#      （contextDir = dirname(Dockerfile)、上書き不可）なので、backend-py/Dockerfile.vercel は
#      service の root = backend-py のまま動く。
#      実測と出典: docs/_research/2026-08-22-vercel-services-container-build-context.md
#
# CLI には既知の対話プロンプトバグ(#15763: preview env)や rootDirectory 設定フラグ欠如が
# あるため、**REST API(https://api.vercel.com) を直叩き**する（VERCEL_TOKEN で Bearer 認証）。
#
# ⚠️ 前提: Vercel GitHub App が対象 repo に install 済み（dashboard, 一度きり）でないと
#    gitRepository 紐付けは失敗する（runbook Phase 0）。
# ⚠️ 前提: Services は「Permissions Required（🔒）」機能。対象 team で有効化が要る。
# ⚠️ secret（外部 API キー等）は投入しない → Doppler ネイティブ連携。
#    mobile / desktop 向けの backend URL 等の **生成値は wire.sh が自動配線**する
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
    log "Vercel project '$name' を作成（repo 接続 / Root Directory = リポジトリルート）..."
    # rootDirectory を渡さない = リポジトリルート。framework も渡さない
    # （services が web=nextjs / api=container を宣言するため）。
    local body
    body="$(jq -n --arg name "$name" --arg repo "$GH_REPO" \
      '{name:$name, framework:null, gitRepository:{type:"github", repo:$repo}}')"
    vapi POST "/v11/projects" "$body" >/dev/null \
      || die "project '$name' 作成に失敗（GitHub App install 済みか / Services が有効かを確認）"
    ok "作成: $name"
  fi

  # Root Directory / framework はリポジトリルート・未指定（null）に冪等に寄せる。
  # 旧構成（web=frontend/apps/web と backend=backend-py の 2 project）から移行した場合、
  # ここが残っているとルートの vercel.json が読まれず services が無視される。
  vapi PATCH "/v9/projects/${name}" '{"rootDirectory":null,"framework":null}' >/dev/null \
    || die "project '$name' の rootDirectory / framework を空に戻せません"

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
  : "${APP_NAME:?}"; : "${GH_REPO:?}"

  [ -f "$PROJECT_ROOT/vercel.json" ] \
    || die "リポジトリルートに vercel.json がありません（services の定義が正本です）"

  ensure_project "$APP_NAME"
  # コンテナ service の listen ポート（Dockerfile の ENV PORT）。既定の 80 は非 root で bind できない。
  push_container_port "$APP_NAME" "$PROJECT_ROOT"

  local env
  for env in $INFRA_ENVS; do
    push_static_env "$APP_NAME" "$env"
  done

  ok "Vercel project OK（1 project / services は vercel.json）。生成値の配線は wire.sh、runtime secret は Doppler→Vercel 連携"
}

main "$@"
