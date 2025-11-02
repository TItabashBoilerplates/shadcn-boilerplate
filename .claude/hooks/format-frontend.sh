#!/usr/bin/env bash
set -e

# Hook InputからJSONをパース
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# ファイルパスが空の場合は終了
if [ -z "$file_path" ]; then
  exit 0
fi

# frontendディレクトリ内のTypeScript/JavaScript/JSONファイルのみ処理
if [[ "$file_path" =~ /frontend/.*\.(ts|tsx|js|jsx|json)$ ]]; then
  # ファイルパスからプロジェクトルートを推測
  project_root="${file_path%/frontend/*}"

  # プロジェクトルートからfrontendディレクトリに移動
  cd "$project_root/frontend" || exit 0

  # 絶対パスから相対パスに変換
  rel_path="${file_path#$project_root/frontend/}"

  # Biomeでフォーマット＋lint
  bunx biome check --write "$rel_path" 2>/dev/null || true
fi

exit 0
