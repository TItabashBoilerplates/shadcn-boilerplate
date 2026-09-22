variable "project_name" {
  description = "Vercel project 名（web と backend-py の services を 1 つに載せる）。"
  type        = string
}

variable "github_repo" {
  description = "owner/repo 形式。project がこの repo を監視する。"
  type        = string
}

variable "production_branch" {
  description = "production デプロイを起動する branch。"
  type        = string
}

variable "environments" {
  description = "環境名 → { git_branch, ... }。"
  type = map(object({
    git_branch         = string
    doppler_config     = string
    github_environment = string
  }))
}

variable "supabase_urls" {
  description = "環境名 → Supabase API URL。"
  type        = map(string)
}

variable "supabase_publishable_keys" {
  description = "環境名 → Supabase publishable key。"
  type        = map(string)
  sensitive   = true
}

variable "container_port" {
  description = "コンテナ service の listen ポート（Dockerfile の ENV PORT と同じ値。1024 以上）。"
  type        = number

  validation {
    condition     = var.container_port >= 1024
    error_message = "非 root コンテナは 1024 未満を bind できない。Dockerfile の ENV PORT を確認すること。"
  }
}
