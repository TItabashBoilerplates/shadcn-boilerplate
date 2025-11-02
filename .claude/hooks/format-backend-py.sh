#!/usr/bin/env bash
set -e

# Hook InputからJSONをパース
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# ファイルパスが空の場合は終了
if [ -z "$file_path" ]; then
  exit 0
fi

# backend-py/app/ディレクトリ内のPythonファイルのみ処理
if [[ "$file_path" =~ /backend-py/app/.*\.py$ ]]; then
  # Dockerコンテナが起動しているか確認
  if ! docker ps --format "{{.Names}}" | grep -q "^backend_app_py$"; then
    # コンテナが起動していない場合はスキップ
    exit 0
  fi

  # ファイルパスからプロジェクトルートを推測
  project_root="${file_path%/backend-py/*}"

  # 絶対パスからコンテナ内パスに変換
  container_path="/service/app/${file_path#*backend-py/app/}"

  # Ruffでフォーマット＋lint（コンテナ内で実行）
  docker exec backend_app_py bash -c "cd /service/app && uv run ruff format '$container_path' && uv run ruff check --fix '$container_path'" 2>/dev/null || true
fi

exit 0
