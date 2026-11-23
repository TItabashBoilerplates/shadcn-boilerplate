# ─────────────────────────────────────────────────────────────────────────────
# Project（1 つだけ）
#
# web（Next.js）と backend-py（FastAPI コンテナ）は **同じ project の Services** として載る。
# 何をどう建てるかはリポジトリルートの `vercel.json` の `services` が正本で、project 側は
# framework / root_directory / build コマンドをすべて空（null）にする。
#   > Services let you deploy multiple backends and frontends within a single Vercel
#   > project. ... replacing the need to split monorepos into separate Vercel projects.
#   （https://vercel.com/docs/services）
#
# ⚠️ root_directory を設定するとルートの vercel.json が読まれず、services が無視される。
# ⚠️ Services は「Permissions Required」機能。対象 team で有効化されている必要がある。
# ⚠️ git_repository の紐付けには Vercel の GitHub App が対象 repo に install 済みである必要がある
#    （provider docs 明記）。これは GitHub org につき一度きりの dashboard 作業。
# ─────────────────────────────────────────────────────────────────────────────

resource "vercel_project" "app" {
  name = var.project_name

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 環境変数
#
# Supabase の値は **Terraform が直接書く**（Marketplace「Connect Account」は Terraform に
# resource が無く、注入されるキー名も新旧体系で揺れるため）。キー名を自分で決めるので
# アプリ側の参照名と必ず一致する。
#
# for_each には **非機密の spec マップ**だけを渡し、実際の値は別マップから引く。
# （sensitive な値から作った map は for_each に使えないため。）
# ─────────────────────────────────────────────────────────────────────────────

locals {
  env_names = keys(var.environments)

  # web（NEXT_PUBLIC_*）と api（SUPABASE_*）は同じ project に同居するので、env も 1 か所に書く。
  # backend の URL は Vercel には入れない: ブラウザは同一オリジン（相対 URL）、web のサーバー側は
  # service binding（BACKEND_PY_URL）で api に届く。
  var_specs = {
    for pair in setproduct(local.env_names, [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
    ]) :
    "${pair[0]}/${pair[1]}" => { environment = pair[0], key = pair[1] }
  }

  var_values = merge(
    { for k, v in var.supabase_urls : "${k}/NEXT_PUBLIC_SUPABASE_URL" => v },
    { for k, v in var.supabase_publishable_keys : "${k}/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" => v },
    { for k, v in var.supabase_urls : "${k}/SUPABASE_URL" => v },
    { for k, v in var.supabase_publishable_keys : "${k}/SUPABASE_PUBLISHABLE_KEY" => v },
  )
}

resource "vercel_project_environment_variable" "supabase" {
  for_each = local.var_specs

  project_id = vercel_project.app.id
  key        = each.value.key
  value      = local.var_values[each.key]

  # production 環境は Production target、それ以外は該当 branch の Preview に限定する。
  target     = each.value.environment == "production" ? ["production"] : ["preview"]
  git_branch = each.value.environment == "production" ? null : var.environments[each.value.environment].git_branch

  # publishable key / URL はいずれもクライアントに露出する前提の値なので Vercel 側では非 sensitive。
  sensitive = false
}

# コンテナ service が listen するポート。
# **既定の 80 は使えない**: コンテナは非 root で動くため、1024 未満は bind できず
# `[Errno 13] permission denied` で即死する（Vercel の応答は INTERNAL_FUNCTION_INVOCATION_FAILED
# だけで理由が出ない）。公式: "The default port is 80, and it can be overridden by setting the
# PORT environment variable in the project settings"
# 値は root が Dockerfile の `ENV PORT=` から読んで渡す（数字を 2 か所に書かない）。
resource "vercel_project_environment_variable" "port" {
  project_id = vercel_project.app.id
  key        = "PORT"
  value      = tostring(var.container_port)
  target     = ["production", "preview"]
  sensitive  = false
}

# ─────────────────────────────────────────────────────────────────────────────
# Deployment Retention（コスト対策。必ず管理する）
#
# Vercel の既定は **無期限**（API 上は 36500 日）。デプロイが無限に溜まり続けると
# 保存分のコストが積み上がるため、project 作成と同時に短い保持期間へ固定する。
# 現行の production alias が指すデプロイ等は公式の例外で保護される
# （https://vercel.com/docs/deployment-retention#exceptions-to-the-retention-policy）。
# 値は '1d' / '1w' / '1m' / '2m' / '3m' / '6m' / '1y'（provider docs）。
# 同じ値は scripts/infra/vercel_lib.sh の `vercel_ensure_retention` も冪等に保証する。
# ─────────────────────────────────────────────────────────────────────────────
resource "vercel_project_deployment_retention" "app" {
  project_id            = vercel_project.app.id
  team_id               = vercel_project.app.team_id
  expiration_preview    = var.retention.preview
  expiration_production = var.retention.production
  expiration_canceled   = var.retention.canceled
  expiration_errored    = var.retention.errored
}
