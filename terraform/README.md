# terraform/ — Vercel + Supabase の IaC

boilerplate から量産する各アプリの外部 PaaS（Supabase / Vercel / GitHub / Doppler）を
**宣言的に**プロビジョニングする。カバレッジ調査の根拠は
[`docs/_research/2026-08-05-terraform-iac-coverage.md`](../docs/_research/2026-08-05-terraform-iac-coverage.md)。

新規アプリの立ち上げは **tfvars 1 枚 + `tf-apply`** で完結する。

---

## 実行バイナリ: HashiCorp 公式の Terraform

devenv には **releases.hashicorp.com の公式配布 zip をそのまま取り込む derivation** を入れている
（`devenv.nix` の `terraformCli`）。`pkgs.terraform` を使わないのは、Terraform 1.6 以降が BUSL で
nixpkgs がバイナリを再配布できず、**必ずソースからの Go ビルド**になるため（devenv shell の初回が数分〜）。

OpenTofu ではなく Terraform を選んでいる理由:

| | Terraform | OpenTofu |
|---|---|---|
| HCP Terraform の **managed run** | 実行できる | **実行できない**（HCP は terraform バイナリのみ） |
| HCP Terraform を state 置き場として使う | 可 | 可 |
| Sentinel / private module registry | 可 | 不可 |

state backend に HCP Terraform を推奨している以上、CLI も Terraform に揃えるのが整合的。

OpenTofu に切り替える場合は、`devenv.nix` の `terraformCli` を `pkgs.opentofu` に差し替え、
`rm terraform/.terraform.lock.hcl` してから `export TF_BIN=tofu`
（registry が `registry.terraform.io` → `registry.opentofu.org` に変わるため lock の作り直しが要る）。

バージョンを上げるときは `devenv.nix` の `terraformVersion` と `terraformDist` のハッシュを差し替える
（手順はコメントに記載）。

## コマンド（devenv）

すべて devenv shell 上の script。`.claude/rules/commands.md` のとおり、
バイナリを直接叩かずこれらを使う。

| コマンド | 内容 |
|---|---|
| `tf-init <app>` | provider 同期 + workspace 選択 |
| `tf-plan <app>` | 差分表示 |
| `tf-apply <app>` | 適用（`tf-apply <app> -auto-approve` も可） |
| `tf-output <app>` | 生成値の表示 |
| `tf-fmt` | `terraform/` 配下の format（auto-fix） |
| `tf-validate` | 構文・型・参照の静的検証（cached） |

`<app>` は `terraform/apps/<app>.tfvars` に対応する名前。**workspace も同名**になり、
アプリごとに state が分離される。

`tf-init` / `tf-plan` / `tf-apply` / `tf-output` は `doppler run` に包まれており、
bootstrap config のトークンが `scripts/infra/tf.sh` 経由で注入される（値は表示されない）。

### CI ゲートへの組み込み

`ci-check`（= `devenv tasks run ci:check`）に以下が入っている。credential 不要なので CI で安全に回る。

- `format-check:terraform` … `terraform fmt -check -recursive`
- `type-check:terraform` … `terraform init -backend=false` + `terraform validate`

---

## トークン（Doppler bootstrap config に入れる）

`.tf` にも tfvars にもトークンを書かない。`scripts/infra/tf.sh` が読み替える。

| Doppler のキー名 | 読み替え先（provider が読む env） | 用途 |
|---|---|---|
| `SB_ACCESS_TOKEN` | `SUPABASE_ACCESS_TOKEN` | Supabase Management API |
| `SB_DB_PASSWORD` | `TF_VAR_supabase_db_password` | project の DB パスワード |
| `VC_TOKEN` | `VERCEL_API_TOKEN` | Vercel |
| `GH_TOKEN` | `GITHUB_TOKEN` | GitHub |
| `DOPPLER_MANAGEMENT_TOKEN` | `DOPPLER_TOKEN` | Doppler 自身 |

> Doppler 側で `GITHUB_` / `SUPABASE_` / `VERCEL_` prefix を落としているのは、
> 予約名前空間のキーを登録すると sync が予約値違反で config ごと壊れるため
> （`.claude/rules/env-naming.md`）。読み替えは `tf.sh` のプロセス内 export なので同ルール §5 の対象外。

---

## state backend

**既定はローカル state**（`terraform/.tfstate/`、gitignore 済み）。初回の 1 人検証向け。

> ⚠️ **state には secret が平文で入る**（`supabase_project.database_password`、
> persistent branch の DB password / jwt_secret、`doppler_secret` の値）。
> チームで運用するなら必ず暗号化された remote backend に切り替えること。

AWS を使わない構成なので **HCP Terraform の無料枠**（5 users まで、remote state + locking + run）を推奨。
`versions.tf` の `backend "local"` を削除し、コメントアウトしてある `cloud` ブロックを有効化する。

---

## 責務分担: config.toml と Terraform

**Supabase のサービス設定は `supabase/config.toml` が single source of truth**（`.claude/rules/supabase-config.md`）。
これは Terraform を入れても変わらない。Terraform が担うのは **config.toml では作れないもの**だけ。

| 対象 | source of truth | 反映経路 |
|---|---|---|
| Auth / API / Storage 設定、**メールテンプレート** | **`supabase/config.toml`** | `supabase config push --project-ref <ref>`（`scripts/supabase/deploy-config.sh`） |
| Edge Functions | **`supabase/config.toml` + `supabase/functions/`** | `devenv tasks run deploy:functions` |
| Storage buckets | **`supabase/config.toml`** | `supabase seed buckets --linked` |
| DB スキーマ / RLS / migration | **Drizzle** | `migrate.yml` |
| **Supabase project / persistent branch** | **Terraform** | `tf-apply` |
| **Vercel project / 環境変数** | **Terraform** | `tf-apply` |
| **GitHub environment / 承認ゲート / repo 生成** | **Terraform** | `tf-apply` |
| **Doppler project / 生成値 / GitHub Actions sync** | **Terraform** | `tf-apply` |

> Terraform 側にも `supabase_settings` / `supabase_edge_function` という resource は存在するが、
> **意図的に使っていない**。使うと config.toml と二重書き込みになって drift するため
> （`.claude/rules/clean-code.md` の重複コード禁止）。

### Terraform の output は config.toml 反映の入力になる

`supabase config push` / `functions deploy` は対象 project の ref を必要とする。
persistent branch の ref は Terraform が作るまで存在しないので、`tf-output` から受け取る。

```bash
tf-output myapp                      # supabase_env_refs = { production = "...", staging = "...", dev = "..." }
supabase config push --project-ref "<staging の ref>"
```

### 管理しないもの（Terraform 側）

| 対象 | 理由 |
|---|---|
| **外部 API キー**（OpenAI / Stripe 等） | state に平文で載るため → doppler MCP で投入（`.claude/rules/mcp-doppler.md`） |
| Doppler → Vercel / Supabase の native sync | provider に resource が無い。**そのぶん Terraform が Vercel へ直接 env を書く**ので不要 |

## Supabase の GitHub 連携は使わない前提

Branching に GitHub 連携は不要（2026-05-04 に「Git なしの Branching」が全 project の既定）。
連携が担っていた仕事はすべて代替済み:

| GitHub 連携がやること | この構成での代替 |
|---|---|
| `config.toml` 同期（auth / api / storage・メールテンプレート） | **`supabase config push --project-ref <ref>`**（CLI。ref は `tf-output` から） |
| Edge Functions のデプロイ | `devenv tasks run deploy:functions` |
| Storage buckets のデプロイ | `supabase seed buckets --linked`（元々連携外） |
| migration の自動実行 | 元々使っていない（Drizzle + `migrate.yml`） |

つまり **config.toml は SSOT のまま**で、GitHub 連携という「配送経路」だけを CLI に置き換える。

> ℹ️ これにより `[remotes.*]` の**無言スキップ**（`.claude/rules/supabase-config.md` §1.5）も避けやすくなる。
> あれは GitHub 連携の config 同期ステップで起きる挙動で、`--project-ref` を明示する push では
> 対象が曖昧にならない。

---

## 残る手動作業（org につき一度きり）

| # | 項目 | 頻度 |
|---|---|---|
| 1 | アカウント / org / 課金プラン | org 単位で一度きり |
| 2 | **Vercel GitHub App の install** | GitHub org 単位で一度きり（provider docs 明記の前提） |
| 3 | **Doppler ⇄ GitHub の integration 作成** | Doppler workplace 単位で一度きり（provider に resource が無い） |

3 の作成後、その integration ID を `doppler_github_integration_id` に渡すと
`migrate.yml` 用の `POSTGRES_URL` が GitHub Environment secrets に自動で届く。

**アプリを増やすときの手動作業はゼロ**（1〜3 は使い回される）。

---

## 新規アプリの立ち上げ手順

```bash
# 1) 入力を用意（非機密のみ。トークンは書かない）
cp terraform/apps/example.example.tfvars terraform/apps/myapp.tfvars
$EDITOR terraform/apps/myapp.tfvars

# 2) 差分を確認
tf-plan myapp

# 3) 適用
tf-apply myapp

# 4) 埋め残しの確認（backend_urls 未指定など）
tf-output myapp
```

`manual_followups` output に、Terraform では埋められなかった項目が列挙される。

---

## 既存アプリの取り込み（import）

`scripts/infra/*.sh` で作成済みのリソースは作り直さずに import できる。

```bash
tf-init myapp
terraform import -var-file=apps/myapp.tfvars 'module.supabase.supabase_project.this' <project-ref>
terraform import -var-file=apps/myapp.tfvars 'module.vercel.vercel_project.web'      <project-id>
```

> ⚠️ `supabase_branch` の import は **persistent かどうかを判定できない**（provider の既知の制約）。
> 取り込み後に `persistent = true` が設定されていることを `tf-plan` で必ず確認すること。

---

## 未検証の項目（実機で確認すること）

| 項目 | 内容 |
|---|---|
| `supabase_branch` × GitHub 連携なし | provider は `git_branch` を必須にし、`branch_name` と `git_branch` の両方に同じ値を送る。連携を張っていない project での挙動（無害なラベル扱いか、エラーか）は未検証 |
| branch ref の取り扱い | `supabase_env_refs` output は branch の `database.id` を branch project ref として扱っている（provider schema の description に基づく）。`supabase config push --project-ref` に渡す前に実値を確認する |
| `supabase_branch` のインスタンスサイズ | Management API は `desired_instance_size` を受け付けるが **provider が公開していない** → branch は既定サイズになる |
