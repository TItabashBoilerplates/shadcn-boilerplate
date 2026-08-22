#!/usr/bin/env bash
# インフラ展開のワンショット実行。
#
#   infra-deploy <app> [env...]
#     例: infra-deploy myapp                  # 全環境
#         infra-deploy myapp production       # production だけ
#
# やること:
#   1. Terraform apply（Supabase project / branch, Vercel, GitHub, Doppler）
#   2. Terraform の output から環境ごとの Supabase project ref を取得
#   3. 各環境へ config.toml / Edge Functions / Storage buckets を反映
#
# ── なぜ Supabase の GitHub 連携を使わないか ──────────────────────────────
# ① 連携の接続は **Management API にも CLI にも存在せず**、project ごとに dashboard で
#    認可するしかない → アプリを増やすたび手動が増え「コマンド一発」が成立しない。
# ② 連携が production に適用するのは migrations / Edge Functions / Storage buckets だけで、
#    公式に「All other configurations, including API, Auth, and seed files, are ignored
#    by default.」と明記されている → **本番の Auth 設定・メールテンプレートは届かない**。
# ③ 連携経路で env() の secret を供給する手段（dotenvx 暗号化ファイルのコミット）は
#    本リポジトリで廃止済み。
# → config.toml を正本に保ったまま、配送だけ CLI に寄せる。正本の位置は変わらない。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TF_BIN="${TF_BIN:-terraform}"

usage() {
  cat >&2 <<'USAGE'
usage: infra-deploy <app> [env...]

  <app>  terraform/apps/<app>.tfvars に対応する名前（workspace 名も同じ）
  [env]  省略時は production staging dev の全環境

  例:
    infra-deploy myapp
    infra-deploy myapp production
USAGE
  exit 1
}

[ "$#" -ge 1 ] || usage
APP="$1"; shift

TARGET_ENVS=("$@")
[ ${#TARGET_ENVS[@]} -gt 0 ] || TARGET_ENVS=(production staging dev)

# ── 1. Terraform ────────────────────────────────────────────────────────────
printf '\n\033[1;35m═══ 1/2  Terraform apply ═══\033[0m\n'
bash "$SCRIPT_DIR/tf.sh" apply "$APP" -auto-approve

# ── 2. Supabase 反映 ────────────────────────────────────────────────────────
# ref は Terraform の output が唯一の供給元（SUPABASE_ prefix は Doppler に登録できず、
# branch の ref は Terraform が branch を作るまで存在しないため）。
printf '\n\033[1;35m═══ 2/2  Supabase 反映（config / functions / buckets）═══\033[0m\n'

cd "$PROJECT_ROOT/terraform"
REFS_JSON="$("$TF_BIN" output -json supabase_env_refs)" \
  || die "supabase_env_refs を取得できません（terraform apply が成功しているか確認）"
cd "$PROJECT_ROOT"

for env in "${TARGET_ENVS[@]}"; do
  ref="$(printf '%s' "$REFS_JSON" | jq -r --arg e "$env" '.[$e] // empty')"
  if [ -z "$ref" ]; then
    warn "[$env] project ref を output から解決できません → skip"
    continue
  fi
  printf '\n'
  log "── $env (ref=$ref) ──"
  # ref は輸送変数で渡す。enterShell が読む env/<svc>/.env.$ENV が SUPABASE_PROJECT_REF を
  # 定義していると外から渡した値が上書きされるため（scripts/supabase/lib.sh の解説を参照）。
  ENV="$env" DEPLOY_SUPABASE_PROJECT_REF="$ref" bash scripts/supabase/deploy.sh
done

printf '\n'
ok "infra-deploy 完了: $APP (${TARGET_ENVS[*]})"
warn "残る手動は org 単位で一度きりのものだけ（terraform/README.md「残る手動作業」を参照）。"
