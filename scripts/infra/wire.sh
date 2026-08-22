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
#       * Drizzle migration (Actions) → POSTGRES_URL（**session pooler / IPv4**。理由は下記）
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

# Supavisor の **session mode**（IPv4・ポート 5432）の接続文字列を組み立てる。
#   session_pooler_url REF URL_ENCODED_PASSWORD
#
# ⚠️ 直結（db.<ref>.supabase.co）を使ってはならない。直結は **IPv6**（IPv4 add-on 購入時のみ IPv4）で、
#    この値の唯一の消費者である **GitHub Actions の runner は IPv4 のみ**のため ENETUNREACH になる
#    （Supabase 公式が IPv4 only のサービスとして GitHub Actions を名指ししている）。
#    transaction mode(6543) も prepared statement 非対応で migration に使えないので、必ず 5432。
#
# pooler のホスト（aws-0 / aws-1 など region ごとに異なる）は ref から導出できず、CLI の
# `branches get` にも含まれない（supabase/cli#4012）。Management API から取得するのが唯一の手段。
# 参考: https://supabase.com/docs/guides/database/connecting-to-postgres
session_pooler_url() {
  local ref="$1" enc_pass="$2" cfg primary host user db
  cfg="$(curl -fsS "${SUPABASE_API}/v1/projects/${ref}/config/database/pooler" \
          -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" 2>/dev/null)" \
    || { warn "pooler 設定を取得できず（ref=${ref}）。project が起動中か、PAT の権限を確認。"; return 1; }
  primary="$(printf '%s' "$cfg" | jq -c 'map(select(.database_type=="PRIMARY"))[0] // empty' 2>/dev/null)"
  [ -n "$primary" ] || { warn "pooler 設定に PRIMARY が無い（ref=${ref}）"; return 1; }
  host="$(printf '%s' "$primary" | jq -r '.db_host // empty')"
  user="$(printf '%s' "$primary" | jq -r '.db_user // empty')"
  db="$(printf '%s' "$primary" | jq -r '.db_name // "postgres"')"
  [ -n "$host" ] && [ -n "$user" ] || { warn "pooler の host/user が空（ref=${ref}）"; return 1; }
  # 直結ホストを掴んでいたら**書き込まない**（誤った値を配ると CI が分かりにくい形で壊れる）。
  case "$host" in
    *.pooler.supabase.com) ;;
    *)
      warn "pooler host が想定外です（${host}）。Dashboard の Connect > Session pooler の文字列を"
      warn "Doppler の POSTGRES_URL に手で入れてください（直結は IPv6 で GitHub Actions から届かない）。"
      return 1 ;;
  esac
  printf 'postgresql://%s:%s@%s:5432/%s' "$user" "$enc_pass" "$host" "$db"
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
              -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" 2>/dev/null)" || true
    SB_PUB="$(printf '%s' "$keys" | jq -r 'map(select(.type=="publishable"))[0].api_key // (map(select(.name=="anon"))[0].api_key) // empty' 2>/dev/null)"
    # パスワードは記号を含みうるので percent-encode してから URL に埋める（値は表示しない）。
    local enc; enc="$(jq -rn --arg p "$SUPABASE_DB_PASSWORD" '$p|@uri')"
    SB_DBURL="$(session_pooler_url "$ref" "$enc")" || SB_DBURL=""
  else
    local gitb out branch_ref; gitb="$(git_branch_for "$env")"
    out="$(supabase branches get "$gitb" -o env 2>/dev/null)" || { warn "branches get '$gitb' 失敗"; return 1; }
    SB_URL="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_URL=//p' | tr -d '"' | head -1)"
    SB_PUB="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' | tr -d '"' | head -1)"
    [ -n "$SB_PUB" ] || SB_PUB="$(printf '%s\n' "$out" | sed -n 's/^SUPABASE_ANON_KEY=//p' | tr -d '"' | head -1)"
    # branch の直結 URL は「branch project ref とパスワード」の取得元としてのみ使う
    # （そのまま Doppler には入れない。上記のとおり CI からは IPv6 で届かないため）。
    local direct; direct="$(printf '%s\n' "$out" | sed -n 's/^POSTGRES_URL_NON_POOLING=//p' | tr -d '"' | head -1)"
    branch_ref="$(printf '%s' "$direct" | sed -nE 's|^[^@]*@db\.([^.]+)\.supabase\.co.*$|\1|p')"
    # 直結 URL 内のパスワードは既に percent-encoded なのでそのまま使う。
    local enc; enc="$(printf '%s' "$direct" | sed -nE 's|^[a-z]+://[^:]*:([^@]*)@.*$|\1|p')"
    if [ -n "$branch_ref" ] && [ -n "$enc" ]; then
      SB_DBURL="$(session_pooler_url "$branch_ref" "$enc")" || SB_DBURL=""
    else
      warn "[$env] branch の接続情報を解釈できず（POSTGRES_URL_NON_POOLING の形式を確認）"
    fi
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
  supabase_cli_auth                 # SUPABASE_ACCESS_TOKEN → supabase CLI 用の env に橋渡し
  require_env SUPABASE_DB_PASSWORD        # production の pooler 接続文字列の組み立てに使う
  require_env VERCEL_TOKEN              # backend(Vercel) の公開ドメイン取得 / web への endpoint set
  : "${DOPPLER_PROJECT:?}"; : "${APP_NAME:?}"; : "${VERCEL_BACKEND_PROJECT:?}"

  local env slug backend
  for env in $INFRA_ENVS; do
    slug="$(doppler_config_for "$env")"
    printf '\n'; log "── 配線(→Doppler[%s]): %s ──" "$slug" "$env"

    # Vercel の外にいる消費者ぶんだけ Doppler に置く。
    # web / backend（ともに Vercel project）の Supabase env は Marketplace 連携が注入するので触らない。
    if resolve_supabase "$env"; then
      # Drizzle migration(GitHub Actions) 用。**session pooler(IPv4, :5432)** であることが必須。
      doppler_put "$slug" "POSTGRES_URL" "$SB_DBURL"
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
