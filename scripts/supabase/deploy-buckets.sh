#!/usr/bin/env bash
# Storage buckets を config.toml の [storage.buckets.*] から同期する。
#
# ⚠️ bucket は Management API が GET しか持たないため Terraform では作れない。
#    config.toml + `supabase seed buckets` が唯一の宣言的経路。
#    config.toml が無ければ同期する定義も無いのでスキップする。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/supabase/lib.sh
. "$SCRIPT_DIR/lib.sh"

sb_require_remote_env

if [ ! -f "$PROJECT_ROOT/supabase/config.toml" ]; then
  sb_warn "supabase/config.toml が無いため bucket 同期をスキップします（[storage.buckets.*] が未定義）。"
  exit 0
fi

sb_log "Syncing Storage Buckets... env=$ENV"
cd "$PROJECT_ROOT"
supabase seed buckets --linked
sb_ok "buckets 同期完了"
