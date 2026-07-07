#!/usr/bin/env bash
# サービス間で「生成される値」を取得し、Doppler の各 config(dev/stg/prd) に格納する。
# 以降は Doppler ネイティブ連携が Vercel(backend) / Supabase(edge) 等へ fan-out し、
# migration(GitHub Actions) は Doppler から読む。= 生成値を手動管理しない。
#
# アーキテクチャ（ユーザー決定）:
#   - Supabase は独立所有。Vercel(web) へは Marketplace の「Connect Account」で Supabase env が
#     自動注入される（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 等）
#     → ここでは Vercel(web) に Supabase 値を入れない（二重化回避）。
#   - backend も Vercel project（Dockerfile.vercel コンテナ）。その公開ドメインを取得して
#     web/mobile に配る（NEXT_PUBLIC_BACKEND_PY_URL / EXPO_PUBLIC_BACKEND_PY_URL）。
#   - Vercel(web) 以外（Vercel backend / Expo mobile / Drizzle migration / edge）への配線は Doppler 経由。
#     よって本スクリプトは「Supabase 生成値 + backend endpoint を Doppler に格納」する。
#   - backend の公開ドメインは Marketplace 経由では web に入らないため、Doppler に入れて配り、
#     Vercel(web) には直接も set する（フォールバック）。
#
# ⚠️ 外部 API キー（OpenAI 等）は対象外（ユーザーが Doppler に直接投入）。ここで扱うのは
#    「プロビジョニングの結果生成される値」だけ。値は stdin 渡しで stdout/ログに出さない。
# ⚠️ Doppler への書き込みは full-access フェーズ前提（.claude/rules/mcp-doppler.md）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"
# shellcheck source=scripts/infra/vercel_lib.sh
. "$SCRIPT_DIR/vercel_lib.sh"

SUPABASE_API="https://api.supabase.com"

load_outputs() {
  [ -f "$OUTPUTS_FILE" ] || die "outputs($OUTPUTS_FILE)が無い。先に infra-bootstrap supabase を実行。"
  # shellcheck disable=SC1090
  set -a; . "$OUTPUTS_FILE"; set +a
}

# Doppler の config に KEY=VALUE を格納（値は stdin・非表示。空値は skip）。
doppler_put() {
  local slug="$1" key="$2" val="$3"
  [ -n "$val" ] || { warn "  [${slug}] ${key}: 値が空 → skip"; return 0; }
  if printf '%s' "$val" | doppler secrets set "$key" \
       --project "$DOPPLER_PROJECT" --config "$slug" --no-interactive --silent >/dev/null 2>&1; then
    ok "  [${slug}] ${key} → Doppler"
  else
    warn "  [${slug}] ${key} → Doppler 書込 skip（権限/フェーズ確認）"
  fi
}

# 出力グローバル: SB_URL / SB_PUB / SB_SECRET / SB_DBURL
resolve_supabase() {
  local env="$1"; SB_URL=""; SB_PUB=""; SB_SECRET=""; SB_DBURL=""
  if [ "$env" = "production" ]; then
    local ref="${SUPABASE_REF:-}"
    [ -n "$ref" ] || { warn "SUPABASE_REF が outputs に無い"; return 1; }
    SB_URL="https://${ref}.supabase.co"
    local keys
    keys="$(curl -fsS "${SUPABASE_API}/v1/projects/${ref}/api-keys?reveal=true" \
              -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" 2>/dev/null)" || true
    SB_PUB="$(printf '%s' "$keys" | jq -r 'map(select(.type=="publishable"))[0].api_key // (map(select(.name=="anon"))[0].api_key) // empty' 2>/dev/null)"
    SB_SECRET="$(printf '%s' "$keys" | jq -r 'map(select(.type=="secret"))[0].api_key // (map(select(.name=="service_role"))[0].api_key) // empty' 2>/dev/null)"
    # 直結(non-pooling) 接続。DDL/migration に適し、安定したホスト形式。
    SB_DBURL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${ref}.supabase.co:5432/postgres"
  else
    local gitb out; gitb="$(git_branch_for "$env")"
    out="$(supabase branches get "$gitb" -o env 2>/dev/null)" || { warn "branches get '$gitb' 失敗"; return 1; }
    SB_URL="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_URL=//p' | tr -d '"' | head -1)"
    SB_PUB="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' | tr -d '"' | head -1)"
    [ -n "$SB_PUB" ] || SB_PUB="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_ANON_KEY=//p' | tr -d '"' | head -1)"
    SB_SECRET="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_SECRET_KEY=//p' | tr -d '"' | head -1)"
    [ -n "$SB_SECRET" ] || SB_SECRET="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_SERVICE_ROLE_KEY=//p' | tr -d '"' | head -1)"
    SB_DBURL="$(printf '%s\n' "$out" | sed -n 's/^POSTGRES_URL_NON_POOLING=//p' | tr -d '"' | head -1)"
  fi
  [ -n "$SB_URL" ] && [ -n "$SB_PUB" ] || { warn "[$env] Supabase URL/publishable を取得できず"; return 1; }
}

# backend(Vercel) の各環境公開ドメイン（best-effort）→ "https://<domain>"
resolve_backend_domain() {
  local env="$1" url
  url="$(vercel_backend_url "$VERCEL_BACKEND_PROJECT" "$env")" || true
  [ -n "$url" ] || { warn "[$env] backend(Vercel) domain 取得できず（project/team slug/token を確認）"; return 1; }
  printf '%s' "$url"
}

main() {
  require_tool curl; require_tool jq; require_tool supabase; require_tool doppler
  load_config; load_outputs
  require_env SUPABASE_ACCESS_TOKEN
  require_env VERCEL_TOKEN          # web の Supabase 期待名を Vercel に直接 set / backend domain 取得
  : "${DOPPLER_PROJECT:?}"; : "${APP_NAME:?}"; : "${VERCEL_BACKEND_PROJECT:?}"

  local env slug backend
  for env in $INFRA_ENVS; do
    slug="$(doppler_config_for "$env")"
    printf '\n'; log "── 配線(→Doppler[%s]): %s ──" "$slug" "$env"

    # Supabase 生成値 → Doppler（Vercel backend/edge/migration/mobile が Doppler から受け取る）
    if resolve_supabase "$env"; then
      doppler_put "$slug" "SUPABASE_URL" "$SB_URL"
      doppler_put "$slug" "SUPABASE_PUBLISHABLE_KEY" "$SB_PUB"
      doppler_put "$slug" "SUPABASE_SECRET_KEY" "$SB_SECRET"
      doppler_put "$slug" "POSTGRES_URL" "$SB_DBURL"     # backend(db_client) 用
      doppler_put "$slug" "DATABASE_URL" "$SB_DBURL"     # Drizzle migration 用
      doppler_put "$slug" "EXPO_PUBLIC_SUPABASE_URL" "$SB_URL"
      doppler_put "$slug" "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "$SB_PUB"

      # web(Vercel) の Supabase env は Marketplace Connect でも入るが、注入名が旧 anon 体系で
      # リポジトリ期待名(PUBLISHABLE)と食い違うため、**期待名を Vercel に直接 set**して堅牢化する
      # （Marketplace の注入名に依存しない。frontend/packages/client は PUBLISHABLE を要求）。
      vercel_env_set "${APP_NAME:?}" "NEXT_PUBLIC_SUPABASE_URL" "$SB_URL" "$env"
      vercel_env_set "${APP_NAME:?}" "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "$SB_PUB" "$env"
    fi

    # backend endpoint → Doppler（+ Vercel(web) に直接も set。Marketplace は Supabase だけ面倒を見る）
    if backend="$(resolve_backend_domain "$env")"; then
      doppler_put "$slug" "NEXT_PUBLIC_BACKEND_PY_URL" "$backend"
      doppler_put "$slug" "EXPO_PUBLIC_BACKEND_PY_URL" "$backend"
      vercel_env_set "${APP_NAME:?}" "NEXT_PUBLIC_BACKEND_PY_URL" "$backend" "$env"
    fi
  done

  printf '\n'
  ok "生成値の配線完了（→ Doppler、backend endpoint は Vercel(web) にも直接）。"
  warn "Vercel の Supabase env は Marketplace『Connect Account』で同期（runbook Phase 0/2）。"
}

main "$@"
