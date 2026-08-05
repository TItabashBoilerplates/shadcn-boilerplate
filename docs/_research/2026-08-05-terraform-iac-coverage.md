# Terraform による IaC 化のカバレッジ調査（Vercel + Supabase + GitHub + Doppler）

- 調査日: 2026-08-05
- 対象: 本 boilerplate（template repository）から量産する各アプリのプロビジョニング
- 現状の実装: `scripts/infra/*.sh`（bash + REST API、命令的・冪等）+ `docs/deployment/README.md` の手動 Phase 0/2
- 結論: **プロビジョニングの約 8 割は Terraform 化できる。残る手動は「一度きりの OAuth/App install」系 3 つに収束できる**

---

## 0. TL;DR

| 区分 | 内容 | 件数 |
|---|---|---|
| ✅ **Terraform 化できる** | Supabase project/branch/設定/Edge Functions、Vercel project/env/domain/microfrontends、GitHub environments/承認ゲート/**template からの repo 生成**、Doppler project/config/secret/GitHub sync | 大半 |
| 🟡 **設計を変えれば手動を消せる** | Vercel⇄Supabase Marketplace 連携、Doppler→Vercel/Supabase native sync、**Supabase GitHub Integration**（§8.1） | 3 |
| ❌ **構造的に不可（dashboard 専用）** | 課金/org/権限機能の有効化、Vercel GitHub App install（**GitHub org につき一度きり**） | 2 |
| ❌ **意図的に対象外** | DB スキーマ / RLS / migration（Drizzle が source of truth）、Storage buckets（API が GET のみ） | 2 |

**最大の発見**: `supabase_settings` は Management API の `UpdateAuthConfigBody`（**234 フィールド**）を JSON で丸ごと管理でき、
**メールテンプレート本文（`mailer_templates_*_content`）まで含む**。つまり本リポジトリで繰り返し事故になっている
**`[remotes.*]` の無言スキップ問題**（`.claude/rules/supabase-config.md` §1.5）を、Terraform の `plan` 可視性で構造的に解消できる。

---

## 1. Provider 一覧（すべて実在・現行）

| Provider | 提供元 | 位置づけ | resource 数 |
|---|---|---|---|
| [`supabase/supabase`](https://registry.terraform.io/providers/supabase/supabase/latest/docs) | Supabase 公式 | v1.10.1（2026-07-29） | 7 |
| [`vercel/vercel`](https://github.com/vercel/terraform-provider-vercel) | Vercel 公式 | 安定 | 49 |
| [`integrations/github`](https://registry.terraform.io/providers/integrations/github/latest/docs) | GitHub 公式パートナー | v6 系 | 多数 |
| [`DopplerHQ/doppler`](https://registry.terraform.io/providers/DopplerHQ/doppler/latest/docs) | Doppler 公式 | 安定 | 63 |
| [`elevenode/expo`](https://github.com/elevenode/terraform-provider-expo) | **コミュニティ（非公式）** | EAS app / env / iOS credentials | 参考 |

---

## 2. Supabase — カバレッジ

### 2.1 使える resource / data source

| 種別 | 名前 | 用途 |
|---|---|---|
| resource | `supabase_project` | project 作成（org / region / db パスワード） |
| resource | `supabase_branch` | **persistent branch**（`git_branch` + `parent_project_ref`） |
| resource | `supabase_settings` | `api` / `auth` / `database` / `network` / `pooler` / `storage` / `ssl_enforcement` を **serialised JSON** で管理 |
| resource | `supabase_edge_function` | Edge Function デプロイ（`slug` / `entrypoint` / `import_map` / `static_files`） |
| resource | `supabase_edge_function_secrets` | Edge Function の secrets |
| resource | `supabase_third_party_auth` | Firebase / Auth0 / Clerk 等の third-party auth |
| resource | `supabase_apikey` | API キー管理 |
| data | `supabase_apikeys` / `supabase_branch` / `supabase_pooler` / `supabase_network_bans` | 生成値の取得（= `wire.sh` の置き換え） |

### 2.2 branch は Terraform 管理できる（Branching に GitHub 連携は不要）

**ブランチは `supabase_branch` で宣言的に管理できる。** しかも **Branching の利用に GitHub 連携は要らない**。

> ⚠️ **`docs/deployment/README.md` の記述は古い。** 同 runbook には「project の GitHub Integration
> （Branching 有効化）が未有効だと branch 作成 API は失敗する」とあるが、これは Branching 1.0 時代の前提。
> Supabase は [Branching 2.0](https://supabase.com/blog/branching-2-0)（2025-07 発表）で Git 要件を外し、
> **[2026-05-04 に「Git なしの Branching」が全 project の既定](https://supabase.com/blog/branching-without-git-is-now-the-default)** になった。
> Management API の `CreateBranchBody` も **必須は `branch_name` のみ**（`git_branch` は任意）で、この変更と整合する。
> → **runbook の Phase 0 / トラブルシュート表の該当記述は要修正。**

つまり staging / develop の persistent branch は、GitHub 連携なしで `terraform apply` から作成・更新・破棄できる。

```hcl
resource "supabase_branch" "staging" {
  parent_project_ref = supabase_project.app.id
  git_branch         = "staging"
  persistent         = true
  region             = var.supabase_region
}
```

| 属性 | 種別 | 備考 |
|---|---|---|
| `parent_project_ref` / `git_branch` | 必須 | 現行 `scripts/infra/supabase.sh` が Management API に直接投げている `git_branch` と同じ |
| `persistent` | 任意 | long-lived branch。**常時 compute 課金**（Spend Cap 対象外）なのは従来どおり |
| `region` | 任意 | |
| `id` / `database`（`host` / `port` / `user` / `password` / `jwt_secret` / `status` / `version` / `project_ref`） | read-only | **`wire.sh` の `supabase branches get -o env` パースを丸ごと置き換えられる** |

→ 現行 `supabase.sh`（Management API 直叩き）+ `wire.sh`（CLI 出力を `sed` でパース）は
**両方とも `supabase_branch` 1 つに畳める**。接続情報が read-only 属性として型付きで取れるため、
`POSTGRES_URL` の組み立てが文字列パースではなく参照になる。

**provider が API より狭い点（実測差分）**:

`POST /v1/projects/{ref}/branches` は `desired_instance_size` / `with_data` / `secrets` /
`postgres_engine` / `release_channel` / `is_default` も受け付けるが、**provider はこれらを公開していない**
（`git_branch` / `persistent` / `region` のみ）。現行 `supabase.sh` は `desired_instance_size` を渡しているため、
**Terraform 化するとインスタンスサイズ指定が効かなくなる**（既定サイズになる）。サイズ指定が必要なら
その部分だけ API / CLI を残すか、provider に issue を上げる必要がある。

**import 時の注意**: provider docs いわく、import では**既存ブランチが persistent かどうかを判定できない**ため、
`persistent = true` を手で書き足さないと drift する。既存の staging / develop を取り込む際は必須。

**要実機確認（provider ソースを読んだ上での懸念）**: `internal/provider/branch_resource.go` は
`git_branch` を **必須**にしており、その値を `BranchName` と `GitBranch` の**両方**に入れて API を叩く。
API 自体は `git_branch` が任意なので問題ないはずだが、**GitHub 連携を張っていない project に対して
`git_branch` を送ったときの挙動（無害なラベル扱いか、エラーか）は未検証**。GitHub 連携なし構成
（§8.1）を採るなら、ここは実際に 1 本 apply して確かめること。

### 2.3 `supabase_settings.auth` で何が管理できるか（実測）

Management API の OpenAPI（`https://api.supabase.com/api/v1-json`）を取得して `PATCH /v1/projects/{ref}/config/auth` の
リクエストスキーマ `UpdateAuthConfigBody` を検査した結果、**234 フィールド**を確認。主なもの:

| カテゴリ | フィールド例 |
|---|---|
| URL | `site_url` / `uri_allow_list` |
| OAuth provider | `external_{apple,azure,bitbucket,discord,github,google,...}_{enabled,client_id,secret}` |
| MFA | `mfa_totp_enroll_enabled` / `mfa_phone_*` / `mfa_max_enrolled_factors` |
| Auth Hooks | `hook_{before_user_created,after_user_created,custom_access_token,send_email,send_sms,...}_{enabled,uri,secrets}` |
| セキュリティ | `security_captcha_{enabled,provider,secret}` / `security_refresh_token_reuse_interval` |
| **メール** | `mailer_subjects_{confirmation,recovery,magic_link,invite,email_change,reauthentication}`<br>**`mailer_templates_{...}_content`（本文 HTML そのもの）** |
| 通知メール | `mailer_notifications_{password_changed,email_changed,mfa_factor_enrolled,...}_enabled` |

→ **`supabase/templates/email/*.html` を `file()` で読んで `mailer_templates_*_content` に流し込めば、
`[auth.email.template.*]` + GitHub 連携 config 同期と等価のことが Terraform で（しかも `plan` に差分が出る形で）できる。**

### 2.4 できないこと

| 項目 | 理由（実測） |
|---|---|
| **GitHub Integration の接続そのもの** | Management API の 115 エンドポイントを全列挙したが **`/integrations/github` 系が存在しない**。CLI にも `integrations` コマンドは無い（v2.90.0 で確認）→ dashboard の OAuth 専用。**ただし §8.1 のとおり、この連携自体を不要にできる** |
| **Storage buckets の作成** | `/v1/projects/{ref}/storage/buckets` は **GET のみ**（POST/PATCH なし）。provider にも resource 無し → `supabase seed buckets --linked`（現状の `scripts/supabase/deploy-buckets.sh`）を維持 |
| **DB スキーマ / RLS / migration** | *意図的に対象外*。`.claude/rules/database.md` / `drizzle/` が source of truth。`migrate.yml` の承認ゲート運用を維持 |
| custom domain / vanity subdomain | API（`/custom-hostname`, `/vanity-subdomain`）はあるが provider に resource が無い → CLI/API で対応 |
| org 作成・課金プラン | dashboard |

> 補足: `storage` 設定（file size limit / image transformation）は `supabase_settings.storage` で管理可。
> **管理できないのは「bucket そのもの」だけ**。

---

## 3. Vercel — カバレッジ

`vercel/vercel` の 49 resource のうち、本リポジトリに関係するもの:

| 用途 | resource |
|---|---|
| project 作成 + repo 接続 + `root_directory` + `framework` | `vercel_project`（`git_repository { type, repo, production_branch, deploy_hooks }`） |
| 環境変数（環境別 / branch 別） | `vercel_project_environment_variable(s)` / `vercel_shared_environment_variable` |
| **custom environment**（dev / staging を Preview 上で分離） | `vercel_custom_environment` |
| ドメイン / DNS / alias / 証明書 | `vercel_project_domain` / `vercel_dns_record` / `vercel_alias` / `vercel_custom_certificate` |
| **microfrontends** | `vercel_microfrontend_group` / `vercel_microfrontend_group_membership` |
| 保護・WAF | `vercel_deployment_protection_exception` / `vercel_firewall_config` / `vercel_attack_challenge_mode` / `vercel_project_protection_bypass` |
| 運用 | `vercel_project_crons` / `vercel_project_rolling_release` / `vercel_project_deployment_retention` / `vercel_log_drain` / `vercel_webhook` |
| チーム | `vercel_team_member` / `vercel_access_group*` / `vercel_project_members` |

### できないこと

| 項目 | 備考 |
|---|---|
| **Vercel GitHub App の install** | dashboard 専用。provider docs も *"requires the corresponding Vercel for GitHub plugin to be installed"* と明記。**GitHub org につき一度きり** |
| **Marketplace integration（Supabase の Connect Account）** | TF resource 無し。CLI は `vc i supabase` が[追加済み](https://vercel.com/changelog/install-marketplace-integrations-from-the-vercel-cli)だが REST API は非公開 → **§6 の設計変更で不要にできる** |
| Container Services（Permissions Required 機能）の有効化 | アカウント/チーム設定 |

---

## 4. GitHub — カバレッジ（template repo 運用にとって最重要）

| 用途 | resource |
|---|---|
| **本 template から新規アプリ repo を生成** | `github_repository` + `template { owner, repository, include_all_branches }` |
| deployment environment（dev/staging/production） | `github_repository_environment` |
| **production 承認ゲート**（required reviewers / branch policy） | `github_repository_environment`（`reviewers`）+ `github_repository_environment_deployment_policy` |
| environment secrets / variables | `github_actions_environment_secret` / `github_actions_environment_variable` |
| branch protection / ruleset / teams | `github_branch_protection` / `github_repository_ruleset` ほか |

→ **`scripts/infra/github.sh` は 100% Terraform に置換可能。**
さらに `template {}` により「**新規アプリ = tfvars 1 ファイル + `terraform apply`**」が成立する。

---

## 5. Doppler — カバレッジ

| 用途 | resource | 可否 |
|---|---|---|
| project / environment / config | `doppler_project` / `doppler_environment` / `doppler_config` | ✅ |
| secret 値 | `doppler_secret` | ✅（後述の注意あり） |
| service account / token / RBAC / trusted IP / webhook / change request policy | `doppler_service_account*` / `doppler_project_role` / `doppler_trusted_ips` / `doppler_webhook` / `doppler_change_request_policy` | ✅ |
| **sync → GitHub Actions** | `doppler_secrets_sync_github_actions` | ✅（`migrate.yml` の `POSTGRES_URL` 配布がそのまま自動化できる） |
| **sync → Vercel** | — | ❌ **resource 自体が存在しない** |
| **sync → Supabase** | — | ❌ **resource 自体が存在しない** |

（提供されている sync/integration は AWS / GCP / Azure / CircleCI / Fly.io / Terraform Cloud / MongoDB Atlas / SendGrid / Twilio / Cloudflare / GitHub 系のみ。実測: `docs/resources/` の 63 ファイルを全列挙して確認。）

> ⚠️ `doppler_secret` を使うと **値が Terraform state に平文で載る**。state を HCP Terraform 等の暗号化バックエンドに置き、
> かつ `.claude/rules/mcp-doppler.md` のフェーズ制（現在 `初期構築(full-access)`）と矛盾しない範囲で使うこと。
> **外部 API キー（OpenAI 等）は Terraform で書かず、従来どおり doppler MCP で投入する**のが安全。
> Terraform で書くのは「プロビジョニングの生成値」（= 現 `wire.sh` の担当分）に限定するのが妥当。

---

## 6. 「手動」を設計で消せる 2 箇所

現行 runbook の Phase 2 で最も手間な 2 つは、**アーキテクチャを pull 型に変えれば消せる**。

### 6.1 Vercel⇄Supabase Marketplace 連携 → Terraform が直接 env を書く

```hcl
data "supabase_apikeys" "prod" { project_ref = supabase_project.app.id }

resource "vercel_project_environment_variable" "web_supabase_url" {
  project_id = vercel_project.web.id
  key        = "NEXT_PUBLIC_SUPABASE_URL"
  value      = "https://${supabase_project.app.id}.supabase.co"
  target     = ["production"]
}
```

**得られるもの**:
- Marketplace の「Connect Account」手動作業がゼロになる
- runbook が警告している **「注入キー名が新体系/旧体系で揺れる」問題が構造的に消える**（キー名を自分で決めるため）

**トレードオフ**: `.claude/rules/env-naming.md` の「Supabase の env は PF が注入する」という前提から外れる。
ただし同ルールが禁止しているのは **Doppler への `SUPABASE_` prefix 登録**であって、**Vercel へ直接 set することは
同ルール §2 でも代替手段として明記されている**ため、抵触はしない。**ルール本文の追記は必要。**

### 6.2 Doppler→Vercel/Supabase native sync → Terraform が pull して配る

Doppler provider に Vercel/Supabase sync が無い以上、native sync は永久に手動。代わりに:

```hcl
data "doppler_secrets" "prd" { project = var.doppler_project, config = "prd" }

resource "vercel_project_environment_variable" "openai" {
  project_id = vercel_project.backend.id
  key        = "OPENAI_API_KEY"
  value      = data.doppler_secrets.prd.map.OPENAI_API_KEY
  sensitive  = true
  target     = ["production"]
}
```

**トレードオフ**: secret の更新が `terraform apply` 契機になる（native sync のような即時反映ではない）。
**GitHub Actions への配布は `doppler_secrets_sync_github_actions` があるので native sync のままでよい。**

---

## 7. 決めなければならない衝突: `config.toml` vs `supabase_settings`

`supabase_settings.auth/api/storage` と、現行の **config.toml → GitHub 連携 config 同期**は
**同じ対象を書く 2 人の書き手**になる。どちらかに寄せないと drift する。

| | Option A: config.toml 維持（TF は project/branch/配線のみ） | Option B: **Terraform がリモート設定を所有** |
|---|---|---|
| `.claude/rules/supabase-config.md` | 無変更 | **要改訂**（config.toml は「ローカル `supabase start` 用」に降格） |
| `[remotes.*]` 無言スキップ事故 | **残る**（本リポジトリの再発バグ） | **構造的に解消**（`plan` に差分が出る） |
| メールテンプレート | `content_path` | `file()` → `mailer_templates_*_content` |
| 移行コスト | 低 | 中（config.toml の `[auth.*]` を JSON へ移す） |
| ローカル開発 | そのまま | config.toml はローカル用として残すので影響なし |

**推奨: Option B。** 本リポジトリで実際に繰り返し起きている不具合（`[remotes.*]` が無いと設定適用が
**エラーも警告も出さずに丸ごとスキップ**される）は、宣言的 diff を持つ Terraform でしか根治できない。
ただしこれは既存ルールの変更を伴うため、**ユーザー判断が必要**。

---

## 8. 残る「本当に手動」（3 つだけ）

| # | 項目 | 頻度 | 代替手段 |
|---|---|---|---|
| 1 | アカウント / org / 課金プラン / Vercel Container Services の有効化 | 一度きり（org 単位） | なし |
| 2 | Vercel GitHub App の install | **一度きり（GitHub org 単位）** — 以降の全アプリで再利用 | なし（GitHub App の install は GitHub 側の仕様上ブラウザ認可が必須） |

→ **どちらも org 単位で一度きり。アプリを増やすたびに発生する手動作業はゼロにできる。**
（Supabase の GitHub Integration は §8.1 のとおり不要にできる。）

### 8.1 Supabase の GitHub 連携は「自動化できない」が「不要にできる」

**接続そのものの自動化は不可**: Management API に endpoint が無く、CLI にも `integrations` コマンドが無い
（v2.90.0 で確認）。dashboard の GitHub OAuth 認可はブラウザ必須。
（dashboard が使う内部 API `/platform/*` は非公開・無保証なので依存すべきでない。）

**しかしこの連携が担っている仕事は、すべて代替がある**:

| GitHub 連携がやること | 本リポジトリでの代替 |
|---|---|
| `config.toml` 同期（auth / api / storage・**メールテンプレート**） | `supabase_settings`（§7 Option B）／ CLI なら **`supabase config push`**（`supabase config --help` で存在確認済み） |
| Edge Functions のデプロイ | `supabase_edge_function` ／ 既存の `devenv tasks run deploy:functions` |
| Storage buckets のデプロイ | **既に連携外**（`scripts/supabase/deploy-buckets.sh` = `supabase seed buckets --linked`） |
| migration の自動実行 | **既に使っていない**（Drizzle が source of truth、`migrate.yml` が適用） |
| git branch → Supabase branch の自動作成・リンク | `supabase_branch` を宣言で持つ（自動作成をやめ、Terraform を唯一の作成経路にする） |

→ **GitHub 連携を張らない構成にすれば、Supabase 側の手動ステップは完全にゼロ。**
失うのは「PR を作ると preview branch が自動で生える」体験だけで、本リポジトリは
persistent branch（staging / develop）を固定運用しているため実害が小さい。

さらに副次的な利点として、**`[remotes.*]` の無言スキップ問題（§7）がそもそも発生しなくなる**
——あの挙動は GitHub 連携の config 同期ステップ固有のものなので、連携を使わなければ踏みようがない。

---

## 9. 推奨する導入形（template repo 運用に最適化）

```
terraform/
├── modules/
│   ├── supabase/      # project + branch + settings(auth/api/storage) + edge functions
│   ├── vercel/        # web / backend project + env + custom environment + domain
│   ├── github/        # repo(template{}) + environments + 承認ゲート + secrets
│   └── doppler/       # project + config + GitHub Actions sync
├── stacks/
│   └── app/           # 上記 module を組み合わせた root module
└── apps/
    ├── myapp.tfvars
    └── otherapp.tfvars
```

- **新規アプリ = tfvars 1 枚 + `terraform apply`**（`github_repository.template{}` が repo 生成まで担う）
- **state backend**: AWS を使わない前提なので **HCP Terraform（無料枠: 5 users まで、remote state + locking + run）** を推奨。
  S3 互換（Cloudflare R2 等）+ `use_lockfile` も理論上可だが、**Supabase Storage の S3 互換が
  conditional write（`If-None-Match`）を満たすかは未検証**なので現時点では推奨しない。
- **既存アプリの取り込み**: `supabase_project` / `supabase_settings` / `vercel_project` はいずれも import 対応 →
  `scripts/infra` で作成済みのリソースを `terraform import` で回収できる（作り直し不要）。
- **移行後**: `.claude/rules/clean-code.md` に従い、置換された `scripts/infra/{supabase,vercel,github,doppler,wire}.sh` は削除する
  （`scripts/supabase/deploy-buckets.sh` は bucket が TF 非対応なので**残す**）。

### 段階移行の順序（リスク小 → 大）

1. **GitHub**（`github.sh` 相当。副作用が小さく効果が明確）
2. **Vercel**（`vercel.sh` + `wire.sh` の Vercel 部分。既存 project は import）
3. **Doppler**（構造 + GitHub Actions sync のみ。secret 値は MCP のまま）
4. **Supabase project / branch**（既存は import）
5. **Supabase settings**（§7 の Option B を採用する場合のみ。最後に実施）

---

## 参考リンク

- [Supabase Terraform Provider（Registry）](https://registry.terraform.io/providers/supabase/supabase/latest/docs) / [reference](https://supabase.com/docs/guides/platform/terraform/reference) / [repo](https://github.com/supabase/terraform-provider-supabase)
- [Supabase: Introducing Branching 2.0](https://supabase.com/blog/branching-2-0) / [Branching Without Git Is Now The Default（2026-05-04）](https://supabase.com/blog/branching-without-git-is-now-the-default) / [Branching ドキュメント](https://supabase.com/docs/guides/deployment/branching) / [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase Management API リファレンス](https://supabase.com/docs/reference/api/introduction)（本調査は `https://api.supabase.com/api/v1-json` を実取得して検証）
- [Vercel Terraform Provider](https://github.com/vercel/terraform-provider-vercel)
- [Vercel: Install Marketplace Integrations from the CLI](https://vercel.com/changelog/install-marketplace-integrations-from-the-vercel-cli)
- [Vercel Marketplace: Supabase](https://vercel.com/marketplace/supabase)
- [GitHub Terraform Provider](https://registry.terraform.io/providers/integrations/github/latest/docs)
- [Doppler Terraform Provider](https://registry.terraform.io/providers/DopplerHQ/doppler/latest/docs) / [Doppler Docs: Terraform/OpenTofu](https://docs.doppler.com/docs/terraform)
- [Terraform S3 backend（`use_lockfile` によるネイティブロック）](https://developer.hashicorp.com/terraform/language/backend/s3)
- [elevenode/terraform-provider-expo（非公式・EAS 用）](https://github.com/elevenode/terraform-provider-expo)
