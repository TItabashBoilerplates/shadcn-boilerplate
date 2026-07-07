#!/usr/bin/env bash
# 外部 PaaS プロビジョニングのオーケストレーター（冪等・再実行可）。
#   doppler → supabase → vercel → github の順に実行する。
#   （web / backend とも Vercel project。backend は Dockerfile.vercel コンテナ。）
#
# 使い方:
#   infra-bootstrap            # 全ステップ（devenv script 経由でトークン注入）
#   infra-bootstrap doppler    # 単一ステップのみ
#   infra-bootstrap supabase github
#
# トークンは devenv script `infra-bootstrap` が `doppler run` で注入する（値は露出しない）。
# 直接叩く場合は必要な *_TOKEN / *_ACCESS_TOKEN を環境に用意すること（runbook 参照）。
#
# ⚠️ このスクリプトは「コマンド一発で全自動」ではない。各 PaaS の GitHub 連携 OAuth /
#    repo 接続 / Doppler→PaaS secret 連携は dashboard 専用（runbook Phase 0/2）。
#    本スクリプトは scriptable な部分（project/env/承認ゲート）だけを担う。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"

# wire は supabase/vercel の生成値を Vercel(web) に配線するため最後に置く。
ALL_STEPS=(doppler supabase vercel github wire)

run_step() {
  local step="$1"
  local script="$SCRIPT_DIR/${step}.sh"
  [ -f "$script" ] || die "未知のステップ: $step"
  printf '\n\033[1;35m═══ %s ═══\033[0m\n' "$step"
  bash "$script"
}

main() {
  load_config
  local steps=("$@")
  [ ${#steps[@]} -gt 0 ] || steps=("${ALL_STEPS[@]}")

  log "infra-bootstrap 開始: ${steps[*]}"
  for step in "${steps[@]}"; do
    run_step "$step"
  done

  printf '\n'
  ok "infra-bootstrap 完了。outputs: $OUTPUTS_FILE"
  warn "残る手動ステップ（dashboard）は docs/deployment/README.md の Phase 2 を参照。"
}

main "$@"
