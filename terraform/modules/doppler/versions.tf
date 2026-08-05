# 子モジュールも provider の source を明示する。宣言しないと Terraform は
# リソース接頭辞から `hashicorp/doppler` を推測してしまい、init が失敗する
# （バージョン制約は root の versions.tf が持つ）。
terraform {
  required_providers {
    doppler = {
      source = "DopplerHQ/doppler"
    }
  }
}
