# 環境変数・シークレット命名ポリシー

**CRITICAL / NON-NEGOTIABLE（厳命）**: 本ルールには**必ず守る 2 つの厳命**がある。詳細は §0。

1. **Supabase 内でのやりとりは `SUPABASE_` プレフィックスを適切に活用する** —
   Supabase / Vercel Marketplace 連携が**自動供給する `SUPABASE_*` を、その名前のまま読む**。
   別名に写さない・複製しない・`SUPABASE_` 始まりのキーを新規に作らない
   （唯一の例外は、**PF が配ってくれないインフラ操作用の資格情報**
   `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` を **sync の無い Doppler config** に置く場合。§0.1）。
2. **Doppler は「各環境で共有する必要があるシークレット」を管理する場所** —
   環境（dev / stg / prd）・人・CI をまたいで共有する **API キー / トークン / 接続文字列**が対象。
   **PF が自動供給する値と、ローカル専用の非機密 config は Doppler に置かない**。

**原則**: **Doppler のキー名は「その値を使うツールが実際に読む名前」に揃える。**
省略形（`SB_*` / `VC_*`）を機械的に付けない。読み替えが要るのは「同じ資格情報を 2 つのツールが
別名で読む」ときだけで、その橋渡しはスクリプト側（`scripts/infra/tf.sh`）に閉じ込める。

**CRITICAL / NON-NEGOTIABLE**: ただし **native sync（Doppler → GitHub / Vercel / Supabase）が
付いている config では、その sync 先が予約している prefix を使ってはならない。**

Doppler の sync は **config 単位で全キーを push する**ため、**1 キーの命名ミスでその config の
sync 全体が予約値違反で失敗する**（一部の secret だけ届かない、という形でしか現れない）。
したがって禁止は **config ごと**に決まり、Doppler 全体に一律でかかるものではない。

> ⚠️ **後から sync を付けると、既存キーが原因で壊れる。** sync を追加する前に、その config の
> キー名を §1 の表で必ず点検すること。

---

## 0. 2 つの厳命（新しい環境変数・シークレットを触る前に必ずここを読む）

### 0.1 厳命 ① — Supabase 内でのやりとりは `SUPABASE_` を「読む」

Supabase が絡む実行環境では、接続情報は**プラットフォームが `SUPABASE_*` という正式名で
自動供給する**（Edge Functions は default secrets、Vercel は Marketplace 連携が注入する。§2）。
したがって**エージェントがやることは「その名前のまま読む」だけ**であり、名前を作り替えたり
値をどこかへ複製したりしてはならない。

**「読む」は正しい使い方、「作る」は禁止** — ここを混同しない。

| 行為 | 可否 |
|---|---|
| Edge Functions / サーバで `Deno.env.get("SUPABASE_URL")` のように **`SUPABASE_*` を読む** | ✅ **これが本来の使い方**（PF が供給する正式名。§2.5 の表が正本） |
| `SUPABASE_*` を**自分の別名に写して**参照する（`SB_URL` / `MY_SUPABASE_URL` / `PROJECT_URL` …） | ❌ 禁止（PF が配る名前と一致しなくなり、Vercel / Edge Functions の両方で無言に undefined になる） |
| **PF が供給する接続情報**（`SUPABASE_URL` / キー類 / `SUPABASE_DB_URL`）を **Doppler に登録**する | ❌ 禁止（§2。二重管理になり、sync を張った瞬間に config ごと落ちる） |
| **PF が供給しないインフラ操作用の資格情報**（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD`）を **sync の無い config（`all` / `bootstrap`）に置く** | ✅ 可（誰も配ってくれない値なので Doppler が正しい置き場所。フルネームで持つ。§4） |
| `SUPABASE_*` を **Supabase の secrets に登録**する（`supabase secrets set` / Dashboard / MCP） | ❌ **PF が拒否する**（"Env name cannot start with SUPABASE\_"） |
| `SUPABASE_*` を **Vercel の env に手で set** する | ❌ 禁止（Marketplace 連携が入れる。手で入れると drift する） |
| Edge Functions で**自前の**シークレットを使う（`ONE_SIGNAL_API_KEY` / `STRIPE_SECRET_KEY` …） | ✅ **`SUPABASE_` 以外**の名前で登録する（登録先は §0.3） |
| `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` のように**先頭が `SUPABASE_` でない**名前 | ✅ 制約に当たらない（効くのは**先頭一致**だけ。§4） |

> **要するに**: 「Supabase の値が必要だ」と思ったら、**新しいキーを作る場面ではない**。
> `SUPABASE_*` を読むコードを書くだけで終わる。読んでも入っていない場合は、キーを作るのではなく
> **供給経路（Marketplace 連携 / default secrets / ローカルの `env/*.env.local`）を直す**。

### 0.2 厳命 ② — Doppler は「各環境で共有するシークレット」を置く場所

**Doppler の用途は、環境（dev / stg / prd）・開発者・CI をまたいで共有する必要がある
シークレット（API キー・トークン・接続文字列）の一元管理**である。これに当てはまらないものを
Doppler に入れてはならない（入れた瞬間に、二重管理・sync 障害・不要な秘匿化のいずれかが起きる）。

| Doppler に**置く** | Doppler に**置かない** |
|---|---|
| 外部サービスの API キー・トークン（`OPENAI_API_KEY` / `STRIPE_SECRET_KEY` / `RESEND_API_KEY` / `FAL_KEY` / `EXPO_TOKEN` / `APPLE_*` …） | **PF が自動供給する値**（`SUPABASE_*` / `VERCEL_*` / `GITHUB_TOKEN`。§2） |
| インフラ操作用の資格情報（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `VERCEL_TOKEN` / `DOPPLER_TOKEN` / `GH_TOKEN`） | **非機密の識別子**（`SUPABASE_PROJECT_REF` → GitHub Actions variable。§3.1） |
| 環境ごとに値が変わり、共有が要る接続情報（`POSTGRES_URL` / `NEXT_PUBLIC_BACKEND_PY_URL` / `EXPO_PUBLIC_*`） | **ローカル専用の非機密既定値**（`env/<svc>/.env.local`） |
| | **ソースに書いてよい定数**（ページサイズ・機能フラグの既定値など） |

**秘密でないものを Doppler に入れない**のも同じくらい重要である。ログでマスクされ、
デプロイ先の取り違えのような事故に気づけなくなるだけで、得るものが無い（§3.1）。

書き込みは必ず **`doppler` MCP**・**フェーズ制**に従い、**値はチャット / ログ / コミットに出さない**
（`.claude/rules/mcp-doppler.md`）。

### 0.3 値の置き場所 決定表（新しい値が出てきたら必ずここを引く）

| その値は？ | 置き場所 | 名前 |
|---|---|---|
| Supabase の URL / API キー / DB URL | **どこにも置かない**（PF が供給。§2） | `SUPABASE_*` を**読むだけ** |
| Supabase の project ref（非機密の識別子） | **GitHub Actions variable**（Terraform が書く） | `SUPABASE_PROJECT_REF`（§3.1） |
| 外部サービスのシークレットで、**アプリ / CI が全環境で使う** | **Doppler `<app>/{dev,stg,prd}`**（GitHub へ sync） | ツールが読む正式名（`GITHUB_` 禁止） |
| 外部サービスのシークレットで、**インフラ操作に使う** | **Doppler `all/all` / `<app>/bootstrap`**（sync 無し） | フルネーム（`SUPABASE_ACCESS_TOKEN` 等 OK） |
| **Edge Functions だけ**が使う自前シークレット | **Supabase の secrets**（`config.toml` の `env()` 経由。`.claude/rules/supabase-config.md`） | **`SUPABASE_` 以外**（`ONE_SIGNAL_API_KEY` 等） |
| ローカル開発の非機密既定値 | `env/<svc>/.env.local` | 制約なし（`env/README.md`） |

---

## 1. sync 先が予約している prefix

**その config に該当の sync が付いている場合のみ**適用される。

| prefix | 予約している PF | sync 時に起きること | 出典 |
|---|---|---|---|
| `GITHUB_` | GitHub Actions secrets | secret 名として拒否される。公式:「**Must not start with the `GITHUB_` prefix.**」 | [GitHub: Secrets reference](https://docs.github.com/en/actions/reference/secrets-reference) |
| `SUPABASE_` | Supabase Edge Function secrets | 登録が拒否される。CLI:「**Env name cannot start with SUPABASE_**」／ Dashboard・API:「**Secret name must not start with the SUPABASE\_ prefix**」 | [Supabase: Environment Variables](https://supabase.com/docs/guides/functions/secrets) / [supabase/cli#1834](https://github.com/supabase/cli/issues/1834) / [supabase#36390](https://github.com/supabase/supabase/issues/36390) |
| `VERCEL_` | Vercel System Environment Variables | `VERCEL_*` は Vercel が**自動注入する system 名前空間**（`VERCEL_ENV` / `VERCEL_URL` / `VERCEL_PROJECT_ID` …）。ユーザー定義は衝突し、`NOW_` 系との conflict エラーにもなる | [Vercel: System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables) / [Vercel: Error List](https://vercel.com/docs/errors/error-list) |

### 本リポジトリの config と、そこにかかる制約

| Doppler の config | 付いている sync | 禁止 prefix |
|---|---|---|
| **`all` / `all`**（org 共通のアクセストークン置き場） | **無し** | **無し**（フルネームで持つ） |
| **`<app>` / `bootstrap`**（プロビジョニング用の値） | **無し** | **無し**（フルネームで持つ） |
| `<app>` / `dev` `stg` `prd` | **GitHub Actions**（`doppler_secrets_sync_github_actions`） | **`GITHUB_` のみ** |
| （将来 Vercel sync を付ける場合） | Vercel | ＋ `VERCEL_` と Vercel 予約名 |
| （将来 Supabase sync を付ける場合） | Supabase | ＋ `SUPABASE_` |

> **`GITHUB_` だけは実質どこでも避ける。** GitHub Actions の secrets / variables が全面的に
> 予約しており、`dev` / `stg` / `prd` は必ず GitHub へ sync するため。
> 逆に **`SUPABASE_` / `VERCEL_` は、Supabase / Vercel への sync を張っていない config では
> 使ってよい**（本リポジトリは両方とも sync を使わず、Terraform が直接 env を書く）。

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

### 2.5 Supabase 内でのやりとりで使う名前（Edge Functions の default secrets）

**Edge Functions では、以下が PF から自動で入る。`supabase secrets set` も `.env` も要らない。**
この名前をそのまま読むこと（§0.1）。

| 名前 | 中身 | 備考 |
|---|---|---|
| `SUPABASE_URL` | プロジェクトの API ゲートウェイ URL | |
| `SUPABASE_DB_URL` | Postgres 接続文字列 | Drizzle / postgres.js の接続に使う（`shared/db/url.ts`） |
| `SUPABASE_PUBLISHABLE_KEYS` | publishable キーの **JSON 辞書**（`{"default": "sb_publishable_..."}`） | **複数形・JSON**。`JSON.parse(...)['default']` で取り出す |
| `SUPABASE_SECRET_KEYS` | secret キーの **JSON 辞書**（`{"default": "sb_secret_..."}`） | **複数形・JSON**。RLS をバイパスするのでブラウザへ出さない |
| `SUPABASE_JWKS` | ユーザー JWT 検証用の JSON Web Key Set | |
| `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | **レガシー**キー（文字列） | 2026 年末まで動作。新規実装の第一候補にしない |

出典: [Supabase: Environment Variables（Default secrets）](https://supabase.com/docs/guides/functions/secrets) /
[Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

> ⚠️ **複数形（`*_KEYS`）と単数形（`*_KEY`）を混同しない。** Edge Functions に入るのは
> **複数形の JSON 辞書**で、`SUPABASE_SECRET_KEY` / `SUPABASE_PUBLISHABLE_KEY`（単数）は
> **default secrets に存在しない**。単数形で `Deno.env.get()` しても `undefined` になり、
> レガシーキーへフォールバックする実装ではそれに気づけない。
> 一方、**Vercel の env に注入されるのは単数形**（§2 の表）である。**面ごとに名前が違う**ので、
> 実装する前にその面の正式名を確認すること。

**Edge Functions で自前のシークレットを使う場合**は、`SUPABASE_` **以外**の名前にする
（`ONE_SIGNAL_API_KEY` / `STRIPE_SECRET_KEY` …）。`SUPABASE_` で始まる名前は PF が登録を拒否する。
値の配線は `config.toml` の `env()`（`.claude/rules/supabase-config.md`）。

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
| **シークレット** | **Doppler**（`doppler` MCP で投入。`.claude/rules/mcp-doppler.md`） | `SUPABASE_ACCESS_TOKEN` / `POSTGRES_URL` / 外部 API キー |
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

## 4. キー名の決め方（省略しない）

**そのキーを読むツールが実際に読む名前をそのまま使う。** 省略形を作るのは §1 の制約に当たる
ときだけで、その場合も「なぜ省略したか」を書く。旧名エイリアスは残さない
（`.claude/rules/clean-code.md`）。

### 本リポジトリの実際のキー名

| config | キー | 読む主体 | 備考 |
|---|---|---|---|
| `all/all` | `SUPABASE_ACCESS_TOKEN` | supabase provider / supabase CLI | **読み替え不要** |
| `all/all` | `VERCEL_TOKEN` | vercel CLI | Terraform provider だけ `VERCEL_API_TOKEN` を読む → `tf.sh` が橋渡し |
| `all/all` | `GH_TOKEN` | gh CLI（**これが公式名**） | `GITHUB_` は §1 により使えない。Terraform provider は `GITHUB_TOKEN` → `tf.sh` が橋渡し |
| `all/all` | `DOPPLER_TOKEN` | doppler provider | **読み替え不要** |
| `all/all` | `EXPO_TOKEN` / `FAL_KEY` / `APPLE_*` / `PLAY_SERVICE_ACCOUNT_JSON` | 各 CLI | **読み替え不要** |
| `<app>/bootstrap` | `SUPABASE_DB_PASSWORD` | supabase CLI（`link -p`） | Terraform へは `TF_VAR_supabase_db_password` → `tf.sh` が橋渡し |
| `<app>/{dev,stg,prd}` | `POSTGRES_URL` / `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` / 外部 API キー | アプリ / CI | GitHub へ sync される（`GITHUB_` 禁止） |

**橋渡しは `scripts/infra/tf.sh` の `bridge_env` に 3 本だけ**。増やす前に「本当に 2 つのツールが
別名で読むのか」を一次情報で確認する（同名で済むなら橋渡しは書かない）。

> `NEXT_PUBLIC_SUPABASE_URL` のように **prefix が先頭でなければ制約に当たらない**。効くのは
> **キー名の先頭一致**であって、名前に "SUPABASE" を含むこと自体ではない。

---

## 5. 本ポリシーの適用範囲（対象外を明示）

| 対象 | 本ルールの適用 |
|---|---|
| **Doppler の `<app>/{dev,stg,prd,dev_personal}`**（GitHub へ sync される） | **適用**（`GITHUB_` 禁止） |
| **Doppler の `all/all` / `<app>/bootstrap`**（sync 無し） | **対象外**（フルネームで持つ。§4）。ただし sync を後から付けるなら §1 で点検 |
| GitHub Actions の repository/environment secrets | **適用**（GitHub が `GITHUB_` を拒否） |
| Vercel project の Environment Variables（手動 set / `vercel_env_set`） | **適用**（`VERCEL_` は system 予約） |
| Supabase Edge Functions の secrets | **適用**（`SUPABASE_` は登録不可） |
| `env/<svc>/.env.local`（ローカル非機密ファイル） | **対象外**（ファイルであり sync されない。既存の `SUPABASE_URL=` 等はそのままでよい） |
| シェルスクリプト内のローカル変数 / `scripts/infra/config.env` | **対象外**（Doppler に登録しない限り自由。ただし混乱を避けるため新規は代替命名を推奨） |
| コード内で `Deno.env.get("SUPABASE_URL")` のように**読む**こと | **対象外**（読むのは正しい。禁止しているのは**登録**） |

---

## 6. 禁止パターン

```bash
# ❌ NG: sync が付いている config（dev/stg/prd）に GITHUB_ prefix のキーを作る
#    （doppler MCP 経由でも Bash 経由でも等しく禁止。その config の sync 全体が落ちる）
GITHUB_TOKEN / GITHUB_REF

# ❌ NG: 意味もなく省略形にする（読むツールの名前と一致しなくなり、橋渡しコードが増える）
SB_ACCESS_TOKEN / VC_TOKEN / SB_DB_PASSWORD

# ❌ NG: Marketplace が注入する値を Doppler にも入れて二重管理する
# ❌ NG: Supabase の値が要るからと Edge Functions の secrets に SUPABASE_* を set する
# ❌ NG: 数字始まり（`1PASSWORD_TOKEN`）／ハイフン・スペース入りのキー名

# ❌ NG（厳命 ① 違反）: PF が配る SUPABASE_* を自分の別名へ写して参照する
SB_URL / MY_SUPABASE_URL / PROJECT_URL / NEXT_PUBLIC_SB_URL
#   → Edge Functions は `Deno.env.get("SUPABASE_URL")`、Vercel は注入名をそのまま読む

# ❌ NG（厳命 ① 違反）: Edge Functions の自前シークレットに SUPABASE_ を付ける
SUPABASE_ONESIGNAL_KEY / SUPABASE_STRIPE_KEY   # → ONE_SIGNAL_API_KEY / STRIPE_SECRET_KEY

# ❌ NG（厳命 ① 違反）: 単数形と複数形を取り違える
Deno.env.get("SUPABASE_SECRET_KEY")       # Edge Functions の default secrets に存在しない
# ✅ Edge Functions は複数形の JSON 辞書
JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"]

# ❌ NG（厳命 ② 違反）: 秘密でない値・ローカル専用の値を Doppler に入れる
SUPABASE_PROJECT_REF        # → GitHub Actions variable（§3.1）
LOCAL_SUPABASE_PORT         # → env/<svc>/.env.local
DEFAULT_PAGE_SIZE           # → ソースコードの定数

# ✅ OK: 非予約 prefix
OPENAI_API_KEY / NEXT_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL
POSTGRES_URL / DATABASE_URL / GH_TOKEN
# ✅ OK: sync の無い config（all / bootstrap）ならフルネームで持てる
SUPABASE_ACCESS_TOKEN / SUPABASE_DB_PASSWORD / VERCEL_TOKEN / DOPPLER_TOKEN
```

---

## 7. 新規キー追加時のチェックリスト

Doppler に新しいキーを作る前に、**必ず**以下を順に確認する:

0. **§0.3 の決定表を引いたか？** そもそも Doppler が置き場所でない値（PF が供給する `SUPABASE_*` /
   非機密の識別子 / ローカル専用の既定値）を Doppler へ入れようとしていないか。
1. **そもそも Doppler に要るか？** Supabase の値なら §2 のとおり**不要**（PF が注入する）。
2. **その config に native sync が付いているか？** 付いているなら §1 の表で禁止 prefix を確認する
   （`dev`/`stg`/`prd` は GitHub sync 対象 → `GITHUB_` 禁止）。sync が無い `all` / `bootstrap` なら
   **フルネームで持つ**（§4）。
3. **数字始まりでないか／英数字と `_` のみか？**
4. **Vercel 予約名（`AWS_*` / `NOW_REGION` / `TZ` / `LAMBDA_*`）でないか？**
5. 書き込みは **`doppler` MCP** 経由・**フェーズ制**に従う（`.claude/rules/mcp-doppler.md`）。**値はチャット/ログ/コミットに出さない**。

> **ツール側のガード**: 人手用の `doppler-set` / `doppler-import`（devenv script）は予約 prefix を
> 検知して**登録前に拒否**する。ただし `doppler` MCP や Doppler dashboard にはこのガードが無いため、
> エージェントは本ルールを自分で守ること。
>
> **橋渡しが要るケース**: 同じ資格情報を 2 つのツールが別名で読むときだけ
> （`VERCEL_TOKEN`→`VERCEL_API_TOKEN`、`GH_TOKEN`→`GITHUB_TOKEN`、
> `SUPABASE_DB_PASSWORD`→`TF_VAR_supabase_db_password`）。`scripts/infra/tf.sh` の
> `bridge_env` がプロセス内で写す（§5 のとおり export は本ルールの対象外）。
> **同名で届く値に橋渡しを書かない**（自己代入の no-op が残ると、キーが存在しなくても
> 気づけなくなる）。

---

## 8. 強制事項

このポリシーは**交渉の余地なし**。

- **厳命 ①（§0.1）違反は却下**する: PF が供給する `SUPABASE_*` を別名へ写す、`SUPABASE_` で始まる
  キーを新規に作る（Doppler / Supabase secrets / Vercel env のいずれでも）、Edge Functions の
  自前シークレットに `SUPABASE_` を付ける、単数形と複数形（`SUPABASE_SECRET_KEY(S)`）を
  取り違える — いずれも実装・提案の時点で却下。
- **厳命 ②（§0.2）違反は却下**する: PF が自動供給する値・非機密の識別子・ローカル専用の
  非機密既定値を Doppler に入れる提案は却下。逆に、**環境をまたいで共有すべきシークレットを
  Doppler 以外（`.env` 直書き・コード内リテラル・Dashboard 手入力）に置く提案も却下**する。
- **native sync が付いている config**（`<app>/{dev,stg,prd}` = GitHub sync）に、その sync 先が
  予約する prefix のキーを登録する実装・提案は**レビューで却下**する。
- 逆に、**sync の無い config（`all` / `<app>/bootstrap`）で意味もなく省略形にする実装も却下**する。
  キー名は読む側のツールが実際に読む名前に揃える（§4）。
- **Supabase の環境変数を Doppler に入れる提案も却下**する（Vercel Marketplace 連携と Edge Functions の
  default secrets が正規の供給経路）。
- 判断に迷う場合は勝手に決めず**ユーザーに確認**する。
