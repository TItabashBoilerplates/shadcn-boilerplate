# Terraform で iOS / Android アプリのリリースは管理できるか（2026-08-06）

## 結論

**リリース（ビルド・アップロード・審査提出・段階公開）は Terraform では管理できない。**
できるのは「**リリースが依存する設定**」の一部だけで、しかも**公式プロバイダは Apple / Google のどちらにも存在せず、
すべてコミュニティ製**。本リポジトリへの導入は**現時点では見送りを推奨**する（理由は §4）。

---

## 1. なぜ「リリース」が Terraform に向かないか

Terraform は **宣言した desired state に実リソースを収束させる** ツール。
一方モバイルのリリースは、

1. バイナリ（.ipa / .aab）を**ビルド**する
2. それを**アップロード**する
3. **審査に提出**する
4. **段階的に公開**する

という **成果物を伴う一方向の手続き**であって、「あるべき状態」ではない。
アップロード済みビルドは巻き戻せないので `terraform destroy` の意味も無い。
ここは Fastlane / EAS Submit / CI の領分になる。

コミュニティプロバイダの作者自身も同じ線引きをしている:

> Terraform describes the setup, the infrastructure a release depends on.
> Actually running the release, building, testing, signing the binary, publishing the update,
> is a workflow, and that stays in EAS and CI.
> — [Your mobile release setup belongs in Terraform: Expo EAS + App Store Connect](https://dev.to/elevenode/your-mobile-release-setup-belongs-in-terraform-expo-eas-app-store-connect-283f)

---

## 2. 実在するプロバイダと、その守備範囲（実測）

registry API (`https://registry.terraform.io/v1/providers/<ns>/<name>`) で 2026-08-06 に確認した実測値。
**Apple / Google / Expo いずれも公式プロバイダを出していない。全部コミュニティ製。**

| プロバイダ | 最新 | DL 数 | 管理できるもの | リリース管理 |
|---|---|---|---|---|
| [`elevenode/appstore`](https://github.com/elevenode/terraform-provider-appstore) | 1.0.6 (2026-07-24) | 288 | `bundle_identifier` / `provisioning_profile` の 2 リソースのみ | ❌ |
| [`fintreal/appstore`](https://github.com/fintreal/terraform-provider-appstore) | 1.6.1 (2026-07-12) | 4,598 | 同上 | ❌ **deprecated**（elevenode へ移行を案内） |
| [`TrueTickets/appleappstoreconnect`](https://github.com/TrueTickets/terraform-provider-appleappstoreconnect) | 1.2.2 (**2025-07**) | 394 | Pass Type ID / Certificate（Apple Wallet 向け） | ❌ 1 年以上更新なし |
| [`Oliver-Binns/googleplay`](https://github.com/Oliver-Binns/terraform-provider-googleplay) | 0.6.3 (2026-06-04) | 3,390 | `googleplay_user` / `googleplay_app_iam` の 2 リソースのみ（ユーザーと権限） | ❌ **track / release / bundle アップロードは非対応** |
| [`elevenode/expo`](https://github.com/elevenode/terraform-provider-expo) | 1.1.7 (2026-07-24) | 1,282 | EAS の app / credentials / environment variables / update channel | ❌ build・submit は対象外 |

### できること / できないこと

| | Terraform |
|---|---|
| Bundle ID とその capability | ✅ |
| Provisioning profile / 証明書 | ✅（証明書は provider による） |
| Google Play Console の**ユーザーと権限** | ✅ |
| EAS の app / env var / update channel / credentials | ✅ |
| **ビルド** | ❌ |
| **ストアへのアップロード・審査提出** | ❌ |
| **TestFlight 配布・テスター管理** | ❌ |
| **段階的公開 / ロールアウト率** | ❌ |
| **ストアメタデータ・スクリーンショット・価格** | ❌ |
| **Play Console の track（internal / alpha / beta / production）** | ❌ |

> Google Play 側が薄いのは provider の手抜きではなく **API 側の制約**。
> 作者が「Google Play Console チームは自分たちの Web UI に必要な API しか作っていない」と書いている
> （[Creating a Google Play Terraform provider](https://www.oliverbinns.co.uk/posts/terraform-provider-googleplay-creation/)）。

---

## 3. では何を使うのか（本リポジトリの現状）

| やること | 使うもの | 本リポジトリでの状態 |
|---|---|---|
| ビルド | **EAS Build** | `build-mobile-ios` / `build-mobile-android` script（`nlx eas-cli build`） |
| ローカルビルド | EAS Build `--local` | `build-mobile-android-local`（`-P android` profile） |
| ストア提出 | **EAS Submit** | 未設定（`eas.json` 自体がまだ無い） |
| ビルドプロファイル定義 | **`eas.json`** | **未作成**。作る際は `cli.version` で CLI バージョンを pin する |
| 署名クレデンシャル | **EAS credentials**（`eas credentials`） | EAS がリモート管理 |
| OTA 更新 | **EAS Update** | 未設定 |

`eas.json` はそれ自体が **宣言的な Git 管理ファイル**で、ビルドプロファイルと submit 設定を持つ。
「モバイルの設定をコード管理したい」という要求の大半は、Terraform ではなく **`eas.json` を書くこと**で満たされる。

---

## 4. 本リポジトリへの導入判断: 見送り

| 観点 | 評価 |
|---|---|
| **カバー範囲が狭い** | Terraform 化できるのは bundle ID / provisioning profile / Play のユーザー権限だけ。リリース本体は結局 EAS + CI |
| **公式が無い** | Apple も Google も Expo も公式プロバイダを出していない。全部コミュニティ製 |
| **DL 数が桁違いに少ない** | 288〜4,598。1 つはすでに deprecated、1 つは 1 年以上更新なし。供給元リスクと突然のメンテ停止リスクが高い |
| **既存方式と二重になる** | 本リポジトリのインフラ構築は `scripts/infra/*.sh`（REST API + jq）で完結しており、**Terraform は 1 行も無い**。導入すると state backend / lock / CI 統合を新規に抱える |
| **EAS と機能が重なる** | `elevenode/expo` が管理する credentials / env var / update channel は `eas credentials` と `eas.json` でも扱える |

**費用対効果が合わない。** 現状は EAS + `eas.json` に寄せるのが正しい。

### 将来 Terraform を検討する条件

次のどれかに当てはまったら再評価する:

1. **アプリが複数になり**、bundle ID / provisioning profile を人手で作るのが破綻した
2. **Play Console のユーザー権限**を監査可能な形で管理する必要が出た（`googleplay_user` はここに効く）
3. 会社全体で **Terraform が既に標準**になり、Supabase / Vercel / Doppler / GitHub もまとめて IaC 化する
   （その場合は `scripts/infra/*.sh` ごと Terraform へ移す判断とセットで考える）

いずれの場合も **リリース手順そのものは EAS + CI に残る**。この線引きは変わらない。

---

## 5. 出典

- [Your mobile release setup belongs in Terraform: Expo EAS + App Store Connect](https://dev.to/elevenode/your-mobile-release-setup-belongs-in-terraform-expo-eas-app-store-connect-283f)
- [EAS and App Store configuration with Terraform](https://adam-kovacs.medium.com/eas-and-app-store-configuration-with-terraform-4e2cc16808a2)
- [Creating a Google Play Terraform provider](https://www.oliverbinns.co.uk/posts/terraform-provider-googleplay-creation/) / [Managing Google Play users in Terraform](https://www.oliverbinns.co.uk/posts/terraform-provider-googleplay/)
- [elevenode/terraform-provider-appstore](https://github.com/elevenode/terraform-provider-appstore) / [elevenode/terraform-provider-expo](https://github.com/elevenode/terraform-provider-expo)
- [fintreal/terraform-provider-appstore](https://github.com/fintreal/terraform-provider-appstore)（deprecated）
- [TrueTickets/terraform-provider-appleappstoreconnect](https://github.com/TrueTickets/terraform-provider-appleappstoreconnect)
- [Oliver-Binns/terraform-provider-googleplay](https://github.com/Oliver-Binns/terraform-provider-googleplay)
- バージョン / DL 数は Terraform Registry API (`/v1/providers/<ns>/<name>`) で実測（2026-08-06）
