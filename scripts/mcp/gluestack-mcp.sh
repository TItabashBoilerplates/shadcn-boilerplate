#!/usr/bin/env bash
# gluestack-ui MCP サーバのランチャ（stdio transport）。
#
# 公式 MCP サーバ（https://github.com/gluestack/mcp）は npm 未公開かつ package.json に
# `bin` が無いため `npx -y github:gluestack/mcp` では起動できない（"could not determine
# executable to run" になる）。そのため本スクリプトが
#   1. 固定 commit を cache ディレクトリへ shallow clone
#   2. 依存を一度だけ install
#   3. `node index.js` を exec
# という手順を吸収し、`.mcp.json` をマシン非依存に保つ。
#
# 参照する commit は GLUESTACK_MCP_REF でピン留めする（再現性のため。上流 main の
# 任意コードを毎回引かない）。更新時は SHA を差し替えてコミットすること。
#
# CRITICAL: stdout は MCP の JSON-RPC 専用チャネル。clone / install の出力を stdout に
# 出すとハンドシェイクが壊れるため、進捗ログはすべて stderr へ送る。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GLUESTACK_MCP_REPO="${GLUESTACK_MCP_REPO:-https://github.com/gluestack/mcp.git}"
GLUESTACK_MCP_REF="${GLUESTACK_MCP_REF:-49357fe967d58b6d2fb20132787d0da193a77c3f}"

CACHE_ROOT="${GLUESTACK_MCP_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/gluestack-mcp}"
INSTALL_DIR="$CACHE_ROOT/$GLUESTACK_MCP_REF"
READY_MARKER="$INSTALL_DIR/.mcp-ready"

log() { printf '[gluestack-mcp] %s\n' "$1" >&2; }

for bin in git node npm; do
    if ! command -v "$bin" >/dev/null 2>&1; then
        log "ERROR: '$bin' が PATH に見つかりません。gluestack MCP を起動できません。"
        exit 1
    fi
done

# READY_MARKER が無い場合のみセットアップ（2 回目以降の起動は clone/install をスキップ）
if [ ! -f "$READY_MARKER" ]; then
    log "初回セットアップ: $GLUESTACK_MCP_REPO @ ${GLUESTACK_MCP_REF:0:12}"
    rm -rf "$INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"

    # 特定 commit を取りたいので clone --branch ではなく init + fetch を使う
    git -C "$INSTALL_DIR" init --quiet >&2
    git -C "$INSTALL_DIR" remote add origin "$GLUESTACK_MCP_REPO" >&2
    git -C "$INSTALL_DIR" fetch --quiet --depth 1 origin "$GLUESTACK_MCP_REF" >&2
    git -C "$INSTALL_DIR" checkout --quiet FETCH_HEAD >&2

    log "依存をインストール中..."
    (cd "$INSTALL_DIR" && npm install --omit=dev --no-audit --no-fund --silent >&2)

    touch "$READY_MARKER"
    log "セットアップ完了: $INSTALL_DIR"
fi

cd "$INSTALL_DIR"
# stdout-guard は上流の起動バナー（console.log）を stderr へ逃がす。詳細は同ファイル参照。
exec node --import "file://$SCRIPT_DIR/stdout-guard.mjs" index.js
