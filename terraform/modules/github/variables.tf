variable "owner" {
  description = "GitHub owner（org もしくは user）。"
  type        = string
}

variable "repository" {
  description = "リポジトリ名。"
  type        = string
}

variable "create_repository" {
  description = "true なら template repository から新規生成する。"
  type        = bool
  default     = false
}

variable "template" {
  description = "生成元の template repository（create_repository = true のときのみ）。"
  type = object({
    owner                = string
    repository           = string
    include_all_branches = optional(bool, false)
  })
  default = null
}

variable "visibility" {
  description = "生成する repo の可視性。"
  type        = string
  default     = "private"
}

variable "environments" {
  description = "環境名 → { git_branch, github_environment, ... } の map。"
  type = map(object({
    git_branch         = string
    github_environment = string
    doppler_config     = string
  }))
}

variable "production_reviewers" {
  description = "production environment の required reviewers（GitHub ログイン名）。"
  type        = list(string)
  default     = []
}
