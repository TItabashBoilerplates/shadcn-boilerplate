#!/usr/bin/env bash
# scripts/supabase/*.sh の共通ヘルパ。
#
# 各スクリプトに同じ ENV ガードがコピペされていたのを集約している
# （.claude/rules/clean-code.md の重複禁止）。
set -euo pipefail

SB_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SB_LIB_DIR/../.." && pwd)"

sb_log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
sb_ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
sb_warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*" >&2; }
sb_die()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# リモート環境向けのスクリプトなので、local / 未指定なら何もせず正常終了する。
sb_require_remote_env() {
  ENV="${ENV:-}"
  if [ "$ENV" = "local" ] || [ -z "$ENV" ]; then
    echo "⚠️  Skipping for local environment"
    exit 0
  fi
}

# 対象 project の ref を必須にする。
#
# ⚠️ `SUPABASE_` prefix のキーは Doppler に登録できない（.claude/rules/env-naming.md）ため、
#    ref は Doppler からは供給されない。**Terraform が唯一の供給元**で、経路は 2 つ:
#
#      ローカル (infra-deploy) : terraform output supabase_env_refs
#      CI (deploy-supabase.yml): Terraform が書いた GitHub Environment variable
#                                SUPABASE_PROJECT_REF → workflow が輸送変数へ載せる
#
#    persistent branch の ref は Terraform が branch を作るまで存在しないので、
#    ここを env ファイルにハードコードしないこと。
#
# ⚠️ **呼び出し側は DEPLOY_SUPABASE_PROJECT_REF で渡すこと。**
#    devenv の enterShell は `set -a; . env/<svc>/.env.$ENV` を行うため、その ENV の env ファイルが
#    `SUPABASE_PROJECT_REF` を定義していると **外から渡した値が上書きされる**。
#    実際 env/backend/.env.local は `SUPABASE_PROJECT_REF=`（空）を定義していた（本対応で削除）。
#    同じ定義が `.env.<ENV>` に置かれた瞬間に「ref が空のまま deploy が走る」事故になる
#    （db:migrate-deploy が MIGRATE_POSTGRES_URL を使っているのと同じ理由・同じ対策）。
#    `DEPLOY_SUPABASE_PROJECT_REF` は devenv も env ファイルも定義しない名前なので確実に伝わる。
sb_require_project_ref() {
  # 輸送変数が来ていればそれを正とする（env ファイルによる上書きを無効化する）。
  if [ -n "${DEPLOY_SUPABASE_PROJECT_REF:-}" ]; then
    export SUPABASE_PROJECT_REF="$DEPLOY_SUPABASE_PROJECT_REF"
  fi

  [ -n "${SUPABASE_PROJECT_REF:-}" ] || sb_die "SUPABASE_PROJECT_REF が未設定です（DEPLOY_SUPABASE_PROJECT_REF も空）。
  ローカル: DEPLOY_SUPABASE_PROJECT_REF=\"\$(tf-output <app> -json supabase_env_refs | jq -r .${ENV:-<env>})\"
  CI      : GitHub Environment '${ENV:-<env>}' の Actions variable SUPABASE_PROJECT_REF が
            未設定です。infra-deploy（terraform apply）を実行してください。"
}
