# 環境変数・シークレット命名ポリシー（予約 prefix の登録禁止）

**CRITICAL / NON-NEGOTIABLE**: **Doppler に登録するキー名に `GITHUB_` / `SUPABASE_` / `VERCEL_` の
prefix を使ってはならない。**

Doppler は各 PaaS へ**ネイティブ連携（sync）で fan-out** する設計（`.claude/skills/doppler/references/cicd.md`）。
これら 3 つの prefix は**各プラットフォームが自分の名前空間として予約**しているため、sync 時に
**予約値違反でエラー**になり、**その config の sync 全体が失敗**する（1 キーの命名ミスで全シークレットが
届かなくなる）。

---

## 1. 禁止 prefix（Doppler 登録）

| prefix | 予約している PF | sync/登録時に起きること | 出典 |
|---|---|---|---|
| `GITHUB_` | GitHub Actions secrets | secret 名として拒否される。公式:「**Must not start with the `GITHUB_` prefix.**」 | [GitHub: Secrets reference](https://docs.github.com/en/actions/reference/secrets-reference) |
| `SUPABASE_` | Supabase Edge Function secrets | 登録が拒否される。CLI:「**Env name cannot start with SUPABASE_**」／ Dashboard・API:「**Secret name must not start with the SUPABASE\_ prefix**」 | [Supabase: Environment Variables](https://supabase.com/docs/guides/functions/secrets) / [supabase/cli#1834](https://github.com/supabase/cli/issues/1834) / [supabase#36390](https://github.com/supabase/supabase/issues/36390) |
| `VERCEL_` | Vercel System Environment Variables | `VERCEL_*` は Vercel が**自動注入する system 名前空間**（`VERCEL_ENV` / `VERCEL_URL` / `VERCEL_PROJECT_ID` …）。ユーザー定義は衝突し、`NOW_` 系との conflict エラーにもなる | [Vercel: System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables) / [Vercel: Error List](https://vercel.com/docs/errors/error-list) |

### 併せて守る命名制約（同じ理由で sync が壊れる）

- **数字始まり禁止**・**英数字と `_` のみ**（GitHub Actions secrets の要件。スペース不可）。
- **Vercel の予約名は使わない**: `AWS_SECRET_KEY` / `AWS_EXECUTION_ENV` / `AWS_LAMBDA_*` / `NOW_REGION` /
  `TZ` / `LAMBDA_TASK_ROOT` / `LAMBDA_RUNTIME_DIR`（Doppler の Vercel 連携も同一リストを reserved として
  拒否する。[Vercel: Reserved environment variables](https://vercel.com/docs/environment-variables/reserved-environment-variables)）。

---

## 2. Supabase の環境変数は Doppler で管理しない（最重要）

**「Supabase の値が必要」は Doppler にキーを作る理由にならない。** Supabase の接続情報は、
どの実行環境でも**プラットフォーム側から自動で届く**ように配線済みである。

| 実行環境 | Supabase の値の入手経路 | エージェントがやること |
|---|---|---|
| **Vercel（web / backend）** | **Vercel Marketplace の Supabase 連携（Settings > Integrations > Supabase > *Connect Account*）が、接続済み Vercel project の Environment Variables に自動注入する** | **何もしない**（Doppler にも `.env` にも書かない） |
| **Supabase Edge Functions** | Supabase platform が **default secrets** として自動提供（`SUPABASE_URL` / `SUPABASE_DB_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` / `SUPABASE_JWKS` / 旧 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`） | **何もしない**（`Deno.env.get()` で読むだけ） |
| **ローカル開発** | `env/{backend,frontend}/.env.local`（**ファイル管理・非機密のローカル既定値**） | 既存ファイルを編集。**Doppler 対象外なので prefix 制約もかからない** |

### Vercel Marketplace 連携が注入する変数（公式・確定）

| 変数 | 用途 |
|---|---|
| `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` / `POSTGRES_USER` / `POSTGRES_HOST` / `POSTGRES_PASSWORD` / `POSTGRES_DATABASE` | DB 直接接続 |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` | サーバサイド（backend-py 等） |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ブラウザ公開（Next.js） |
| `SUPABASE_JWT_SECRET` | JWT 検証（Supabase 側ドキュメントにのみ記載） |

> 出典: [Supabase: Vercel Marketplace Integration](https://supabase.com/docs/guides/integrations/vercel-marketplace) /
> [Vercel Marketplace: Supabase](https://vercel.com/marketplace/supabase)（「Sync all your Project env vars to
> your Vercel projects automatically.」）。**外部で作った Supabase を "Connect Account" で接続した場合も
> 同じく同期される**（Marketplace で新規作成した場合に限らない）。

**本リポジトリの参照名は、この注入名と完全に一致している**（改名も別名追加も不要）:

| 参照箇所 | 参照名 | 注入 |
|---|---|---|
| `backend-py/packages/core/src/core/supabase_client.py` | `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | ✅ |
| `frontend/packages/client/supabase/client.ts` ほか web | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ |

> **これらは Vercel が持つ値であり、Doppler に同じキーを作ると (a) `SUPABASE_` prefix で sync が壊れ、
> (b) 二重管理で値が食い違う**。両方の意味で禁止。

#### 補足（誤解しやすい点）

- **`anon` / `service_role` という旧キー名で入るのは、Marketplace 以前の旧 Vercel Integration**。
  Marketplace 連携は上表のとおり**新体系（publishable / secret）**で注入する。旧名を前提にした
  ブログ記事・古い手順が多いので混同しないこと。
- **`NEXT_PUBLIC_` prefix は Supabase ダッシュボードから変更可能**（Next.js 以外のフレームワークで
  `PUBLIC_` 等にしたい場合）。本リポジトリの web は Next.js で既定のままでよいので**触らない**。
  ※ 変更できないという報告も残っている（[supabase#37762](https://github.com/supabase/supabase/issues/37762)、open）。
- **既知の未解決 issue**: 非対称 JWT へ移行済みのアカウントで
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` が注入されない
  （[supabase#38984](https://github.com/supabase/supabase/issues/38984)、open）。
  **本リポジトリはこの名前を参照していないため影響しない**。
- 上記いずれかで実際に名前がズレた場合の対処は **Vercel 側で別名の env var を追加**すること。
  **Doppler には戻さない**（`SUPABASE_` prefix は登録できないため）。

---

## 3. Doppler に置く / 置かないの判断

| 種類 | 例 | Doppler に置く？ |
|---|---|---|
| 外部サービスのシークレット | `OPENAI_API_KEY` / `STRIPE_SECRET_KEY` / `RESEND_API_KEY` | **置く**（これが Doppler の本来の役割） |
| アプリが参照する非予約な生成値 | `NEXT_PUBLIC_BACKEND_PY_URL` / `EXPO_PUBLIC_BACKEND_PY_URL` / `DATABASE_URL` | **置く**（prefix が予約に当たらない） |
| **Supabase 接続情報** | `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` | **置かない**（§2。PF が注入する） |
| **Vercel system 値** | `VERCEL_ENV` / `VERCEL_URL` / `VERCEL_PROJECT_ID` | **置かない**（Vercel が自動注入） |
| **GitHub Actions の組み込み値** | `GITHUB_TOKEN` / `GITHUB_REF` / `GITHUB_OUTPUT` | **置かない**（Actions ランタイムが提供） |
| ローカル非機密既定値 | ローカル Supabase URL / port | **置かない**（`env/<svc>/.env.local`。`env/README.md`） |
| **CI がデプロイ先を特定するための非機密識別子** | `SUPABASE_PROJECT_REF` | **置かない**（予約 prefix で登録不可。**Terraform が GitHub Environment variable へ直接書く**。§3.1） |

### 3.1 「Doppler 原則」の射程 — 非機密の識別子は Doppler を通さない

**CRITICAL**: `SUPABASE_PROJECT_REF` を「環境変数だから」という理由で Doppler へ移してはならない。
移すと §1 の予約 prefix に該当し、**その config の sync 全体が予約値違反で落ちる**。しかも
sync 障害は無言で起き、「一部の secret だけ届かない」という形でしか現れない。

本リポジトリの「シークレット・リモート値は Doppler 一本」という原則が対比しているのは
**Doppler vs `.env` ファイル**であって、Doppler vs PaaS ネイティブ設定ではない。§2 が
「Supabase の環境変数は Doppler で管理しない」と定めているのと同じ考え方が適用される。

| 値の性質 | 保管先 | 例 |
|---|---|---|
| **シークレット** | **Doppler**（`doppler` MCP で投入。`.claude/rules/mcp-doppler.md`） | `SB_ACCESS_TOKEN` / `POSTGRES_URL` / 外部 API キー |
| **非機密の識別子（CI のデプロイ先指定）** | **GitHub Actions variable**（Terraform が書く） | `SUPABASE_PROJECT_REF` |
| PF が自動注入するもの | 何もしない（§2） | `SUPABASE_URL` / `VERCEL_ENV` / `GITHUB_TOKEN` |

根拠:

- **project ref は秘密情報ではない。** `https://<ref>.supabase.co` の形で
  `NEXT_PUBLIC_SUPABASE_URL` としてブラウザまで届く公開値である。secret にすると
  ログでマスクされ、デプロイ先の取り違えに気づけなくなる副作用だけが残る。
- **GitHub Actions 側の予約は `GITHUB_` のみ**。公式:「Must not start with the `GITHUB_`
  prefix.」「Can only contain alphanumeric characters (`[a-z]`, `[A-Z]`, `[0-9]`) or
  underscores (`_`).」（[Variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)）
  → `SUPABASE_PROJECT_REF` は合法。本ルール §5 の適用範囲表も、GitHub Actions の
  secrets/variables を独立した保管先として認めたうえで `GITHUB_` だけを禁じている。
- **Doppler を経由すると integration が必須前提に格上げされる。** `doppler_github_integration_id`
  は現状 optional（既定 `""`）で、dashboard でしか作れない。ref の供給をそこに依存させると
  「terraform apply は成功したのに CI が動かない」経路が増える。

書き込みは `terraform/modules/github/main.tf` の `github_actions_environment_variable`。
読み出しは `.github/workflows/deploy-supabase.yml`。**この 2 か所以外に増やさないこと。**

---

## 4. どうしても必要なときの代替命名

予約 prefix の値を**自分で持ちたい**場合（プロビジョニング用トークン等）は、**prefix を削って別名にする**。
アプリ側の参照名も同時に合わせること（`.claude/rules/clean-code.md` により旧名エイリアスは残さない）。

| ❌ Doppler に登録禁止 | ✅ 代替キー名 |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | `SB_ACCESS_TOKEN` |
| `SUPABASE_DB_PASSWORD` | `SB_DB_PASSWORD` |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | 原則不要（§2）。frontend は `NEXT_PUBLIC_SUPABASE_*` / `EXPO_PUBLIC_SUPABASE_*`、DB 接続は `POSTGRES_URL` / `DATABASE_URL` |
| `VERCEL_TOKEN` / `VERCEL_TEAM_ID` | `VC_TOKEN` / `VC_TEAM_ID` |
| `GITHUB_TOKEN`（PAT を自前で持つ場合） | `GH_TOKEN` |

> `NEXT_PUBLIC_SUPABASE_URL` のように **`SUPABASE_` が先頭でなければ問題ない**。禁止されているのは
> **キー名の先頭一致**であって、名前に "SUPABASE" を含むこと自体ではない。

---

## 5. 本ポリシーの適用範囲（対象外を明示）

| 対象 | 本ルールの適用 |
|---|---|
| **Doppler の secrets（全 config: `dev` / `dev_personal` / `stg` / `prd` / bootstrap 用）** | **適用**（登録禁止） |
| GitHub Actions の repository/environment secrets | **適用**（GitHub が `GITHUB_` を拒否） |
| Vercel project の Environment Variables（手動 set / `vercel_env_set`） | **適用**（`VERCEL_` は system 予約） |
| Supabase Edge Functions の secrets | **適用**（`SUPABASE_` は登録不可） |
| `env/<svc>/.env.local`（ローカル非機密ファイル） | **対象外**（ファイルであり sync されない。既存の `SUPABASE_URL=` 等はそのままでよい） |
| シェルスクリプト内のローカル変数 / `scripts/infra/config.env` | **対象外**（Doppler に登録しない限り自由。ただし混乱を避けるため新規は代替命名を推奨） |
| コード内で `Deno.env.get("SUPABASE_URL")` のように**読む**こと | **対象外**（読むのは正しい。禁止しているのは**登録**） |

---

## 6. 禁止パターン

```bash
# ❌ NG: Doppler に予約 prefix のキーを作る（sync が予約値違反で落ちる）
#    （doppler MCP 経由でも Bash 経由でも等しく禁止）
SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY
VERCEL_TOKEN / VERCEL_ENV
GITHUB_TOKEN / GITHUB_REF

# ❌ NG: Marketplace が注入する値を Doppler にも入れて二重管理する
# ❌ NG: Supabase の値が要るからと Edge Functions の secrets に SUPABASE_* を set する
# ❌ NG: 数字始まり（`1PASSWORD_TOKEN`）／ハイフン・スペース入りのキー名

# ✅ OK: 非予約 prefix
OPENAI_API_KEY / NEXT_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL
POSTGRES_URL / DATABASE_URL / SB_ACCESS_TOKEN / VC_TOKEN / GH_TOKEN
```

---

## 7. 新規キー追加時のチェックリスト

Doppler に新しいキーを作る前に、**必ず**以下を順に確認する:

1. **そもそも Doppler に要るか？** Supabase の値なら §2 のとおり**不要**（PF が注入する）。
2. **先頭が `GITHUB_` / `SUPABASE_` / `VERCEL_` でないか？** → 該当したら §4 で改名。
3. **数字始まりでないか／英数字と `_` のみか？**
4. **Vercel 予約名（`AWS_*` / `NOW_REGION` / `TZ` / `LAMBDA_*`）でないか？**
5. 書き込みは **`doppler` MCP** 経由・**フェーズ制**に従う（`.claude/rules/mcp-doppler.md`）。**値はチャット/ログ/コミットに出さない**。

> **ツール側のガード**: 人手用の `doppler-set` / `doppler-import`（devenv script）は予約 prefix を
> 検知して**登録前に拒否**する。ただし `doppler` MCP や Doppler dashboard にはこのガードが無いため、
> エージェントは本ルールを自分で守ること。
>
> **CLI が予約名を要求する場合の橋渡し**: Supabase CLI は `SUPABASE_ACCESS_TOKEN` しか読まないので、
> Doppler には `SB_ACCESS_TOKEN` で保持し、`scripts/infra/lib.sh` の `supabase_cli_auth()` が
> CLI 呼び出し直前にプロセス環境へ写す（§5 のとおり export は本ルールの対象外）。

---

## 8. 強制事項

このポリシーは**交渉の余地なし**。

- Doppler（および GitHub / Vercel / Supabase の secrets）に **`GITHUB_` / `SUPABASE_` / `VERCEL_`
  prefix のキーを登録する実装・提案はレビューで却下**する。
- **Supabase の環境変数を Doppler に入れる提案も却下**する（Vercel Marketplace 連携と Edge Functions の
  default secrets が正規の供給経路）。
- 判断に迷う場合は勝手に決めず**ユーザーに確認**する。
