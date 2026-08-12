#!/usr/bin/env bash
# ストア掲載情報・アプリ内課金をストアの API へ反映する（App Store Connect / Google Play）。
#
#   store.sh <サブコマンド> [--dry-run]
#
# サブコマンド:
#   push-ios-screenshots       スクリーンショットを App Store Connect へ
#   push-play-listing          掲載文・アイコン・スクショを Google Play へ（1 トランザクション）
#   create-ios-subscriptions   iap.config.js のサブスク商品を App Store Connect に作る
#   equalize-ios-prices        販売地域すべてへ等価価格を展開する（作成後に必須）
#   create-play-subscriptions  iap.config.js のサブスク商品を Google Play に作る
#   create-play-offers         Play の無料トライアル（offer）を作って有効化する
#
# **本番の掲載情報・課金商品を書き換える。必ず先に --dry-run で差分を確認すること。**
#
# 資格情報はすべて Doppler が唯一のソース（キー名のみ・値は出さない）:
#   APPLE_API_KEY / APPLE_API_ISSUER / APPLE_API_KEY_P8   … App Store Connect API
#   PLAY_SERVICE_ACCOUNT_JSON                              … Google Play Developer API
# 起動時に `doppler run` で自身を再実行して注入するので、呼ぶ側の準備は不要。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
. "$SCRIPT_DIR/lib.sh"

declare -A COMMANDS=(
  [push-ios-screenshots]=asc-push-screenshots.mjs
  [push-play-listing]=play-push-listing.mjs
  [create-ios-subscriptions]=asc-create-subscriptions.mjs
  [equalize-ios-prices]=asc-equalize-prices.mjs
  [create-play-subscriptions]=play-create-subscriptions.mjs
  [create-play-offers]=play-create-offers.mjs
)

CMD="${1:-}"
case "$CMD" in
  ""|-h|--help) mobile_usage "${BASH_SOURCE[0]}"; exit 0 ;;
esac
shift

[ -n "${COMMANDS[$CMD]:-}" ] || mdie "不明なサブコマンド: $CMD（--help で一覧）"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) mobile_usage "${BASH_SOURCE[0]}"; exit 0 ;;
    *) mdie "不明なオプション: $arg" ;;
  esac
done

mobile_load_config
# 再実行するので、ここより後の処理は「シークレット注入済み」の 1 回だけ走る
mobile_doppler_reexec "$CMD" "$@"

command -v node >/dev/null || mdie "node が見つかりません（devenv shell 内で実行してください）"

[ "$DRY_RUN" = 1 ] && mwarn "dry-run: ストアへは一切書き込みません"

# MOBILE_APP_DIR は config.env が正本。Node 側で同じパーサを持たないよう env で渡す
exec env \
  MOBILE_APP_DIR="$MOBILE_APP_DIR" \
  DRY_RUN="$([ "$DRY_RUN" = 1 ] && echo 1 || echo 0)" \
  node "$SCRIPT_DIR/store-run.mjs" "${COMMANDS[$CMD]}"
