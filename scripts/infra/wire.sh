#!/usr/bin/env bash
# サービス間で「生成される値」を取得し、Doppler の各 config(dev/stg/prd) に格納する。
# 以降は Doppler ネイティブ連携が Vercel(backend) / Supabase(edge) 等へ fan-out し、
# migration(GitHub Actions) は Doppler から読む。= 生成値を手動管理しない。
#
# アーキテクチャ（ユーザー決定）:
#   - Supabase は独立所有。**web / backend とも Vercel project** なので、両方に Marketplace の
#     「Connect Account」を張れば Supabase env（SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY /
#     SUPABASE_SECRET_KEY / NEXT_PUBLIC_SUPABASE_* / POSTGRES_*）は Vercel 側へ自動注入される。
#     → **Supabase の値は Doppler にも Vercel にも入れない**（PF 任せ。二重管理の禁止）。
#       加えて `SUPABASE_` prefix は Doppler に登録すると sync が予約値違反で壊れる
#       （.claude/rules/env-naming.md）。
#   - Doppler が要るのは **Vercel の外にいる消費者**だけ:
#       * Expo mobile (EAS)          → EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#       * Drizzle migration (Actions) → POSTGRES_URL
#     いずれも予約 prefix に当たらない名前なので sync できる。
#   - backend も Vercel project（Dockerfile.vercel コンテナ）。その公開ドメインを取得して
#     web/mobile に配る（NEXT_PUBLIC_BACKEND_PY_URL / EXPO_PUBLIC_BACKEND_PY_URL）。
#     これは Marketplace の管轄外なので Doppler + Vercel(web) 直接 set の両方で配る。
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

# 出力グローバル: SB_URL / SB_PUB / SB_DBURL
# （service/secret キーは取得しない。Vercel には Marketplace が注入し、Edge Functions には
#   platform が default secrets として渡すため、ここで扱う必要が無い）
resolve_supabase() {
  local env="$1"; SB_URL=""; SB_PUB=""; SB_DBURL=""
  if [ "$env" = "production" ]; then
    local ref="${SUPABASE_REF:-}"
    [ -n "$ref" ] || { warn "SUPABASE_REF が outputs に無い"; return 1; }
    SB_URL="https://${ref}.supabase.co"
    local keys
    keys="$(curl -fsS "${SUPABASE_API}/v1/projects/${ref}/api-keys?reveal=true" \
              -H "Authorization: Bearer ${SB_ACCESS_TOKEN}" 2>/dev/null)" || true
    SB_PUB="$(printf '%s' "$keys" | jq -r 'map(select(.type=="publishable"))[0].api_key // (map(select(.name=="anon"))[0].api_key) // empty' 2>/dev/null)"
    # 直結(non-pooling) 接続。DDL/migration に適し、安定したホスト形式。
    SB_DBURL="postgresql://postgres:${SB_DB_PASSWORD}@db.${ref}.supabase.co:5432/postgres"
  else
    local gitb out; gitb="$(git_branch_for "$env")"
    out="$(supabase branches get "$gitb" -o env 2>/dev/null)" || { warn "branches get '$gitb' 失敗"; return 1; }
    SB_URL="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_URL=//p' | tr -d '"' | head -1)"
    SB_PUB="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' | tr -d '"' | head -1)"
    [ -n "$SB_PUB" ] || SB_PUB="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_ANON_KEY=//p' | tr -d '"' | head -1)"
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
  supabase_cli_auth                 # SB_ACCESS_TOKEN → supabase CLI 用の env に橋渡し
  require_env SB_DB_PASSWORD        # production の non-pooling 接続文字列の組み立てに使う
  require_env VC_TOKEN              # backend(Vercel) の公開ドメイン取得 / web への endpoint set
  : "${DOPPLER_PROJECT:?}"; : "${APP_NAME:?}"; : "${VERCEL_BACKEND_PROJECT:?}"

  local env slug backend
  for env in $INFRA_ENVS; do
    slug="$(doppler_config_for "$env")"
    printf '\n'; log "── 配線(→Doppler[%s]): %s ──" "$slug" "$env"

    # Vercel の外にいる消費者ぶんだけ Doppler に置く。
    # web / backend（ともに Vercel project）の Supabase env は Marketplace 連携が注入するので触らない。
    if resolve_supabase "$env"; then
      doppler_put "$slug" "POSTGRES_URL" "$SB_DBURL"     # Drizzle migration(GitHub Actions) 用
      doppler_put "$slug" "EXPO_PUBLIC_SUPABASE_URL" "$SB_URL"          # Expo mobile(EAS) 用
      doppler_put "$slug" "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "$SB_PUB"
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
  warn "Vercel(web/backend) の Supabase env は Marketplace『Connect Account』が注入する（runbook Phase 0/2）。"
  warn "→ 両 project で Connect 済みか、注入キー名がアプリの参照名と一致するかを Vercel の画面で確認すること。"
}

main "$@"
