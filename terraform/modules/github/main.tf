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

# ─────────────────────────────────────────────────────────────────────────────
# デプロイ先の特定情報（Actions variable）
#
# `.github/workflows/deploy-supabase.yml` が `vars.SUPABASE_PROJECT_REF` を読んで
# `supabase config push --project-ref` / `functions deploy --project-ref` の対象を決める。
# これが無いと「terraform apply でインフラは出来たが、push しても Supabase に届かない」
# という状態になる（= 継続デプロイの輪から Supabase だけが外れる）。
#
# ⚠️ **secret ではなく variable**。project ref は `https://<ref>.supabase.co` の形で
#    NEXT_PUBLIC_SUPABASE_URL としてブラウザまで届く公開値なので、マスクする必要が無い。
#    むしろ variable にしてログに出るようにしたほうが、デプロイ先の取り違えに気づける。
#
# ⚠️ **この値を Doppler 経由で配ってはならない。** `SUPABASE_` prefix は Doppler に登録できず、
#    登録するとその config の sync 全体が予約値違反で落ちる（.claude/rules/env-naming.md §1）。
#    GitHub Actions 側の予約は `GITHUB_` のみ（GitHub 公式: "Must not start with the
#    `GITHUB_` prefix."）なので、Terraform から直接書き込むのが正しい経路になる。
#    判断の記録は .claude/rules/env-naming.md §3 の判断表を参照。
# ─────────────────────────────────────────────────────────────────────────────

resource "github_actions_environment_variable" "supabase_project_ref" {
  for_each = var.environments

  repository  = data.github_repository.this.name
  environment = github_repository_environment.this[each.key].environment

  variable_name = "SUPABASE_PROJECT_REF"
  # 環境名のキーが supabase_env_refs に無ければ plan 時点でエラーにする
  # （lookup() で握りつぶすと「ref が空のまま CI が走る」事故になる。
  #  .claude/rules/error-handling.md）。
  value = var.supabase_env_refs[each.key]
}
