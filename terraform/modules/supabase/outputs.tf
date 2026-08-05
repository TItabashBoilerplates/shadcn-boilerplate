output "project_ref" {
  description = "production（project 本体）の ref。"
  value       = supabase_project.this.id
}

output "env_refs" {
  description = "環境名 → project ref（production は本体、それ以外は persistent branch の ref）。"
  value       = local.env_refs
}

output "api_urls" {
  description = "環境名 → API URL（https://<ref>.supabase.co）。"
  value       = local.api_urls
}

output "publishable_keys" {
  description = "環境名 → publishable key。"
  value       = { for k, a in data.supabase_apikeys.this : k => a.publishable_key }
  sensitive   = true
}

output "postgres_urls" {
  description = <<-EOT
    環境名 → 直結（non-pooling）の接続文字列。Drizzle migration（GitHub Actions）が使う。
    production は db.<ref>.supabase.co を組み立て、branch は provider が返す接続情報を使う。
  EOT
  value = merge(
    {
      production = "postgresql://postgres:${var.database_password}@db.${supabase_project.this.id}.supabase.co:5432/postgres"
    },
    {
      for k, b in supabase_branch.this :
      k => "postgresql://${b.database.user}:${b.database.password}@${b.database.host}:${b.database.port}/postgres"
    },
  )
  sensitive = true
}
