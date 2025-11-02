#!/usr/bin/env bash
set -e

# Hook InputからJSONをパース
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# ファイルパスが空の場合は終了
if [ -z "$file_path" ]; then
  exit 0
fi

# supabase/functionsディレクトリ内のTypeScriptファイルのみ処理
if [[ "$file_path" =~ /supabase/functions/.*\.ts$ ]]; then
  # Denoでフォーマット＋型チェック
  deno fmt "$file_path" 2>/dev/null || true
  deno check "$file_path" 2>/dev/null || true
fi

exit 0
