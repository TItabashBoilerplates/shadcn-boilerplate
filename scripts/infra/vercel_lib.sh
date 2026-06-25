#!/usr/bin/env bash
# Vercel REST API の共通ヘルパ（vercel.sh / wire.sh が source する）。
# lib.sh を先に source しておくこと（log/ok/warn/git_branch_for を使う）。
# 認証は VERCEL_TOKEN（Bearer）。team スコープは VERCEL_TEAM_ID（任意）。
set -euo pipefail

VERCEL_API="https://api.vercel.com"

vercel_team_query() {
  local tid="${VERCEL_TEAM_ID:-}"
  [ -n "$tid" ] && printf '?teamId=%s' "$tid" || printf ''
}

# vapi METHOD PATH [json-body]   （PATH 内に既に ? がある場合は & で team を足す）
vapi() {
  local method="$1" path="$2" body="${3:-}"
  local sep tq; tq="$(vercel_team_query)"
  if [ -n "$tq" ] && [[ "$path" == *\?* ]]; then tq="&${tq#\?}"; fi
  local url="${VERCEL_API}${path}${tq}"
  if [ -n "$body" ]; then
    curl -fsS -X "$method" "$url" \
      -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      -H "Content-Type: application/json" -d "$body"
  else
    curl -fsS -X "$method" "$url" -H "Authorization: Bearer ${VERCEL_TOKEN}"
  fi
}

# vercel_env_set PROJECT KEY VALUE ENVNAME
#   ENVNAME: dev|staging|production
#   production → target=["production"]、それ以外 → target=["preview"] + gitBranch（ブランチ別出し分け）
#   upsert=true で既存キーは更新（再実行で 403 にならない）。
vercel_env_set() {
  local project="$1" key="$2" value="$3" env="$4"
  local body
  if [ "$env" = "production" ]; then
    body="$(jq -n --arg k "$key" --arg v "$value" \
      '{key:$k, value:$v, type:"encrypted", target:["production"]}')"
  else
    local gitb; gitb="$(git_branch_for "$env")"   # staging|develop
    body="$(jq -n --arg k "$key" --arg v "$value" --arg b "$gitb" \
      '{key:$k, value:$v, type:"encrypted", target:["preview"], gitBranch:$b}')"
  fi
  if vapi POST "/v10/projects/${project}/env?upsert=true" "$body" >/dev/null 2>&1; then
    ok "vercel env [${env}] ${key} 設定"
  else
    warn "vercel env [${env}] ${key} 設定 skip（project / token / 値を確認）"
  fi
}
