#!/usr/bin/env bash
# GitHub の deployment environment(dev/staging/production) を作成し、
#   - production に required reviewers（手動承認ゲート）+ branch policy(main)
#   - dev/staging は branch policy のみ（自動）
#   - 各環境に DOPPLER_TOKEN(env スコープ secret) = read-only Doppler service token を注入
# を冪等に行う。token は pipe で直接 `gh secret set` に渡し、stdout/ファイルに出さない。
#
# 認証: gh は `gh auth login` 済み or GH_TOKEN。Doppler は DOPPLER_TOKEN(bootstrap) or login 済み。
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

# 環境別 DOPPLER_TOKEN を read-only service token として発行し env secret に注入（idempotent）。
ensure_doppler_token_secret() {
  local repo="$1" env="$2"
  local ghenv slug token
  ghenv="$(gh_env_name "$env")"
  slug="$(doppler_config_for "$env")"   # dev|stg|prd

  if gh secret list --env "$ghenv" --repo "$repo" 2>/dev/null | grep -q '^DOPPLER_TOKEN'; then
    ok "DOPPLER_TOKEN(${ghenv}) は設定済み（skip）"
    return 0
  fi

  # read-only token を発行 → pipe で gh secret set に直接渡す（値は表示しない）
  token="$(doppler configs tokens create "ci-${slug}" \
            --project "$DOPPLER_PROJECT" --config "$slug" \
            --access read --plain 2>/dev/null)" \
    || { warn "Doppler token 発行 skip(${slug})。手動で DOPPLER_TOKEN(${ghenv}) を設定"; return 0; }

  printf '%s' "$token" | gh secret set DOPPLER_TOKEN --env "$ghenv" --repo "$repo" \
    && ok "DOPPLER_TOKEN(${ghenv}) を注入（read-only, config=${slug}）" \
    || warn "gh secret set(${ghenv}) skip"
  token=""
}

main() {
  require_tool gh
  require_tool jq
  require_tool doppler
  load_config
  : "${GH_REPO:?config.env に GH_REPO が必要}"
  : "${DOPPLER_PROJECT:?config.env に DOPPLER_PROJECT が必要}"

  local env
  for env in $INFRA_ENVS; do
    ensure_environment "$GH_REPO" "$env"
    ensure_doppler_token_secret "$GH_REPO" "$env"
  done

  ok "GitHub environments / 承認ゲート / DOPPLER_TOKEN(env) OK"
}

main "$@"
