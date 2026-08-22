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
    環境名 → Drizzle migration（GitHub Actions）用の接続文字列。
    **Supavisor の session mode（*.pooler.supabase.com:5432 / IPv4）**。
    GitHub-hosted runner は IPv4 のみなので直結（IPv6）は使えず、transaction mode（6543）は
    prepared statement 非対応で migration に使えない。詳細は main.tf のコメントを参照。
    解決できなかった環境はキーごと落ちる（誤った接続先を書き込まないため）。
  EOT
  value       = local.postgres_urls
  sensitive   = true
}

output "postgres_url_envs" {
  description = <<-EOT
    session pooler の接続先を解決できた環境名のリスト。
    postgres_urls は sensitive なので for_each に使えない（Terraform の制約）。
    「どの環境に配るか」の判断はこちらの非機密リストで行う。
  EOT
  value       = sort(keys(local.pooler_parts_resolved))
}
