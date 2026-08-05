# 新規アプリを立ち上げるときの入力テンプレート。
#   cp terraform/apps/example.example.tfvars terraform/apps/<app>.tfvars
#   $EDITOR terraform/apps/<app>.tfvars
#   tf-plan <app>
#
# ⚠️ ここには **非機密値だけ**を書く。トークン / DB パスワードは書かない
#    （tf-* script が Doppler の bootstrap config から環境変数で注入する）。
#    apps/*.tfvars は .gitignore 対象（*.example.tfvars だけコミットされる）。

# ── 共通 ──────────────────────────────────────────────────────────────────
app_name = "myapp"

# ── GitHub ────────────────────────────────────────────────────────────────
github_owner      = "your-org"
github_repository = "myapp"

# 既存 repo に適用するなら false のまま。
# true にすると boilerplate の template repository から新規 repo を生成する。
create_github_repository = false
# github_template = {
#   owner                = "TItabashBoilerplates"
#   repository           = "shadcn-boilerplate"
#   include_all_branches = true
# }

# production の migration を承認するユーザー（GitHub ログイン名）。
production_reviewers = ["your-github-login"]

# ── Supabase ──────────────────────────────────────────────────────────────
supabase_organization_id = "your-org-slug"
supabase_region          = "ap-northeast-1"
supabase_instance_size   = "micro"

supabase_site_urls = {
  production = "https://myapp.example.com"
  staging    = "https://myapp-staging.example.com"
  dev        = "http://localhost:3000"
}

supabase_additional_redirect_urls = {
  production = ["https://myapp.example.com/**"]
  staging    = ["https://myapp-staging.example.com/**"]
  dev        = ["http://localhost:3000/**"]
}

# OAuth provider / MFA / Auth Hooks 等は UpdateAuthConfigBody のキーをそのまま渡す。
# ⚠️ secret を含む値はここに書かない（state に平文で載る）。
# supabase_auth_settings_extra = {
#   external_google_enabled  = true
#   mfa_totp_enroll_enabled  = true
#   mailer_autoconfirm       = false
# }

# ── Vercel ────────────────────────────────────────────────────────────────
# 個人アカウントなら空文字のまま。
vercel_team_id = ""

# backend の Vercel project 名（省略すると "<app_name>-api"）。
# vercel_backend_project = "myapp-api"

# backend の公開 URL。preview の URL は team slug 依存で Terraform からは確定できないため、
# 必要な環境だけ実 URL を明示する（未指定の環境は BACKEND_PY_URL を配線しない）。
backend_urls = {
  production = "https://myapp-api.vercel.app"
}

# ── Doppler ───────────────────────────────────────────────────────────────
# 省略すると app_name。doppler.yaml の project 名と一致させる。
# doppler_project = "myapp"

# Doppler ⇄ GitHub の integration は dashboard でしか作れないため、作成済みの ID を渡す。
# 空のままだと migrate.yml 用の POSTGRES_URL が GitHub Environment に届かない。
doppler_github_integration_id = ""
