#!/usr/bin/env bash
# Doppler の project / config(dev,stg,prd) を冪等に用意する（構造のみ）。
# - CI 用 service token の発行は github.sh が `gh secret set` と直結して行う
#   （token 値を stdout / ファイルに出さないため）。ここでは構造だけ作る。
# - 認証は環境変数 DOPPLER_TOKEN（bootstrap config）または `doppler login` 済みを前提。
# - フラグは実機 `doppler ... create --help`(v3.75) で確認済み。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"

main() {
  require_tool doppler
  load_config
  : "${DOPPLER_PROJECT:?config.env に DOPPLER_PROJECT が必要}"

  log "Doppler project '$DOPPLER_PROJECT' を確認..."
  if doppler projects get "$DOPPLER_PROJECT" >/dev/null 2>&1; then
    ok "project は既に存在"
  else
    doppler projects create "$DOPPLER_PROJECT" \
      --description "Provisioned by scripts/infra (PaaS native deploy)" >/dev/null
    ok "project を作成: $DOPPLER_PROJECT"
  fi

  # project 作成時に既定で dev/stg/prd environment + 同名 root config が作られる。
  # 念のため各 root config の存在を確認し、無ければ作成（冪等）。
  local env slug
  for env in $INFRA_ENVS; do
    slug="$(doppler_config_for "$env")"   # dev|stg|prd
    if doppler configs get "$slug" --project "$DOPPLER_PROJECT" >/dev/null 2>&1; then
      ok "config '$slug' は存在"
    else
      # root config が無いケースのみ environment ごと作成
      doppler environments create "$slug" "$slug" --project "$DOPPLER_PROJECT" >/dev/null 2>&1 || true
      doppler configs get "$slug" --project "$DOPPLER_PROJECT" >/dev/null 2>&1 \
        || die "config '$slug' を用意できませんでした（Doppler 側を確認）"
      ok "config '$slug' を作成"
    fi
  done

  record_output "DOPPLER_PROJECT" "$DOPPLER_PROJECT"
  ok "Doppler 構造 OK（secret 値の投入は doppler MCP / dashboard で別途。値はチャットに出さない）"
}

main "$@"
