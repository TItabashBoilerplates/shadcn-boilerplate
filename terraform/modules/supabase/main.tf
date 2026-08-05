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
#
# ⚠️ **このモジュールはサービス設定を管理しない。**
#    Auth / API / Storage / メールテンプレート / Edge Functions / Storage buckets は
#    `supabase/config.toml` が single source of truth（.claude/rules/supabase-config.md）であり、
#    反映は `supabase config push --project-ref <ref>` / `deploy:functions` / `seed buckets` が担う。
#    Terraform が担うのは「config.toml では作れないもの」= project と branch そのもの。
#    責務分担の詳細は terraform/README.md を参照。
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
  # この map が `supabase config push --project-ref` / `functions deploy --project-ref` の入力になる。
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
