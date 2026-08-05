output "web_project_id" {
  description = "web project の ID。"
  value       = vercel_project.web.id
}

output "backend_project_id" {
  description = "backend project の ID。"
  value       = vercel_project.backend.id
}

output "unwired_backend_environments" {
  description = <<-EOT
    backend URL が未指定で NEXT_PUBLIC_BACKEND_PY_URL を配線できなかった環境。
    空でなければ backend_urls に明示指定すること。
  EOT
  value       = [for k in local.env_names : k if !contains(local.wired_backend_envs, k)]
}
