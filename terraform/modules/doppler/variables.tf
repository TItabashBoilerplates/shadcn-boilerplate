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
  description = <<-EOT
    環境名 → Drizzle migration 用の接続文字列（Supavisor session pooler / IPv4）。
    解決できなかった環境はキーが無い状態で渡ってくるので、その環境には書き込まない。
  EOT
  type        = map(string)
  sensitive   = true
}

variable "postgres_url_envs" {
  description = <<-EOT
    POSTGRES_URL を配る対象の環境名（session pooler の接続先を解決できた環境）。
    postgres_urls は sensitive で for_each に使えないため、判断はこの非機密リストで行う。
  EOT
  type        = list(string)
  default     = []
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
