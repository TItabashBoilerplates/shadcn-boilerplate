# 認証トークンはすべて **環境変数**で渡す（.tf にも tfvars にも書かない）。
# `tf-*` script が Doppler の bootstrap config から読み替えて注入する:
#
#   Doppler のキー名           →  provider が読む環境変数
#   ─────────────────────────────────────────────────────
#   SB_ACCESS_TOKEN           →  SUPABASE_ACCESS_TOKEN
#   VC_TOKEN                  →  VERCEL_API_TOKEN
#   GH_TOKEN                  →  GITHUB_TOKEN
#   DOPPLER_MANAGEMENT_TOKEN  →  DOPPLER_TOKEN
#
# Doppler 側で prefix を落としているのは、`GITHUB_` / `SUPABASE_` / `VERCEL_` が各 PF の
# 予約名前空間で、登録すると sync が予約値違反で config ごと壊れるため
# （.claude/rules/env-naming.md）。読み替えは tf-* script のプロセス内 export なので同ルールの対象外。

provider "supabase" {
  # access_token = env SUPABASE_ACCESS_TOKEN
}

provider "vercel" {
  # api_token = env VERCEL_API_TOKEN
  # 個人アカウントの場合は空文字（= null を渡す）。
  team = var.vercel_team_id != "" ? var.vercel_team_id : null
}

provider "github" {
  # token = env GITHUB_TOKEN
  owner = var.github_owner
}

provider "doppler" {
  # doppler_token = env DOPPLER_TOKEN
}
