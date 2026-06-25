#!/usr/bin/env bash
# Supabase を「1 project（=production）+ persistent branch（staging/develop）」で用意する。
#
# 公式の Branching 2.0 想定（staging/QA/development は persistent branch 推奨）に従う:
#   - project は **1つだけ**（環境 prefix は付けない）。default branch = git の main = production。
#   - staging/develop は persistent branch として作成し、git branch に紐付ける（git_branch）。
#   - branch DB は production の db dump で初期化されるため空にはならない。Drizzle の追加差分は
#     migrate.yml が各 env の DATABASE_URL（= 各 branch の接続情報を Doppler/env に格納）へ適用。
#
# - project 作成: `supabase projects create`（CLI、実機 v2.90 でフラグ確認済み）。
# - branch 作成: Management API `POST /v1/projects/{ref}/branches`（body の git_branch/persistent は
#   公式 reference で確認済み。CLI の git 紐付けフラグは未明記のため API を使う）。
# - 前提: project の GitHub Integration（Branching 有効化）は dashboard 済み（runbook Phase 0）。
#   未有効だと branch 作成 API は失敗する → warn して dashboard へ誘導（停止はしない）。
# ⚠️ persistent branch は long-lived = 常時 compute 課金（Micro 約 $0.0134/h, Spend Cap 対象外）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"

SUPABASE_API="https://api.supabase.com"

sb_api() {
  # sb_api METHOD PATH [json-body]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -fsS -X "$method" "${SUPABASE_API}${path}" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
      -H "Content-Type: application/json" -d "$body"
  else
    curl -fsS -X "$method" "${SUPABASE_API}${path}" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"
  fi
}

existing_ref_for_name() {
  supabase projects list -o json 2>/dev/null \
    | jq -r --arg n "$1" '.[] | select(.name == $n) | .id' | head -1
}

ensure_project() {
  local name="$1" ref
  ref="$(existing_ref_for_name "$name")"
  if [ -n "$ref" ]; then
    ok "Supabase project '$name' は存在（ref=$ref）"
  else
    require_env SUPABASE_DB_PASSWORD
    log "Supabase project '$name'（=production, 単一）を作成..."
    ref="$(supabase projects create "$name" \
            --org-id "$SUPABASE_ORG_ID" \
            --db-password "$SUPABASE_DB_PASSWORD" \
            --region "$SUPABASE_REGION" \
            --size "$SUPABASE_SIZE" \
            --yes -o json 2>/dev/null | jq -r '.id')"
    [ -n "$ref" ] && [ "$ref" != "null" ] || die "project '$name' 作成に失敗（ref 取得不可）"
    ok "作成: $name (ref=$ref)"
  fi
  printf '%s' "$ref"
}

branch_exists() {
  # branch_exists PROD_REF BRANCH_NAME
  sb_api GET "/v1/projects/$1/branches" 2>/dev/null \
    | jq -e --arg n "$2" 'any(.[]; .name == $n or .branch_name == $n)' >/dev/null 2>&1
}

ensure_persistent_branch() {
  # ensure_persistent_branch PROD_REF GIT_BRANCH
  local ref="$1" gitb="$2"
  if branch_exists "$ref" "$gitb"; then
    ok "Supabase persistent branch '$gitb' は存在"
    return 0
  fi
  log "persistent branch '$gitb' を作成（Management API）..."
  local body
  body="$(jq -n --arg b "$gitb" --arg r "$SUPABASE_REGION" --arg s "$SUPABASE_SIZE" \
    '{branch_name:$b, git_branch:$b, persistent:true, region:$r, desired_instance_size:$s}')"
  if sb_api POST "/v1/projects/$ref/branches" "$body" >/dev/null 2>&1; then
    ok "persistent branch '$gitb' を作成（git_branch=$gitb）"
  else
    warn "branch '$gitb' 作成 skip。Branching(GitHub Integration) が dashboard で有効か確認（runbook Phase 0）。"
  fi
}

main() {
  require_tool supabase
  require_tool jq
  require_tool curl
  load_config
  require_env SUPABASE_ACCESS_TOKEN
  : "${APP_NAME:?config.env に APP_NAME が必要}"
  : "${SUPABASE_ORG_ID:?}"; : "${SUPABASE_REGION:?}"; : "${SUPABASE_SIZE:?}"

  # 1 project（prefix なし）。これが production。
  local prod_ref
  prod_ref="$(ensure_project "$APP_NAME")"
  record_output "SUPABASE_REF" "$prod_ref"

  # 非 production 環境は persistent branch として用意（git branch に紐付け）。
  local env gitb
  for env in $INFRA_ENVS; do
    [ "$env" = "production" ] && continue
    gitb="$(git_branch_for "$env")"     # staging / develop
    ensure_persistent_branch "$prod_ref" "$gitb"
  done

  warn "各 persistent branch の接続情報は 'supabase branches get <branch> -o env' の POSTGRES_URL_NON_POOLING。"
  warn "それを Doppler の stg/dev config（DATABASE_URL 等）に格納すると migrate.yml がそのまま使える（runbook Phase 2）。"
}

main "$@"
