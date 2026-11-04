#!/usr/bin/env bash
# JS / アセットの変更を OTA（EAS Update）で配信する。ストア審査は通らない。
#
#   mobile-update production -m "fix: ..."   # channel production（Doppler prd → EAS production）
#   mobile-update staging    -m "..."        # channel preview
#   mobile-update dev        -m "..."        # channel development
#   mobile-update production -m "..." --dry-run   # 対象キーを表示するだけ
#
# 何をするか:
#   1. Doppler の secrets を注入（自分自身を `doppler run` で再実行）
#   2. EXPO_PUBLIC_* を EAS の Environment Variables へ push
#      （SDK 55 以降の `eas update` は EAS 側の環境変数だけを使う。ローカルの .env は読まれない）
#   3. eas update --channel <env> --environment <env>
#
# channel 名は eas.json の build.<profile>.channel と、EAS の environment 名に一致させてある
# （production / preview / development）。
#
# ⚠️ OTA で配れるのは JS とアセットだけ。ネイティブコード・依存・権限・Expo SDK の変更は
#    新バイナリが必要（runtimeVersion が変わるので、この更新は旧バイナリには届かない）。
#    手順の正本: docs/mobile/ota-runbook.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/mobile/lib.sh
. "$SCRIPT_DIR/lib.sh"

MESSAGE=""
DRY_RUN=""

main() {
  mobile_load_config

  # ENV はシェル起動ごとに外部から上書きされうる（devenv の enterShell が ENV=local を入れる）。
  # したがって引数で明示させる。
  local target="${1:-}"
  case "$target" in
    production|staging|dev) ENV="$target"; export ENV; shift ;;
    -h|--help)              mobile_usage "${BASH_SOURCE[0]}"; exit 0 ;;
    *) mdie "対象環境を指定してください: production | staging | dev（例: mobile-update production -m \"fix: ...\"）" ;;
  esac

  while [ $# -gt 0 ]; do
    case "$1" in
      -m|--message) MESSAGE="${2:?-m にメッセージが必要}"; shift 2 ;;
      --dry-run)    DRY_RUN=1; shift ;;
      -h|--help)    mobile_usage "${BASH_SOURCE[0]}"; exit 0 ;;
      *)            mdie "未知のオプション: $1（--help 参照）" ;;
    esac
  done
  [ -n "$MESSAGE" ] || mdie "メッセージを指定してください（-m \"何を直したか\"）。更新履歴で何を配ったか追えなくなる"

  mobile_doppler_reexec "$target" ${MESSAGE:+-m "$MESSAGE"} ${DRY_RUN:+--dry-run}
  mobile_require_expo_token

  local environment; environment="$(mobile_eas_environment)"
  mlog "Doppler[$(mobile_doppler_config)] → EAS[${environment}] / channel: ${environment}"
  mobile_push_public_env "$environment" "$DRY_RUN"

  if [ -n "$DRY_RUN" ]; then
    mok "[dry-run] ここで終了（eas update は実行していません）"
    return 0
  fi

  ( cd "$APP_DIR" && eas_cli update --channel "$environment" --environment "$environment" \
      --message "$MESSAGE" --non-interactive ) \
    || mdie "eas update に失敗（eas update:configure 済みか / runtimeVersion が配信先のビルドと一致するかを確認）"

  printf '\n'
  mok "配信しました。取り消すなら: cd ${MOBILE_APP_DIR} && bunx ${EAS_CLI_SPEC} update:rollback"
}

main "$@"
