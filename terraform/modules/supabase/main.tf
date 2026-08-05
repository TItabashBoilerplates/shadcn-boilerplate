# ─────────────────────────────────────────────────────────────────────────────
# Project（= production）+ persistent branch（staging / develop）
#
# Supabase は「1 project + Branching」構成。project 本体が production で、
# 非 production は persistent branch（long-lived）として持つ。
#
# ℹ️ Branching の利用に GitHub 連携は不要。Supabase は Branching 2.0 で Git 要件を外し、
#    2026-05-04 に「Git なしの Branching」を全 project の既定にした。
#    Management API の CreateBranchBody も必須は branch_name のみ。
#    ⚠️ persistent branch は long-lived = 常時 compute 課金（Spend Cap 対象外）。
# ─────────────────────────────────────────────────────────────────────────────

resource "supabase_project" "this" {
  name              = var.project_name
  organization_id   = var.organization_id
  region            = var.region
  instance_size     = var.instance_size
  database_password = var.database_password

  lifecycle {
    # project を作り直すと ref が変わり、全環境の接続情報が壊れる。
    prevent_destroy = true

    # DB パスワードのローテーションを Terraform の差分にしない（別経路で回す）。
    ignore_changes = [database_password]
  }
}

resource "supabase_branch" "this" {
  for_each = var.branch_environments

  parent_project_ref = supabase_project.this.id
  git_branch         = each.value.git_branch
  region             = var.region
  persistent         = true
}

locals {
  # 環境名 → その環境の project ref。
  # branch の database.id は「Branch project ref」（provider schema の description で確認済み）。
  env_refs = merge(
    { production = supabase_project.this.id },
    { for k, b in supabase_branch.this : k => b.database.id },
  )

  api_urls = { for k, ref in local.env_refs : k => "https://${ref}.supabase.co" }
}

data "supabase_apikeys" "this" {
  for_each = local.env_refs

  project_ref = each.value
}

# ─────────────────────────────────────────────────────────────────────────────
# リモート設定（auth / api）
#
# supabase_settings.auth は Management API の UpdateAuthConfigBody を JSON で受け取る。
# メールテンプレートの**本文**（mailer_templates_*_content）まで含むため、
# supabase/templates/email/*.html をそのまま流し込める。
#
# ⚠️ config.toml の GitHub 連携同期と併用すると二重書き込みになる。どちらか一方に寄せること。
# ─────────────────────────────────────────────────────────────────────────────

locals {
  email_template_dir = "${var.repo_root}/supabase/templates/email"

  # <name>.html → 本文。存在するファイルだけを対象にする。
  email_templates = {
    for f in fileset(local.email_template_dir, "*.html") :
    trimsuffix(f, ".html") => file("${local.email_template_dir}/${f}")
  }

  # テンプレート名 → UpdateAuthConfigBody のフィールド名
  mailer_content_fields = {
    confirmation     = "mailer_templates_confirmation_content"
    recovery         = "mailer_templates_recovery_content"
    magic_link       = "mailer_templates_magic_link_content"
    invite           = "mailer_templates_invite_content"
    email_change     = "mailer_templates_email_change_content"
    reauthentication = "mailer_templates_reauthentication_content"
  }

  mailer_subject_fields = {
    confirmation     = "mailer_subjects_confirmation"
    recovery         = "mailer_subjects_recovery"
    magic_link       = "mailer_subjects_magic_link"
    invite           = "mailer_subjects_invite"
    email_change     = "mailer_subjects_email_change"
    reauthentication = "mailer_subjects_reauthentication"
  }

  mailer_content_settings = {
    for name, field in local.mailer_content_fields :
    field => local.email_templates[name]
    if contains(keys(local.email_templates), name)
  }

  mailer_subject_settings = {
    for name, field in local.mailer_subject_fields :
    field => var.email_subjects[name]
    if contains(keys(var.email_subjects), name)
  }

  api_settings_json = jsonencode({
    db_schema            = var.api_settings.db_schema
    db_extra_search_path = var.api_settings.db_extra_search_path
    max_rows             = var.api_settings.max_rows
  })
}

resource "supabase_settings" "this" {
  for_each = var.manage_settings ? local.env_refs : {}

  project_ref = each.value

  api = local.api_settings_json

  auth = jsonencode(merge(
    local.mailer_content_settings,
    local.mailer_subject_settings,
    lookup(var.site_urls, each.key, null) != null ? { site_url = var.site_urls[each.key] } : {},
    lookup(var.additional_redirect_urls, each.key, null) != null ? {
      uri_allow_list = join(",", var.additional_redirect_urls[each.key])
    } : {},
    var.auth_settings_extra,
  ))
}

# ─────────────────────────────────────────────────────────────────────────────
# Edge Functions
#
# supabase/functions/ 配下から index.ts を持つディレクトリを自動検出して、
# 全環境（production project + 各 persistent branch）へデプロイする。
# 関数を足したら Terraform 側の変更は不要（fileset が拾う）。
# ─────────────────────────────────────────────────────────────────────────────

locals {
  functions_dir   = "${var.repo_root}/supabase/functions"
  import_map_path = "${local.functions_dir}/deno.json"

  edge_function_slugs = var.manage_edge_functions ? [
    for f in fileset(local.functions_dir, "*/index.ts") : dirname(f)
  ] : []

  # for_each のキーは plan 時に確定している必要があるため、環境名 × slug の文字列キーにする
  # （値の ref は apply 時に解決される）。
  edge_function_deployments = {
    for pair in setproduct(keys(local.env_refs), local.edge_function_slugs) :
    "${pair[0]}/${pair[1]}" => {
      environment = pair[0]
      slug        = pair[1]
    }
  }
}

resource "supabase_edge_function" "this" {
  for_each = local.edge_function_deployments

  project_ref = local.env_refs[each.value.environment]
  slug        = each.value.slug
  entrypoint  = "${local.functions_dir}/${each.value.slug}/index.ts"
  import_map  = fileexists(local.import_map_path) ? local.import_map_path : null
}
