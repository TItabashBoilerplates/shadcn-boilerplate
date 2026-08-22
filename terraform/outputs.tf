output "supabase_project_ref" {
  description = "Supabase production project の ref。"
  value       = module.supabase.project_ref
}

output "supabase_env_refs" {
  description = "環境名 → Supabase project ref（非 production は persistent branch の ref）。"
  value       = module.supabase.env_refs
}

output "supabase_api_urls" {
  description = "環境名 → Supabase API URL。"
  value       = module.supabase.api_urls
}

output "vercel_web_project_id" {
  description = "Vercel web project の ID。"
  value       = module.vercel.web_project_id
}

output "vercel_backend_project_id" {
  description = "Vercel backend project の ID。"
  value       = module.vercel.backend_project_id
}

output "github_environments" {
  description = "作成した GitHub deployment environment。"
  value       = module.github.environments
}

output "doppler_configs" {
  description = "環境名 → Doppler config 名。"
  value       = module.doppler.configs
}

# ─────────────────────────────────────────────────────────────────────────────
# 残作業の可視化（apply 後にここを見れば手動で埋める箇所が分かる）
# ─────────────────────────────────────────────────────────────────────────────

output "manual_followups" {
  description = "Terraform では埋められず、人が対応する必要がある項目。"
  value = compact([
    length(module.vercel.unwired_backend_environments) > 0
    ? "backend_urls 未指定の環境: ${join(", ", module.vercel.unwired_backend_environments)}（NEXT_PUBLIC_BACKEND_PY_URL / EXPO_PUBLIC_BACKEND_PY_URL が未配線）"
    : "",

    !module.doppler.github_sync_enabled
    ? "doppler_github_integration_id が未指定（Doppler → GitHub Actions の sync 未作成 = migrate.yml の POSTGRES_URL が届かない）"
    : "",

    length(var.production_reviewers) == 0
    ? "production_reviewers が空（本番 migration の承認ゲート無し）"
    : "",

    # deploy-supabase.yml は `supabase config push` / `functions deploy` のために
    # Supabase の access token を必要とする。これは **secret** なので Terraform では扱わない
    # （state に平文で載るため。.claude/rules/mcp-doppler.md に従い doppler MCP で投入する）。
    # ref（非機密）は Terraform が GitHub Environment variable に書くのと対照的。
    module.doppler.github_sync_enabled
    ? "Doppler の各 config（dev / stg / prd）に SB_ACCESS_TOKEN を投入すること（doppler MCP 経由）。無いと deploy-supabase.yml が Supabase へ届かない"
    : "",
  ])
}
