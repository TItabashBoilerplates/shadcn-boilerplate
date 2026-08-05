#!/usr/bin/env bash
# Edge Functions をリモート project にデプロイする。
#
# 以前は dotenvx で env/backend/.env.<ENV> と env/.env.secrets を読んでいたが、
# **dotenvx も .env.secrets も廃止済み**（シークレットは Doppler、ref は Terraform output）。
#
# 関数名は列挙しない。`supabase functions deploy` は引数なしで supabase/functions/ 配下を
# すべてデプロイするため、関数を足しても このスクリプトの変更は不要
# （以前 devenv 側に列挙されていたリストは実在しない関数を指していた）。
# 個別の verify_jwt / import_map は config.toml の [functions.<name>] が持つ。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/supabase/lib.sh
. "$SCRIPT_DIR/lib.sh"

sb_require_remote_env
sb_require_project_ref

sb_log "Deploying Edge Functions... env=$ENV"
cd "$PROJECT_ROOT"
supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF"
sb_ok "functions deploy 完了"
