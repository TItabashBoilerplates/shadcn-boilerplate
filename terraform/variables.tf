# ─────────────────────────────────────────────────────────────────────────────
# 共通
# ─────────────────────────────────────────────────────────────────────────────

variable "app_name" {
  description = "アプリ名。Supabase project / Vercel(web) project / Doppler project の名前に使う（環境 prefix は付けない）。"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$", var.app_name))
    error_message = "app_name は小文字英数字とハイフンのみ、3〜40 文字にしてください（各 PaaS の project 名に使うため）。"
  }
}


# ─────────────────────────────────────────────────────────────────────────────
# GitHub
# ─────────────────────────────────────────────────────────────────────────────

variable "github_owner" {
  description = "GitHub の owner（org もしくは user）。"
  type        = string
}

variable "github_repository" {
  description = "対象リポジトリ名（owner は github_owner）。全 PaaS がこの repo を監視する。"
  type        = string
}

variable "create_github_repository" {
  description = <<-EOT
    true にすると boilerplate の template repository から新規 repo を生成する。
    既存 repo（この boilerplate 自身を含む）に対して適用する場合は false のままにする。
  EOT
  type        = bool
  default     = false
}

variable "github_template" {
  description = "create_github_repository = true のときに使う template repository。"
  type = object({
    owner                = string
    repository           = string
    include_all_branches = optional(bool, false)
  })
  default = null
}

variable "github_repository_visibility" {
  description = "生成する repo の可視性（create_github_repository = true のときのみ使用）。"
  type        = string
  default     = "private"

  validation {
    condition     = contains(["public", "private", "internal"], var.github_repository_visibility)
    error_message = "visibility は public / private / internal のいずれかにしてください。"
  }
}

variable "production_reviewers" {
  description = <<-EOT
    production 環境の required reviewers（GitHub ログイン名）。
    migrate.yml の本番適用がこの承認を待つ（.claude/rules/database.md）。
    空にすると承認ゲート無しになる（非推奨）。
  EOT
  type        = list(string)
  default     = []
}

# ─────────────────────────────────────────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────────────────────────────────────────

variable "supabase_organization_id" {
  description = "Supabase organization の slug / ID（非機密）。"
  type        = string
}

variable "supabase_region" {
  description = "Supabase のリージョン（例: ap-northeast-1）。"
  type        = string
  default     = "ap-northeast-1"
}

variable "supabase_instance_size" {
  description = "production project のインスタンスサイズ（例: micro / small）。"
  type        = string
  default     = "micro"
}

variable "supabase_db_password" {
  description = <<-EOT
    Supabase project の DB パスワード。**tfvars に書かず** TF_VAR_supabase_db_password で渡す
    （tf-* script が Doppler bootstrap config の SB_DB_PASSWORD から注入する）。
  EOT
  type        = string
  sensitive   = true
}







# ─────────────────────────────────────────────────────────────────────────────
# Vercel
# ─────────────────────────────────────────────────────────────────────────────

variable "vercel_team_id" {
  description = "Vercel team(org) の ID。個人アカウントなら空文字。"
  type        = string
  default     = ""
}

variable "vercel_web_root_directory" {
  description = "web（Next.js）project の Root Directory。"
  type        = string
  default     = "frontend/apps/web"
}

variable "vercel_backend_project" {
  description = <<-EOT
    backend（FastAPI コンテナ）の Vercel project 名。web（app_name）と衝突しない別名にする。
    空にすると "<app_name>-api" になる。
  EOT
  type        = string
  default     = ""
}

variable "vercel_backend_root_directory" {
  description = <<-EOT
    backend project の Root Directory。backend-py/vercel.json の services が
    apps/<app>/Dockerfile.vercel を指すため、uv workspace ルートを指定する。
  EOT
  type        = string
  default     = "backend-py"
}

variable "vercel_production_branch" {
  description = "production デプロイを起動する branch。"
  type        = string
  default     = "main"
}

variable "backend_urls" {
  description = <<-EOT
    環境ごとの backend 公開 URL（キー: dev / staging / production）。
    未指定の環境は NEXT_PUBLIC_BACKEND_PY_URL / EXPO_PUBLIC_BACKEND_PY_URL を配線しない。
    ⚠️ preview の URL（<project>-git-<branch>-<slug>.vercel.app）は team slug に依存し
       Terraform からは確定できないため、必要なら明示指定する。
  EOT
  type        = map(string)
  default     = {}
}

# ─────────────────────────────────────────────────────────────────────────────
# Doppler
# ─────────────────────────────────────────────────────────────────────────────

variable "doppler_project" {
  description = "Doppler project 名。空にすると app_name を使う（doppler.yaml と一致させる）。"
  type        = string
  default     = ""
}

variable "create_doppler_project" {
  description = "false にすると既存の Doppler project を参照するだけにする（作成しない）。"
  type        = bool
  default     = true
}

variable "manage_generated_secrets" {
  description = <<-EOT
    true にすると「プロビジョニングの結果生成される値」（POSTGRES_URL / EXPO_PUBLIC_*）を
    Terraform が Doppler に書き込む（= scripts/infra/wire.sh の置き換え）。
    ⚠️ 値が state に平文で載るため、HCP Terraform 等の暗号化 backend が前提。
    外部 API キー（OpenAI 等）はここでは扱わない（doppler MCP で投入する）。
  EOT
  type        = bool
  default     = true
}

variable "doppler_github_integration_id" {
  description = <<-EOT
    Doppler → GitHub Actions sync に使う integration の slug / ID。
    integration 自体（GitHub OAuth）は Doppler dashboard でしか作れないため、
    作成済みのものを指定する。空なら sync を作らない。
  EOT
  type        = string
  default     = ""
}
