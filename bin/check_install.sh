#!/bin/bash

# ANSIカラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
NO_COLOR='\033[0m'

# エラー追跡変数
ERROR=0

# コマンドの存在をチェックし、バージョンを表示またはインストールする関数
check_and_install() {
    local command=$1
    # shellcheck disable=SC2034
    local install_command=$2

    # コマンドが存在するか確認
    if command -v "$command" &>/dev/null; then
        echo "${GREEN}$command is already installed.${NO_COLOR}"
        # バージョン情報を表示
        $command --version
    else
        echo "${RED}$command is not installed.${NO_COLOR}"
        # エラーを示す
        ERROR=1
        # インストールコマンドのプレースホルダー（コメントアウト）
        # echo "Installing $command..."
        # 実際のインストールコマンドを実行するには以下の行のコメントを解除し、適切なコマンドに置き換えてください
        # eval "$install_command"
    fi
}

# 各コマンドのチェックとインストール
check_and_install "docker" "brew install docker"
check_and_install "supabase" "brew install supabase-cli"
check_and_install "asdf" "brew install asdf"
# エラーチェック
if [ $ERROR -eq 1 ]; then
    echo "${RED}Error: One or more packages are not installed.${NO_COLOR}"
    exit 1
fi
