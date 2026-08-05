# ─────────────────────────────────────────────────────────────────────────────
# Project
#
# doppler_project は既定で dev / stg / prd の environment と同名の root config を作る。
# そのため environment / config を明示的に作らず、名前で参照する。
# ─────────────────────────────────────────────────────────────────────────────

resource "doppler_project" "this" {
  count = var.create_project ? 1 : 0

  name        = var.project
  description = "Managed by Terraform (terraform/modules/doppler)"
}

# ─────────────────────────────────────────────────────────────────────────────
# 生成値の配線（= scripts/infra/wire.sh の置き換え）
#
# Doppler に置くのは **Vercel の外にいる消費者**が必要とする値だけ:
#   - Drizzle migration (GitHub Actions) → POSTGRES_URL
#   - Expo mobile (EAS)                  → EXPO_PUBLIC_*
# Vercel 上の web / backend へは module.vercel が直接 env を書くので Doppler を経由しない
# （二重管理の禁止）。外部 API キー（OpenAI 等）はここでは扱わない = doppler MCP で投入する。
#
# for_each には非機密の spec マップだけを渡し、値は別マップから引く
# （sensitive な値から作った map は for_each に使えないため）。
# ─────────────────────────────────────────────────────────────────────────────

locals {
  env_names = keys(var.environments)

  wired_backend_envs = [for k in local.env_names : k if lookup(var.backend_urls, k, "") != ""]

  secret_specs = var.manage_generated_secrets ? merge(
    {
      for pair in setproduct(local.env_names, [
        "POSTGRES_URL",
        "EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ]) :
      "${pair[0]}/${pair[1]}" => { environment = pair[0], name = pair[1] }
    },
    {
      for pair in setproduct(local.wired_backend_envs, [
        "NEXT_PUBLIC_BACKEND_PY_URL",
        "EXPO_PUBLIC_BACKEND_PY_URL",
      ]) :
      "${pair[0]}/${pair[1]}" => { environment = pair[0], name = pair[1] }
    },
  ) : {}

  secret_values = merge(
    { for k, v in var.postgres_urls : "${k}/POSTGRES_URL" => v },
    { for k, v in var.supabase_urls : "${k}/EXPO_PUBLIC_SUPABASE_URL" => v },
    { for k, v in var.supabase_publishable_keys : "${k}/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" => v },
    { for k, v in var.backend_urls : "${k}/NEXT_PUBLIC_BACKEND_PY_URL" => v },
    { for k, v in var.backend_urls : "${k}/EXPO_PUBLIC_BACKEND_PY_URL" => v },
  )
}

resource "doppler_secret" "generated" {
  for_each = local.secret_specs

  project = var.project
  config  = var.environments[each.value.environment].doppler_config
  name    = each.value.name
  value   = local.secret_values[each.key]

  lifecycle {
    # `GITHUB_` / `SUPABASE_` / `VERCEL_` は各 PF の予約名前空間。Doppler に登録すると
    # ネイティブ連携の sync が予約値違反で落ち、その config の sync 全体が失敗する。
    # → .claude/rules/env-naming.md をコードで強制する。
    precondition {
      condition     = !can(regex("^(GITHUB|SUPABASE|VERCEL)_", each.value.name))
      error_message = "予約 prefix（GITHUB_/SUPABASE_/VERCEL_）のキーは Doppler に登録できません: ${each.value.name}"
    }
  }

  depends_on = [doppler_project.this]
}

# ─────────────────────────────────────────────────────────────────────────────
# GitHub Actions への sync
#
# migrate.yml が ${{ secrets.POSTGRES_URL }} で解決できるよう、
# **GitHub Environment 単位**で sync する（environment_name を指定すると
# Repository secrets ではなく Environment secrets に入る）。
#
# ⚠️ integration そのもの（Doppler ⇄ GitHub の OAuth）は Doppler dashboard でしか作れない。
#    provider にも resource が無いため、作成済み integration の ID を渡す設計にしている。
#    Doppler → Vercel / Supabase の sync は provider に resource が存在しないため扱わない
#    （そのぶんは Terraform が直接 env を書く = module.vercel）。
# ─────────────────────────────────────────────────────────────────────────────

resource "doppler_secrets_sync_github_actions" "this" {
  for_each = var.github_integration_id != "" ? var.environments : {}

  integration = var.github_integration_id
  project     = var.project
  config      = each.value.doppler_config

  sync_target      = "repo"
  repo_name        = var.github_repository
  environment_name = each.value.github_environment

  depends_on = [doppler_project.this]
}
