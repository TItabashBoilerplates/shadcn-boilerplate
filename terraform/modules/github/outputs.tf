output "repository_full_name" {
  description = "owner/repo 形式のフルネーム。"
  value       = data.github_repository.this.full_name
}

output "environments" {
  description = "作成した GitHub deployment environment 名（環境名 → environment 名）。"
  value       = { for k, v in github_repository_environment.this : k => v.environment }
}
