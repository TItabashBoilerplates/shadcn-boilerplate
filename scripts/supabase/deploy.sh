#!/usr/bin/env bash
# Supabase のリモート反映オーケストレーター。
#   link → config push → buckets → functions の順（順序依存あり）。
#
# 前提: SUPABASE_PROJECT_REF が環境変数で渡っていること。
#   `SUPABASE_` prefix は Doppler に登録できない（.claude/rules/env-naming.md）ので、
#   ref の供給元は **Terraform の output**:
#
#     export ENV=staging
#     export SUPABASE_PROJECT_REF="$(tf-output <app> -json supabase_env_refs | jq -r .staging)"
#     devenv tasks run -P staging deploy:supabase
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/supabase/lib.sh
. "$SCRIPT_DIR/lib.sh"

ENV="${ENV:-}"
if [ "$ENV" = "local" ] || [ -z "$ENV" ]; then
  echo "⚠️  deploy:supabase はリモート環境専用です。"
  echo ""
  echo "Usage: ENV=staging    devenv tasks run -P staging deploy:supabase"
  echo "       ENV=production devenv tasks run -P production deploy:supabase"
  exit 0
fi

sb_require_project_ref

echo "🚀 Deploying Supabase resources to $ENV (ref=$SUPABASE_PROJECT_REF)..."
echo ""

"$SCRIPT_DIR/link.sh"
"$SCRIPT_DIR/deploy-config.sh"
"$SCRIPT_DIR/deploy-buckets.sh"
"$SCRIPT_DIR/deploy-functions.sh"

# Secrets: Doppler ネイティブ連携（Doppler→Supabase sync）で自動 sync するため、ここでは push しない。
# 連携の設定手順は .claude/skills/doppler/references/cicd.md を参照。
echo ""
echo "ℹ️  Supabase secrets は Doppler ネイティブ連携で sync 済み（このスクリプトでは push しない）"
echo ""
echo "✅ Supabase deployment complete!"
