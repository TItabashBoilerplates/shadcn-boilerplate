# terraform/ — Vercel + Supabase の IaC

boilerplate から量産する各アプリの外部 PaaS（Supabase / Vercel / GitHub / Doppler）を
**宣言的に**プロビジョニングする。カバレッジ調査の根拠は
[`docs/_research/2026-08-05-terraform-iac-coverage.md`](../docs/_research/2026-08-05-terraform-iac-coverage.md)。

新規アプリの立ち上げは **tfvars 1 枚 + `tf-apply`** で完結する。

---

## 実行バイナリ: 既定は OpenTofu

devenv には **`pkgs.opentofu`** を入れている（`tofu` コマンド）。HashiCorp 製 CLI ではない理由:

| | terraform | opentofu |
|---|---|---|
| ライセンス | BUSL（nixpkgs 上は unfree） | MPL-2.0 |
| nixpkgs でのバイナリ再配布 | **不可** → 毎回 **ソースから Go ビルド** | 可 → cache.nixos.org から降ってくる |
| devenv shell の初回コスト | 数分〜（ネットワーク前提） | 数秒 |

HCL / state / provider はそのまま互換なので、`.tf` 資産は Terraform でも動く。
**HashiCorp 製 CLI に切り替えたい場合**は次の 3 手順:

1. `devenv.nix` の `pkgs.opentofu` を `pkgs.terraform` に変更
2. `rm terraform/.terraform.lock.hcl`（registry が `registry.opentofu.org` → `registry.terraform.io` に変わるため lock の作り直しが要る）
3. `export TF_BIN=terraform`（`tf-*` script と devenv task が参照する）

---

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

- `format-check:terraform` … `tofu fmt -check -recursive`
- `type-check:terraform` … `tofu init -backend=false` + `tofu validate`

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

## 何を管理していて、何を管理していないか

### 管理する

| 対象 | リソース |
|---|---|
| Supabase project（= production） | `supabase_project` |
| Supabase persistent branch（staging / develop） | `supabase_branch` |
| Supabase の auth / api 設定（**メールテンプレート本文を含む**） | `supabase_settings` |
| Supabase Edge Functions（全環境へデプロイ） | `supabase_edge_function` |
| Vercel の web / backend project + repo 接続 + Root Directory | `vercel_project` |
| Vercel の環境変数（Supabase の値・backend endpoint） | `vercel_project_environment_variable` |
| GitHub の deployment environment + **production 承認ゲート** | `github_repository_environment` ほか |
| GitHub repo の生成（template から） | `github_repository` の `template` ブロック |
| Doppler project + 生成値（`POSTGRES_URL` / `EXPO_PUBLIC_*`） | `doppler_project` / `doppler_secret` |
| Doppler → GitHub Actions の sync | `doppler_secrets_sync_github_actions` |

### 管理しない（意図的）

| 対象 | 理由 / 代替 |
|---|---|
| **DB スキーマ / RLS / migration** | Drizzle が source of truth（`.claude/rules/database.md`）。適用は `migrate.yml` |
| **Storage buckets** | Management API が **GET のみ**で作成できない → `supabase seed buckets --linked`（`scripts/supabase/deploy-buckets.sh`） |
| **外部 API キー**（OpenAI / Stripe 等） | state に平文で載るため Terraform で書かない → doppler MCP で投入（`.claude/rules/mcp-doppler.md`） |
| Doppler → Vercel / Supabase の native sync | provider に resource が無い。**そのぶん Terraform が Vercel へ直接 env を書く**ので不要 |

---

## Supabase の GitHub 連携は使わない前提

Branching に GitHub 連携は不要（2026-05-04 に「Git なしの Branching」が全 project の既定）。
連携が担っていた仕事はすべて代替済み:

| GitHub 連携がやること | この構成での代替 |
|---|---|
| `config.toml` 同期（auth / api / storage・メールテンプレート） | `supabase_settings`（`manage_supabase_settings = true`） |
| Edge Functions のデプロイ | `supabase_edge_function`（`manage_supabase_edge_functions = true`） |
| Storage buckets のデプロイ | `supabase seed buckets --linked`（元々連携外） |
| migration の自動実行 | 元々使っていない（Drizzle + `migrate.yml`） |

> ⚠️ **二重書き込みの禁止**: GitHub 連携の config 同期を有効にしたまま
> `manage_supabase_settings = true` にすると、同じ対象を 2 人が書いて drift する。
> どちらか一方に寄せること。この構成は **Terraform 側に寄せている**。

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
tofu import -var-file=apps/myapp.tfvars 'module.supabase.supabase_project.this' <project-ref>
tofu import -var-file=apps/myapp.tfvars 'module.vercel.vercel_project.web'      <project-id>
```

> ⚠️ `supabase_branch` の import は **persistent かどうかを判定できない**（provider の既知の制約）。
> 取り込み後に `persistent = true` が設定されていることを `tf-plan` で必ず確認すること。

---

## 未検証の項目（実機で確認すること）

| 項目 | 内容 |
|---|---|
| `supabase_branch` × GitHub 連携なし | provider は `git_branch` を必須にし、`branch_name` と `git_branch` の両方に同じ値を送る。連携を張っていない project での挙動（無害なラベル扱いか、エラーか）は未検証 |
| branch への `supabase_settings` 適用 | branch の `database.id` を branch project ref として使っている（provider schema の description に基づく）。初回 `tf-plan` で参照先が正しいか確認する |
| `supabase_branch` のインスタンスサイズ | Management API は `desired_instance_size` を受け付けるが **provider が公開していない** → branch は既定サイズになる |
