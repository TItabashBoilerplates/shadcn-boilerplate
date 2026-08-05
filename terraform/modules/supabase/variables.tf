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
