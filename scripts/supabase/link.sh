#!/usr/bin/env bash
# 対象環境の Supabase project に link する。
#
# 以前は dotenvx で env/backend/.env.<ENV> を読んでいたが、**dotenvx は廃止済み**
# （シークレットは Doppler、ref は Terraform output）。SUPABASE_PROJECT_REF を
# 環境変数として受け取る形に統一した。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/supabase/lib.sh
. "$SCRIPT_DIR/lib.sh"

sb_require_remote_env
sb_require_project_ref

sb_log "Linking to remote project (env=$ENV)..."
cd "$PROJECT_ROOT"
supabase link --project-ref "$SUPABASE_PROJECT_REF"
sb_ok "linked"
