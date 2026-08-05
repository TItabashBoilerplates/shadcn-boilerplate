#!/usr/bin/env bash
# scripts/supabase/*.sh の共通ヘルパ。
#
# 各スクリプトに同じ ENV ガードがコピペされていたのを集約している
# （.claude/rules/clean-code.md の重複禁止）。
set -euo pipefail

SB_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SB_LIB_DIR/../.." && pwd)"

sb_log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
sb_ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
sb_warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*" >&2; }
sb_die()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# リモート環境向けのスクリプトなので、local / 未指定なら何もせず正常終了する。
sb_require_remote_env() {
  ENV="${ENV:-}"
  if [ "$ENV" = "local" ] || [ -z "$ENV" ]; then
    echo "⚠️  Skipping for local environment"
    exit 0
  fi
}

# 対象 project の ref を必須にする。
#
# ⚠️ `SUPABASE_` prefix のキーは Doppler に登録できない（.claude/rules/env-naming.md）ため、
#    ref は Doppler からは供給されない。**Terraform の output が正規の供給元**:
#
#      export SUPABASE_PROJECT_REF="$(tf-output <app> -json supabase_env_refs | jq -r .<env>)"
#
#    persistent branch の ref は Terraform が branch を作るまで存在しないので、
#    ここを env ファイルにハードコードしないこと。
sb_require_project_ref() {
  [ -n "${SUPABASE_PROJECT_REF:-}" ] || sb_die "SUPABASE_PROJECT_REF が未設定です。
  Terraform の output から渡してください:
    export SUPABASE_PROJECT_REF=\"\$(tf-output <app> -json supabase_env_refs | jq -r .${ENV:-<env>})\""
}
