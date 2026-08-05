output "project" {
  description = "Doppler project 名。"
  value       = var.project
}

output "configs" {
  description = "環境名 → Doppler config 名。"
  value       = { for k, v in var.environments : k => v.doppler_config }
}

output "github_sync_enabled" {
  description = "Doppler → GitHub Actions sync を作成したか（integration ID 未指定なら false）。"
  value       = var.github_integration_id != ""
}
