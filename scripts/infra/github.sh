#!/usr/bin/env bash
# GitHub の deployment environment(dev/staging/production) を作成し、
#   - production に required reviewers（手動承認ゲート）+ branch policy(main)
#   - dev/staging は branch policy のみ（自動）
#   - 各環境の secret 同期状況を確認（値の配布は Doppler→GitHub ネイティブ sync の責務）
# を冪等に行う。secret 値そのものは扱わない（配布は Doppler→GitHub ネイティブ sync）。
#
# 認証: gh は `gh auth login` 済み or GH_TOKEN。doppler CLI は使わない。
# gh api の environments エンドポイントは公式（cli.github.com / REST deployments/environments）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"

# env 名 → GitHub environment 名 / 対象 branch
gh_env_name()    { echo "$1"; }                 # dev|staging|production をそのまま
gh_branch_for()  { case "$1" in dev) echo develop ;; staging) echo staging ;; production) echo main ;; esac; }

ensure_environment() {
  local repo="$1" env="$2"
  local ghenv branch body reviewers_json=""
  ghenv="$(gh_env_name "$env")"
  branch="$(gh_branch_for "$env")"

  if [ "$env" = "production" ]; then
    # required reviewers（GH_PROD_REVIEWERS のログイン名 → 数値 id 解決）
    local logins id ids=()
    IFS=',' read -ra logins <<< "${GH_PROD_REVIEWERS:-}"
    for login in "${logins[@]}"; do
      login="$(echo "$login" | tr -d '[:space:]')"; [ -n "$login" ] || continue
      id="$(gh api "users/${login}" --jq '.id' 2>/dev/null || true)"
      [ -n "$id" ] && ids+=("{\"type\":\"User\",\"id\":${id}}")
    done
    [ ${#ids[@]} -gt 0 ] || warn "production reviewers を解決できず（GH_PROD_REVIEWERS 確認）。承認ゲート無しで作成"
    reviewers_json="[$(IFS=,; echo "${ids[*]}")]"
    body="$(jq -n --argjson rev "$reviewers_json" \
      '{wait_timer:0, prevent_self_review:true, reviewers:$rev,
        deployment_branch_policy:{protected_branches:false, custom_branch_policies:true}}')"
  else
    body="$(jq -n '{deployment_branch_policy:{protected_branches:false, custom_branch_policies:true}}')"
  fi

  gh api -X PUT "repos/${repo}/environments/${ghenv}" --input - >/dev/null <<< "$body" \
    && ok "GitHub environment '${ghenv}'（branch=${branch}）" \
    || die "environment '${ghenv}' 作成に失敗"

  # deployment branch policy（対象 branch のみ deploy 可）を冪等に追加
  if ! gh api "repos/${repo}/environments/${ghenv}/deployment-branch-policies" \
        --jq '.branch_policies[].name' 2>/dev/null | grep -qx "$branch"; then
    gh api -X POST "repos/${repo}/environments/${ghenv}/deployment-branch-policies" \
      -f name="$branch" >/dev/null 2>&1 \
      && ok "branch policy 追加: ${ghenv} ← ${branch}" \
      || warn "branch policy 追加 skip: ${ghenv}"
  fi
}

# env スコープ secret（POSTGRES_URL 等）が同期済みかを確認する（作成はしない）。
# 値の配布は **Doppler → GitHub のネイティブ sync**（dashboard, runbook Phase 2）の責務。
# ここで service token を発行しないのは、Actions 内で doppler CLI を使わない設計のため
# （workflow は `${{ secrets.* }}` を job env に渡すだけ）。
check_env_secrets() {
  local repo="$1" env="$2"
  local ghenv slug
  ghenv="$(gh_env_name "$env")"
  slug="$(doppler_config_for "$env")"   # dev|stg|prd

  if gh secret list --env "$ghenv" --repo "$repo" 2>/dev/null | grep -q '^POSTGRES_URL'; then
    ok "env secret POSTGRES_URL(${ghenv}) 同期済み"
  else
    warn "env secret POSTGRES_URL(${ghenv}) が未同期。Doppler > Integrations > GitHub で"
    warn "  config '${slug}' → Environment '${ghenv}' の sync を作成してください（runbook Phase 2）。"
  fi
}

main() {
  require_tool gh
  require_tool jq
  load_config
  : "${GH_REPO:?config.env に GH_REPO が必要}"

  local env
  for env in $INFRA_ENVS; do
    ensure_environment "$GH_REPO" "$env"
    check_env_secrets "$GH_REPO" "$env"
  done

  ok "GitHub environments / 承認ゲート OK（secret 配布は Doppler→GitHub sync）"
}

main "$@"
