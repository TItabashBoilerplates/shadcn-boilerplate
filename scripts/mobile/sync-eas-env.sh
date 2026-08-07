#!/usr/bin/env bash
# Doppler の EXPO_PUBLIC_* を EAS の Environment Variables へ同期する（ビルドはしない）。
#
#   sync-eas-env production      # Doppler prd → EAS production
#   sync-eas-env staging         # Doppler stg → EAS preview
#   sync-eas-env dev             # Doppler dev → EAS development
#   DRY_RUN=1 sync-eas-env production   # 対象キーを表示するだけ
#
# なぜ必要か:
#   Doppler は Vercel / Supabase へはネイティブ連携があるが **EAS には無い**。
#   一方 eas.json の各ビルドプロファイルは `"environment": "production"` 等で EAS 側の
#   Environment Variables を参照する。したがってここで橋渡しする。
#   特に EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY が無いと createClient() が throw し、
#   **ビルドしたアプリが起動直後にクラッシュする**。
#
# release-ios.sh / release-android.sh はビルド前に同じ処理を自動で行うので、
# 通常このスクリプトを単体で叩く必要はない（EAS 側の値だけ直したいときに使う）。
#
# 同期対象は env にある EXPO_PUBLIC_* **全部**。この prefix は「バンドルに出てよい公開値」を
# 意味するので、prefix 自体が安全性の判定条件になっている。サーバ側 secret
# （POSTGRES_URL 等）はこの prefix を持たないので自動的に除外される。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/mobile/lib.sh
. "$SCRIPT_DIR/lib.sh"

main() {
  mobile_load_config

  # 引数を優先する。`ENV` はシェル起動ごとに外部から上書きされることがあるため
  # （devenv の enterShell が ENV=local を入れる）、引数で明示できるようにしてある。
  local target="${1:-${ENV:-}}"
  case "$target" in
    production|staging|dev) ENV="$target"; export ENV ;;
    *)
      mdie "対象環境を指定してください: production | staging | dev（例: sync-eas-env production）" ;;
  esac

  mobile_doppler_reexec "$@"
  mobile_require_expo_token

  local environment; environment="$(mobile_eas_environment)"
  mlog "Doppler[$(mobile_doppler_config)] → EAS[${environment}]"
  mobile_push_public_env "$environment" "${DRY_RUN:-}"

  printf '\n'
  mok "確認: cd ${MOBILE_APP_DIR} && bunx ${EAS_CLI_SPEC} env:list --environment ${environment}"
}

main "$@"
