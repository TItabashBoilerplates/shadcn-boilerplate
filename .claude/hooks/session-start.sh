#!/bin/bash
# SessionStart hook — Claude Code on the web の実行コンテナで、Supabase ローカル
# スタックが起動できるようにイメージを準備する。
#
# このサンドボックスは IPv6 が無く外向き HTTPS が TLS 傍受プロキシ経由のため、
# 素の Supabase イメージだと realtime (IPv6 バインド) と edge-runtime (未信頼 CA) が
# boot に失敗し、`supabase start` がスタックごと落ちる。下のスクリプトが同一タグで
# パッチ済みイメージを用意する (通常のローカル環境では no-op)。
set -uo pipefail

# Claude Code on the web (リモート実行環境) のときだけ自動実行する。
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

"${CLAUDE_PROJECT_DIR:-.}/scripts/supabase/sandbox-fix-images.sh" || true
exit 0
