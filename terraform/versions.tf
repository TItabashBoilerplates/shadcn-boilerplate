terraform {
  required_version = ">= 1.9"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.10"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.7"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
    doppler = {
      source  = "DopplerHQ/doppler"
      version = "~> 1.21"
    }
  }

  # 既定はローカル state（terraform/.tfstate/ は .gitignore 済み）。
  #
  # ⚠️ state には secret が平文で入る（supabase_project.database_password、
  #    branch の DB password / jwt_secret、doppler_secret の値）。
  #    **1 人での初期検証以外では必ず HCP Terraform に切り替えること。**
  #    切り替え手順は README.md「state backend」を参照。
  backend "local" {
    path = ".tfstate/terraform.tfstate"
  }

  # HCP Terraform を使う場合は上の backend "local" を削除し、以下を有効化する。
  # cloud {
  #   organization = "<your-hcp-org>"
  #   workspaces {
  #     name = "<app-name>"
  #   }
  # }
}
