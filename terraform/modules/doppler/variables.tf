variable "project" {
  description = "Doppler project 名。"
  type        = string
}

variable "create_project" {
  description = "false なら既存 project を参照するだけ（作成しない）。"
  type        = bool
  default     = true
}

variable "environments" {
  description = "環境名 → { doppler_config, github_environment, ... }。"
  type = map(object({
    git_branch         = string
    doppler_config     = string
    github_environment = string
  }))
}

variable "manage_generated_secrets" {
  description = "生成値（POSTGRES_URL / EXPO_PUBLIC_*）を Doppler に書き込むか。"
  type        = bool
  default     = true
}

variable "postgres_urls" {
  description = "環境名 → 直結 DB 接続文字列。"
  type        = map(string)
  sensitive   = true
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
  description = "環境名 → backend の公開 URL。"
  type        = map(string)
  default     = {}
}

variable "github_integration_id" {
  description = "Doppler → GitHub Actions sync に使う integration の slug / ID。空なら sync を作らない。"
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "sync 先の GitHub リポジトリ名。"
  type        = string
}
