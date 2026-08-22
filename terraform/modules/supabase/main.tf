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

# ─────────────────────────────────────────────────────────────────────────────
# Drizzle migration（GitHub Actions）用の接続先
#
# **直結（`db.<ref>.supabase.co`）を使ってはならない。** 直結は IPv6 で、IPv4 add-on を
# 購入した project でしか IPv4 にならない。一方この値の消費者である GitHub-hosted runner は
# **IPv4 のみ**（Supabase 公式が IPv4 only のサービスとして GitHub Actions を名指ししている）。
# 直結を渡すと migration 実行中に ENETUNREACH で落ちるが、開発者のマシンからは繋がるため
# ローカルでは一切再現しない。
#
# したがって **Supavisor の session mode（`*.pooler.supabase.com` の 5432 番）** を使う。
# 全プランで IPv4 で、transaction mode（6543）と違って prepared statement をサポートするため
# drizzle-kit / postgres-js がそのまま動く。
#
# pooler のホストは region ごとに `aws-0-` / `aws-1-` などが変わり **ref から導出できない**
# （CLI の `branches get` にも含まれない: supabase/cli#4012）。Management API を叩くこの
# data source が唯一の取得手段。
#
# 参考: https://supabase.com/docs/guides/database/connecting-to-postgres
# ─────────────────────────────────────────────────────────────────────────────

data "supabase_pooler" "this" {
  for_each = local.env_refs

  project_ref = each.value
}

locals {
  # 環境名 → DB パスワード（production は project、branch は provider が返す branch のもの）。
  db_passwords = merge(
    { production = var.database_password },
    { for k, b in supabase_branch.this : k => b.database.password },
  )

  # data source が返すのは「pool mode → 接続文字列」の map（通常 `transaction` の 1 件）。
  # 接続文字列にはパスワードのプレースホルダが入っているので、host / user / db だけを取り出し、
  # **session mode の 5432 番**で組み直す。
  pooler_conn = { for k, p in data.supabase_pooler.this : k => try(values(p.url)[0], "") }

  pooler_parts = {
    for k, s in local.pooler_conn : k => try(
      # port とクエリ文字列は無視する（port はこちらで 5432 に固定するため）。
      regex("^postgres(?:ql)?://(?P<user>[^:@/]+):[^@]*@(?P<host>[^:/@?]+)(?::[0-9]+)?/(?P<db>[^?/]+)", s),
      null
    )
  }

  # host が pooler のものだと確認できた環境だけを出す。取れなかった環境は **黙って直結に
  # フォールバックさせない**（CI で分かりにくく壊れるより、値が無いほうが原因が明確）。
  pooler_parts_resolved = {
    for k, p in local.pooler_parts : k => p
    if p != null && endswith(try(p.host, ""), ".pooler.supabase.com")
  }

  postgres_urls = {
    for k, p in local.pooler_parts_resolved :
    k => "postgresql://${p.user}:${urlencode(local.db_passwords[k])}@${p.host}:5432/${p.db}"
  }
}

check "migration_endpoint_resolved" {
  assert {
    condition     = length(local.pooler_parts_resolved) == length(local.env_refs)
    error_message = <<-EOT
      一部の環境で Supavisor(session pooler) の接続先を解決できませんでした
      （解決済み: ${join(", ", keys(local.pooler_parts_resolved))} / 全体: ${join(", ", keys(local.env_refs))}）。
      その環境の POSTGRES_URL は Doppler に書き込まれないため、DB Migrate ワークフローが
      「secret が空」で停止します。branch の起動直後は pooler 設定が返らないことがあるので、
      数分おいて再度 apply してください。復旧しない場合は Dashboard の Connect →
      Session pooler の接続文字列を Doppler の該当 config に手で入れてください。
    EOT
  }
}
