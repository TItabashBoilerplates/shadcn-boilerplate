#!/bin/bash

# ANSIカラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NO_COLOR='\033[0m'

# エラー追跡変数
ERROR=0

# 必須コマンドのチェック
check_required() {
    local cmd=$1
    local hint=$2

    if command -v "$cmd" &>/dev/null; then
        echo -e "${GREEN}✔ $cmd${NO_COLOR}"
    else
        echo -e "${RED}✖ $cmd is not installed.${NO_COLOR}"
        [ -n "$hint" ] && echo "  → $hint"
        ERROR=1
    fi
}

# 推奨コマンドのチェック（なくてもエラーにしない）
check_recommended() {
    local cmd=$1
    local hint=$2

    if command -v "$cmd" &>/dev/null; then
        echo -e "${GREEN}✔ $cmd${NO_COLOR}"
    else
        echo -e "${YELLOW}⚠ $cmd is not installed (recommended).${NO_COLOR}"
        [ -n "$hint" ] && echo "  → $hint"
    fi
}

echo "Checking prerequisites..."
echo ""

# 必須: Docker Desktop（devenv 外で別途必要）
check_required "docker" "Install Docker Desktop: https://www.docker.com/"

# 必須: devenv（Nix ベースの開発環境）
check_required "devenv" "Install: https://devenv.sh/getting-started/"

# 推奨: direnv（devenv shell の自動アクティベーション）
check_recommended "direnv" "Install: brew install direnv && add 'eval \"\$(direnv hook zsh)\"' to ~/.zshrc"

echo ""

if [ $ERROR -eq 1 ]; then
    echo -e "${RED}Error: Required tools are missing. Install them and try again.${NO_COLOR}"
    exit 1
fi

echo -e "${GREEN}All required tools are installed.${NO_COLOR}"
