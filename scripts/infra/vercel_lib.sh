#!/usr/bin/env bash
# Vercel REST API の共通ヘルパ（vercel.sh / wire.sh が source する）。
# lib.sh を先に source しておくこと（log/ok/warn/git_branch_for を使う）。
# 認証は VC_TOKEN（Bearer）。team スコープは VERCEL_TEAM_ID（任意・config.env のファイル値）。
# ※ Doppler には `VERCEL_` prefix を登録できないため token は VC_TOKEN で保持する
#    （.claude/rules/env-naming.md）。
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
      -H "Authorization: Bearer ${VC_TOKEN}" \
      -H "Content-Type: application/json" -d "$body"
  else
    curl -fsS -X "$method" "$url" -H "Authorization: Bearer ${VC_TOKEN}"
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

# ── ad-hoc デプロイ（vercel_deploy.sh）用ヘルパ ─────────────────────────────
# VC_TOKEN を解決する。優先順:
#   1. VC_TOKEN                       （Doppler bootstrap config / 手動 export）
#   2. VERCEL_TOKEN                   （CI の慣例名。プロセス env なので env-naming.md §5 の対象外）
#   3. Vercel CLI のログイン済みトークン（auth.json）
# 3 を許すのは「`vercel login` 済みの開発者が追加の token 発行なしに実行できる」ため。
# **値は絶対に表示しない**（見つけた場所だけを出す）。
vercel_token_autoload() {
  if [ -n "${VC_TOKEN:-}" ]; then ok "Vercel token: VC_TOKEN"; return 0; fi
  if [ -n "${VERCEL_TOKEN:-}" ]; then
    VC_TOKEN="$VERCEL_TOKEN"; export VC_TOKEN; ok "Vercel token: VERCEL_TOKEN"; return 0
  fi
  local f
  for f in \
    "$HOME/Library/Application Support/com.vercel.cli/auth.json" \
    "${XDG_DATA_HOME:-$HOME/.local/share}/com.vercel.cli/auth.json" \
    "$HOME/.config/com.vercel.cli/auth.json"
  do
    [ -f "$f" ] || continue
    VC_TOKEN="$(jq -r '.token // empty' "$f" 2>/dev/null || true)"
    if [ -n "$VC_TOKEN" ]; then
      export VC_TOKEN; ok "Vercel token: Vercel CLI のログイン情報を流用"; return 0
    fi
  done
  die "Vercel token が見つかりません。'vercel login' するか VC_TOKEN を export してください。"
}

# team を解決して VERCEL_TEAM_ID / VERCEL_TEAM_SLUG を export する。
#   - VERCEL_TEAM_ID が既にあれば slug だけ引く
#   - 無ければ /v2/teams を見て **1 つだけなら自動採用**。複数あるなら選ばせる
#     （誤った team に project を作ると消すまで名前が予約されるため、勝手に決めない）
#   - team が 0 件なら個人アカウント（slug = username）
vercel_resolve_team() {
  if [ -n "${VERCEL_TEAM_ID:-}" ]; then
    VERCEL_TEAM_SLUG="$(vapi GET "/v2/teams/${VERCEL_TEAM_ID}" | jq -r '.slug // empty')"
    [ -n "$VERCEL_TEAM_SLUG" ] || die "VERCEL_TEAM_ID='${VERCEL_TEAM_ID}' の team を取得できません。"
    export VERCEL_TEAM_ID VERCEL_TEAM_SLUG
    ok "Vercel scope: ${VERCEL_TEAM_SLUG} (team)"
    return 0
  fi

  local teams count
  teams="$(vapi GET "/v2/teams" | jq -c '[.teams[]? | {id, slug}]')"
  count="$(printf '%s' "$teams" | jq 'length')"
  case "$count" in
    0)
      VERCEL_TEAM_ID=""
      VERCEL_TEAM_SLUG="$(vapi GET "/v2/user" | jq -r '.user.username // .username // empty')"
      [ -n "$VERCEL_TEAM_SLUG" ] || die "個人アカウントの username を取得できません。"
      export VERCEL_TEAM_ID VERCEL_TEAM_SLUG
      ok "Vercel scope: ${VERCEL_TEAM_SLUG} (personal)"
      ;;
    1)
      VERCEL_TEAM_ID="$(printf '%s' "$teams" | jq -r '.[0].id')"
      VERCEL_TEAM_SLUG="$(printf '%s' "$teams" | jq -r '.[0].slug')"
      export VERCEL_TEAM_ID VERCEL_TEAM_SLUG
      ok "Vercel scope: ${VERCEL_TEAM_SLUG} (team・唯一なので自動選択)"
      ;;
    *)
      warn "team が複数あります。--team <slug|id> で明示してください:"
      printf '%s' "$teams" | jq -r '.[] | "    - \(.slug)  (\(.id))"' >&2
      die "team が確定できません。"
      ;;
  esac
}

# vercel_project_json PROJECT → project の JSON（存在しなければ空文字を返し 1 を返す）
vercel_project_json() {
  local out
  out="$(vapi GET "/v9/projects/$1" 2>/dev/null)" || return 1
  printf '%s' "$out"
}

# vercel_production_domain PROJECT → 本番ドメイン（ホスト名のみ）。
# 取得できなければ Vercel の既定である <project>.vercel.app にフォールバックする
# （新規 project だと domains API が空を返すことがあるため）。
vercel_production_domain() {
  local project="$1" domain
  domain="$(vapi GET "/v9/projects/${project}/domains?target=production&limit=1" 2>/dev/null \
    | jq -r '.domains[0].name // empty' 2>/dev/null || true)"
  [ -n "$domain" ] || domain="${project}.vercel.app"
  printf '%s' "$domain"
}

# vercel_env_put PROJECT KEY VALUE [TYPE] [TARGET_JSON]
#   vercel_env_set（環境=dev/staging/production 単位・gitBranch 付き）とは別物で、
#   こちらは **target を直接指定する** ad-hoc 用。既定は production + preview の両方。
#   TYPE: plain（公開値。dashboard で読める） / encrypted（既定）
vercel_env_put() {
  local project="$1" key="$2" value="$3"
  local type="${4:-encrypted}" targets="${5:-[\"production\",\"preview\"]}"
  local body
  body="$(jq -n --arg k "$key" --arg v "$value" --arg t "$type" --argjson tg "$targets" \
    '{key:$k, value:$v, type:$t, target:$tg}')"
  if vapi POST "/v10/projects/${project}/env?upsert=true" "$body" >/dev/null 2>&1; then
    ok "vercel env ${key} 設定（target=$(printf '%s' "$targets" | jq -r 'join(",")')）"
  else
    die "vercel env ${key} の設定に失敗（project / token / 予約名を確認）"
  fi
}

# アカウント slug（team なら team slug、個人なら username）。preview の
# ブランチ別ドメイン `<project>-git-<branch>-<slug>.vercel.app` の構築に使う。
# 取得できなければ空を返す（呼び出し側で best-effort 判定）。
vercel_account_slug() {
  local tid="${VERCEL_TEAM_ID:-}"
  if [ -n "$tid" ]; then
    vapi GET "/v2/teams/${tid}" 2>/dev/null | jq -r '.slug // empty' 2>/dev/null
  else
    vapi GET "/v2/user" 2>/dev/null | jq -r '.user.username // .username // empty' 2>/dev/null
  fi
}

# vercel_backend_url PROJECT ENVNAME → "https://<domain>"（取得できなければ空文字）。
#   production → project の本番ドメイン（API で取得、無ければ <project>.vercel.app）。
#   preview    → ブランチ別の安定エイリアス <project>-git-<branch>-<slug>.vercel.app。
vercel_backend_url() {
  local project="$1" env="$2" domain=""
  if [ "$env" = "production" ]; then
    domain="$(vapi GET "/v9/projects/${project}/domains?target=production&limit=1" 2>/dev/null \
      | jq -r '.domains[0].name // empty' 2>/dev/null)"
    [ -n "$domain" ] || domain="${project}.vercel.app"
  else
    local branch slug
    branch="$(git_branch_for "$env")"          # develop|staging
    slug="$(vercel_account_slug)"
    [ -n "$slug" ] || return 0                  # slug 不明 → best-effort で空を返す
    domain="${project}-git-${branch}-${slug}.vercel.app"
  fi
  [ -n "$domain" ] && printf 'https://%s' "$domain"
}
