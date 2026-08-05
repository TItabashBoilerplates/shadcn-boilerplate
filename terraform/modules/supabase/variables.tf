variable "project_name" {
  description = "Supabase project 名（= production）。環境 prefix は付けない。"
  type        = string
}

variable "organization_id" {
  description = "Supabase organization の slug / ID。"
  type        = string
}

variable "region" {
  description = "リージョン。"
  type        = string
}

variable "instance_size" {
  description = "production project のインスタンスサイズ。"
  type        = string
}

variable "database_password" {
  description = "project の DB パスワード。"
  type        = string
  sensitive   = true
}

variable "branch_environments" {
  description = <<-EOT
    persistent branch として作る非 production 環境（環境名 → { git_branch, ... }）。
    Branching に GitHub 連携は不要（2026-05 以降 Git なし branching が全 project の既定）。
  EOT
  type = map(object({
    git_branch         = string
    doppler_config     = string
    github_environment = string
  }))
  default = {}
}

variable "repo_root" {
  description = "リポジトリルートの絶対パス。"
  type        = string
}

variable "manage_settings" {
  description = "Terraform が auth / api 設定を所有するか。"
  type        = bool
  default     = true
}

variable "manage_edge_functions" {
  description = "supabase/functions/*/index.ts を Terraform でデプロイするか。"
  type        = bool
  default     = true
}

variable "site_urls" {
  description = "環境名 → site_url。"
  type        = map(string)
  default     = {}
}

variable "additional_redirect_urls" {
  description = "環境名 → 追加リダイレクト許可 URL のリスト。"
  type        = map(list(string))
  default     = {}
}

variable "auth_settings_extra" {
  description = "auth 設定の追加フィールド（UpdateAuthConfigBody のキーをそのまま）。"
  type        = any
  default     = {}
}

variable "api_settings" {
  description = "PostgREST 設定。"
  type = object({
    db_schema            = optional(string, "public,storage,graphql_public")
    db_extra_search_path = optional(string, "public,extensions")
    max_rows             = optional(number, 1000)
  })
  default = {}
}

variable "email_subjects" {
  description = <<-EOT
    認証メールの件名（テンプレート名 → 件名）。
    キーは supabase/templates/email/<name>.html のファイル名と対応させる。
  EOT
  type        = map(string)
  default = {
    confirmation = "Confirm Your Signup / サインアップ確認"
    recovery     = "Reset Your Password / パスワードリセット"
    magic_link   = "Your Magic Link / マジックリンク"
    invite       = "You have been invited / 招待されました"
    email_change = "Confirm Email Change / メールアドレス変更確認"
  }
}
