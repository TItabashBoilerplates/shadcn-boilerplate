# ─────────────────────────────────────────────────────────────────────────────
# Projects
#
# web     : Next.js。ビルド設定は frontend/apps/web/vercel.json が持つので Terraform では触らない
#           （buildCommand / installCommand / headers / functions は vercel.json 側が正）。
# backend : FastAPI。framework は指定しない（"other"）。コンテナ化は backend-py/vercel.json の
#           services.<app>（runtime = "container", entrypoint = apps/<app>/Dockerfile.vercel）が担う。
#           アプリを増やすときは vercel.json に service を足すだけで、ここは変更不要。
#
# ⚠️ git_repository の紐付けには Vercel の GitHub App が対象 repo に install 済みである必要がある
#    （provider docs 明記）。これは GitHub org につき一度きりの dashboard 作業。
# ─────────────────────────────────────────────────────────────────────────────

resource "vercel_project" "web" {
  name           = var.web_project_name
  framework      = "nextjs"
  root_directory = var.web_root_directory

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }
}

resource "vercel_project" "backend" {
  name           = var.backend_project_name
  root_directory = var.backend_root_directory

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 環境変数
#
# Supabase の値は **Terraform が直接書く**（Marketplace「Connect Account」は Terraform に
# resource が無く、注入されるキー名も新旧体系で揺れるため）。キー名を自分で決めるので
# アプリ側の参照名と必ず一致する。
#
# for_each には **非機密の spec マップ**だけを渡し、実際の値は別マップから引く。
# （sensitive な値から作った map は for_each に使えないため。）
# ─────────────────────────────────────────────────────────────────────────────

locals {
  env_names = keys(var.environments)

  # backend URL は環境ごとに指定された分だけ配線する（preview の URL は team slug 依存で
  # Terraform からは確定できないため、必要なら backend_urls で明示指定する）。
  wired_backend_envs = [for k in local.env_names : k if lookup(var.backend_urls, k, "") != ""]

  web_var_specs = merge(
    {
      for pair in setproduct(local.env_names, [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ]) :
      "${pair[0]}/${pair[1]}" => { environment = pair[0], key = pair[1] }
    },
    {
      for k in local.wired_backend_envs :
      "${k}/NEXT_PUBLIC_BACKEND_PY_URL" => { environment = k, key = "NEXT_PUBLIC_BACKEND_PY_URL" }
    },
  )

  backend_var_specs = {
    for pair in setproduct(local.env_names, [
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
    ]) :
    "${pair[0]}/${pair[1]}" => { environment = pair[0], key = pair[1] }
  }

  var_values = merge(
    { for k, v in var.supabase_urls : "${k}/NEXT_PUBLIC_SUPABASE_URL" => v },
    { for k, v in var.supabase_publishable_keys : "${k}/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" => v },
    { for k, v in var.backend_urls : "${k}/NEXT_PUBLIC_BACKEND_PY_URL" => v },
    { for k, v in var.supabase_urls : "${k}/SUPABASE_URL" => v },
    { for k, v in var.supabase_publishable_keys : "${k}/SUPABASE_PUBLISHABLE_KEY" => v },
  )
}

resource "vercel_project_environment_variable" "web" {
  for_each = local.web_var_specs

  project_id = vercel_project.web.id
  key        = each.value.key
  value      = local.var_values[each.key]

  # production 環境は Production target、それ以外は該当 branch の Preview に限定する。
  target     = each.value.environment == "production" ? ["production"] : ["preview"]
  git_branch = each.value.environment == "production" ? null : var.environments[each.value.environment].git_branch

  # publishable key / URL はいずれもクライアントに露出する前提の値なので Vercel 側では非 sensitive。
  sensitive = false
}

resource "vercel_project_environment_variable" "backend" {
  for_each = local.backend_var_specs

  project_id = vercel_project.backend.id
  key        = each.value.key
  value      = local.var_values[each.key]

  target     = each.value.environment == "production" ? ["production"] : ["preview"]
  git_branch = each.value.environment == "production" ? null : var.environments[each.value.environment].git_branch

  sensitive = false
}
