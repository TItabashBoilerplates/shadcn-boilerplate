#!/usr/bin/env bash
# config.toml をリモート project に反映する。
#
# ⚠️ **config.toml が無い場合は push しない。**
#    Supabase CLI は config.toml が無いと**既定値をロードする**（`supabase status` が
#    ディレクトリ名から project 名を推定して動くのがその証拠）。その状態で `config push` すると
#    リモートの Auth 設定を CLI 既定値で上書きしてしまう。
#    この boilerplate は config.toml を持たない（各アプリ側で用意する）ため、
#    未配置のまま踏んでも事故らないように**声を出してスキップ**する。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/supabase/lib.sh
. "$SCRIPT_DIR/lib.sh"

sb_require_remote_env
sb_require_project_ref

CONFIG_FILE="$PROJECT_ROOT/supabase/config.toml"
if [ ! -f "$CONFIG_FILE" ]; then
  sb_warn "supabase/config.toml が無いため config push をスキップします。"
  sb_warn "  CLI は config 不在時に既定値をロードするため、push するとリモートの Auth 設定を"
  sb_warn "  既定値で上書きしてしまいます（メールテンプレート配線・verify_jwt も失われます）。"
  sb_warn "  設定を Git 管理するには supabase/config.toml を追加してください"
  sb_warn "  （必須項目: docs/deployment/email-templates.md / .claude/rules/supabase-config.md）。"
  exit 0
fi

sb_log "Pushing config.toml (Auth, API, Storage, email templates)... env=$ENV"
cd "$PROJECT_ROOT"
supabase config push --project-ref "$SUPABASE_PROJECT_REF"
sb_ok "config push 完了"
