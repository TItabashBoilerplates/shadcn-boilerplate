variable "web_project_name" {
  description = "web（Next.js）の Vercel project 名。"
  type        = string
}

variable "web_root_directory" {
  description = "web project の Root Directory。"
  type        = string
}

variable "backend_project_name" {
  description = "backend（FastAPI コンテナ）の Vercel project 名。"
  type        = string
}

variable "backend_root_directory" {
  description = "backend project の Root Directory。"
  type        = string
}

variable "github_repo" {
  description = "owner/repo 形式。両 project がこの repo を監視する。"
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

variable "backend_urls" {
  description = "環境名 → backend の公開 URL。未指定の環境は配線しない。"
  type        = map(string)
  default     = {}
}
