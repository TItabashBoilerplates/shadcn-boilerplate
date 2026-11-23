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

variable "retention" {
  description = "Deployment Retention。既定は無期限でコストが積み上がるため全種別 1d。'1d'/'1w'/'1m'/'2m'/'3m'/'6m'/'1y' のみ（'unlimited' は不可）。"
  type = object({
    preview    = optional(string, "1d")
    production = optional(string, "1d")
    canceled   = optional(string, "1d")
    errored    = optional(string, "1d")
  })
  default = {}

  validation {
    condition = alltrue([
      for v in values(var.retention) : contains(["1d", "1w", "1m", "2m", "3m", "6m", "1y"], v)
    ])
    error_message = "retention は 1d/1w/1m/2m/3m/6m/1y のいずれか。無期限（unlimited）はコスト増の原因なので禁止。"
  }
}
