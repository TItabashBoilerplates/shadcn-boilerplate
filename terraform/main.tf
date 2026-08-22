locals {
  # branch → 環境の対応。scripts/infra/lib.sh の git_branch_for / doppler_config_for、
  # および docs/deployment/README.md の branch→env マッピングと**必ず一致させる**。
  environments = {
    dev = {
      git_branch         = "develop"
      doppler_config     = "dev"
      github_environment = "dev"
    }
    staging = {
      git_branch         = "staging"
      doppler_config     = "stg"
      github_environment = "staging"
    }
    production = {
      git_branch         = "main"
      doppler_config     = "prd"
      github_environment = "production"
    }
  }

  # production は Supabase project 本体。それ以外は persistent branch として作る。
  branch_environments = { for k, v in local.environments : k => v if k != "production" }

  vercel_backend_project = var.vercel_backend_project != "" ? var.vercel_backend_project : "${var.app_name}-api"
  doppler_project        = var.doppler_project != "" ? var.doppler_project : var.app_name
}

module "github" {
  source = "./modules/github"

  owner                = var.github_owner
  repository           = var.github_repository
  create_repository    = var.create_github_repository
  template             = var.github_template
  visibility           = var.github_repository_visibility
  environments         = local.environments
  production_reviewers = var.production_reviewers

  # Supabase の ref を各 GitHub Environment の Actions variable として配る。
  # deploy-supabase.yml がこれを読んでデプロイ先を決めるので、これが継続デプロイの橋になる。
  # Doppler 経由にできない理由（SUPABASE_ prefix は登録不可）は modules/github/main.tf 参照。
  supabase_env_refs = module.supabase.env_refs
}

# Supabase のサービス設定（Auth / API / Storage / メールテンプレート）と
# Edge Functions / Storage buckets は **config.toml が single source of truth** なので
# ここでは扱わない。Terraform は project と branch だけを作り、その ref を
# `supabase config push --project-ref` 等に渡す入力として output する。
module "supabase" {
  source = "./modules/supabase"

  project_name      = var.app_name
  organization_id   = var.supabase_organization_id
  region            = var.supabase_region
  instance_size     = var.supabase_instance_size
  database_password = var.supabase_db_password

  branch_environments = local.branch_environments
}

module "vercel" {
  source = "./modules/vercel"

  web_project_name       = var.app_name
  web_root_directory     = var.vercel_web_root_directory
  backend_project_name   = local.vercel_backend_project
  backend_root_directory = var.vercel_backend_root_directory

  github_repo       = "${var.github_owner}/${var.github_repository}"
  production_branch = var.vercel_production_branch

  environments = local.environments

  # Vercel⇄Supabase の Marketplace 連携（Connect Account）は Terraform に resource が無いため、
  # Supabase の値は **Terraform が直接 Vercel の env に書く**。
  # 注入キー名を自分で決めるので「新体系/旧体系でキー名が揺れる」問題も起きない。
  supabase_urls             = module.supabase.api_urls
  supabase_publishable_keys = module.supabase.publishable_keys
  backend_urls              = var.backend_urls
}

module "doppler" {
  source = "./modules/doppler"

  project        = local.doppler_project
  create_project = var.create_doppler_project
  environments   = local.environments

  manage_generated_secrets = var.manage_generated_secrets

  # Vercel の外にいる消費者（Expo mobile / Drizzle migration）向けの生成値だけを配る。
  # Vercel 上の web / backend へは module.vercel が直接 env を書くので Doppler を経由しない。
  postgres_urls             = module.supabase.postgres_urls
  postgres_url_envs         = module.supabase.postgres_url_envs
  supabase_urls             = module.supabase.api_urls
  supabase_publishable_keys = module.supabase.publishable_keys
  backend_urls              = var.backend_urls

  github_integration_id = var.doppler_github_integration_id
  github_repository     = var.github_repository
}
