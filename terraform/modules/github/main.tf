# ─────────────────────────────────────────────────────────────────────────────
# リポジトリ本体
#
# create_repository = true のときだけ、boilerplate の template repository から
# 新規 repo を生成する（= 新規アプリの立ち上げ）。既存 repo に適用するときは false。
# ─────────────────────────────────────────────────────────────────────────────

resource "github_repository" "this" {
  count = var.create_repository ? 1 : 0

  name       = var.repository
  visibility = var.visibility

  dynamic "template" {
    for_each = var.template != null ? [var.template] : []

    content {
      owner                = template.value.owner
      repository           = template.value.repository
      include_all_branches = template.value.include_all_branches
    }
  }

  lifecycle {
    precondition {
      condition     = var.template != null
      error_message = "create_repository = true のときは github_template を指定してください。"
    }
  }
}

# 生成した場合も既存の場合も、以降は同じ経路で参照する。
data "github_repository" "this" {
  name = var.repository

  depends_on = [github_repository.this]
}

# ─────────────────────────────────────────────────────────────────────────────
# Deployment environments（承認ゲート）
#
# reviewers.users は **数値 ID の set**（provider schema で確認済み）。
# github_user データソースの id は string なので tonumber で変換する。
# ─────────────────────────────────────────────────────────────────────────────

data "github_user" "reviewers" {
  for_each = toset(var.production_reviewers)

  username = each.value
}

resource "github_repository_environment" "this" {
  for_each = var.environments

  repository  = data.github_repository.this.name
  environment = each.value.github_environment

  # production だけ手動承認ゲートを付ける（dev / staging は自動適用）。
  dynamic "reviewers" {
    for_each = each.key == "production" && length(var.production_reviewers) > 0 ? [1] : []

    content {
      users = [for u in data.github_user.reviewers : tonumber(u.id)]
    }
  }

  prevent_self_review = each.key == "production" && length(var.production_reviewers) > 0

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

# 各 environment は対応する branch からしか deploy できない
# （production は main のみ = migrate.yml の本番適用経路を固定する）。
resource "github_repository_environment_deployment_policy" "this" {
  for_each = var.environments

  repository     = data.github_repository.this.name
  environment    = github_repository_environment.this[each.key].environment
  branch_pattern = each.value.git_branch
}
