# Doppler × CI/CD（Vercel(web/backend) / Supabase / GitHub Actions）

このプロジェクトのデプロイは **各プラットフォームが GitHub 連携で直接ビルド/デプロイ**する
（アプリのデプロイを GitHub Actions では行わない。Actions は Drizzle migration のみ）。
シークレットは **Doppler のネイティブ連携（sync）で各配布先へ直接届ける**。Vercel（web / backend の
2 project）/ Supabase / **GitHub Actions** いずれも Doppler 公式ネイティブ連携がある。
**どの配布先でも、実行時に doppler CLI を叩かない**（値は既に環境変数として届いている）。

目次:
1. 全体像
2. config ↔ 環境の対応
3. Vercel web（ネイティブ連携）
4. Vercel backend（ネイティブ連携）
5. Supabase（ネイティブ連携）
6. GitHub Actions（ネイティブ sync → `${{ secrets.* }}`）
7. サービストークン運用
8. 検証

## 1. 全体像

```
            ┌──────────── Doppler（シークレットの正本）─────────────┐
            │  config: dev / stg / prd                              │
            └───┬─────────────┬──────────────┬─────────────────────┘
   native sync  │             │              │  native sync      │ native sync
                ▼             ▼              ▼                    ▼
         Vercel web     Vercel backend    Supabase        GitHub Actions
         (env vars)    (env vars/コンテナ) (Functions secrets)  (Environment secrets)
                ▲             ▲              ▲
                └──── GitHub 連携で push → 各プラットフォームがビルド/デプロイ ────┘
```

- シークレットは Doppler ダッシュボードの **Integrations（sync）** で各プラットフォームへ自動反映。
- **GitHub Actions も同じく sync 対象**（§6）。Doppler の各 config を対応する GitHub Environment の
  secrets へ配るので、workflow は `${{ secrets.* }}` を読むだけでよい（Actions 内で doppler CLI を
  使わない＝service token 不要）。

## 2. config ↔ 環境の対応

| Doppler config | Vercel web | Vercel backend | Supabase | devenv profile |
|---|---|---|---|---|
| `prd` | Production | Production | 本番 project | `-P production` |
| `stg` | Preview | Preview | staging project | `-P staging` |
| `dev` | Development | Development | dev project | `-P dev` |

Vercel は環境ごとに**別々の連携**が必要（Development / Preview / Production）。web / backend は
別 project なので、それぞれに対して連携を作る。

## 3. Vercel web（ネイティブ連携）

ダッシュボード操作（ユーザー）:
1. Doppler の対象 project → **Integrations** → **Vercel** → 認可し、**web project** を選ぶ。
2. **環境ごとに連携を作成**: `prd`→Production / `stg`→Preview / `dev`→Development。
3. sync 対象の Doppler config と Vercel 環境を選択。Doppler は Vercel 同期を既定で
   **Sensitive** として扱う。

以降、Doppler の値を更新すると Vercel の env vars に反映され（webhook で再デプロイも可）、
Vercel の GitHub 連携ビルドがその値を使う。`NEXT_PUBLIC_*` のような**非機密**は引き続き
`env/frontend/.env.<ENV>`（リポジトリ）で管理してもよい（責務分離）。
**web の Supabase env は Marketplace「Connect Account」が注入する**ので Doppler では扱わない
（`SUPABASE_` prefix は登録禁止。`.claude/rules/env-naming.md`）。

## 4. Vercel backend（ネイティブ連携）

FastAPI backend も Vercel project（`backend-py/Dockerfile.vercel` のコンテナ）。web と同じ
Vercel ネイティブ連携を **backend project** に向けて作る:

1. Doppler の対象 project → **Integrations** → **Vercel** → 認可し、**backend project** を選ぶ。
2. **環境ごとに連携を作成**: `prd`→Production / `stg`→Preview / `dev`→Development。
3. sync 対象の Doppler config を選択。

選択した config の secrets（外部 API キー等）が backend コンテナの env vars に継続 sync され、
Vercel の GitHub 連携ビルド/ランタイムが使う（コード変更不要）。
**Supabase 接続情報（`SUPABASE_*` / `POSTGRES_*`）は Marketplace 連携が注入する**ので
Doppler には置かない（`.claude/rules/env-naming.md`）。

## 5. Supabase（ネイティブ連携）

> 旧 `scripts/supabase/deploy-secrets.sh`（dotenvx で `supabase secrets set`）は廃止し、
> ネイティブ連携に置換した。`deploy.sh` は secrets を push しない。

1. Supabase の Access Token を発行。
2. Doppler の対象 project → **Integrations** → **Supabase** → Access Token を貼り付け。
3. sync 先の Supabase project と Doppler config を選択。

config の secrets が Supabase に継続 sync され、`supabase secrets list` で確認でき Edge Functions
から参照できる。Functions / config / migration のデプロイ自体は従来どおり
`devenv tasks run -P <env> deploy:supabase`（GitHub 連携 + CLI）で行う。

## 6. GitHub Actions（ネイティブ sync → `${{ secrets.* }}`）

**方針: Actions 内で doppler CLI を使わない。** Doppler の **GitHub ネイティブ連携**が secrets を
GitHub 側へ配るので、workflow は `${{ secrets.* }}` を job env に渡すだけでよい
（service token も `doppler run` も不要）。

### config ↔ GitHub Environment の対応

Doppler の GitHub 連携は **Environment secrets への sync に対応**している。公式:
「When an environment is selected, your Doppler secrets will be synced to the **Environment secrets**
for the chosen environment rather than the Repository secrets.」
複数 config を配るには **sync を環境ごとに作る**（[Doppler: GitHub Actions](https://docs.doppler.com/docs/github-actions)）。

| Doppler config | GitHub Environment | 使う workflow |
|---|---|---|
| `prd` | `production` | `migrate.yml`（承認ゲートあり） |
| `stg` | `staging` | `migrate.yml` |
| `dev` | `dev` | `migrate.yml` |

`migrate.yml` は `environment:` で環境を選ぶので、**その環境の secrets が自動的に解決される**
（例: `POSTGRES_URL: ${{ secrets.POSTGRES_URL }}`）。

> ⚠️ **`GITHUB_` prefix のキーは sync できない**（GitHub が予約。1 つでも混ざると sync が失敗して
> その config 全体が届かなくなる）。`.claude/rules/env-naming.md` を参照。

### workflow 側の必須設定

```yaml
env:
  MIGRATE_POSTGRES_URL: ${{ secrets.POSTGRES_URL }}  # ← 変数名に注意（下記）
  DOPPLER_SKIP: "1"                                   # devenv の Doppler ロードを明示スキップ
  ENV: production                                     # profile / config の選択
```

**⚠️ secrets をそのままの名前で渡してはいけない。** devenv の enterShell は
`set -a; . env/<svc>/.env.$ENV` を実行するため、**その env ファイルが定義する変数は、外から
渡した同名の値を上書きする**。実測（本リポジトリの devenv）:

| 渡し方 | `devenv shell` 内での値 |
|---|---|
| `POSTGRES_URL=<remote>`（ENV 未指定→local） | ❌ `127.0.0.1:54322` に**上書きされる**（`env/*/.env.local` が定義しているため） |
| `POSTGRES_URL=<remote>` + `ENV=production` | ✅ 残る（`env/*/.env.production` が無いため） |
| `MIGRATE_POSTGRES_URL=<remote>`（ENV 問わず） | ✅ **常に残る**（devenv も env ファイルも定義しない名前） |

`ENV` を渡せば上書きは避けられるが、それは「`env/*/.env.<ENV>` が存在しない」ことに依存した
条件付きの安全にすぎない（将来 `.env.production` を置いた瞬間に壊れる）。よって
**devenv が触らない名前で輸送し、`db:migrate-deploy` task が最後に `POSTGRES_URL` へ反映する**。
これなら ENV の解決結果に関係なく成立する。

- **`DOPPLER_SKIP=1`**: Actions では doppler CLI を叩かないので `loadDopplerByEnv` をスキップさせる。
  付けないと毎 run 「⚠️ シークレット未ロード」警告が出続ける（警告の常態化を避ける）。
- **`ENV`**: Doppler config / env ファイルの選択に使う。接続先の正しさは輸送変数で担保されるため
  ENV には依存しないが、profile を明示するために渡す。

CI（`.github/workflows/ci.yml`）は lint / format / type-check / unit-test のみで**シークレット不要**
（ローカル既定値は `env/<svc>/.env.local` から入る）。`DOPPLER_SKIP=1` のみ設定している。

## 7. サービストークン運用

- **ネイティブ連携（Vercel / Supabase / GitHub）はダッシュボードの OAuth 認可で完結**するため、
  自前の service token は不要。
- service token が要るのは「Doppler から値を実行時に取りに行く」構成だけ（本リポジトリでは
  ローカル開発以外に該当なし）。使う場合は **read-only・単一 config スコープ**にする。
  CLI / Personal トークンは作成者と同じ write 権限を持つため live 環境で使わない。
- 失効を付けるなら `doppler configs tokens create <name> --plain --max-age 24h`。
- prd への write はユーザー承認必須（`.claude/skills/doppler/SKILL.md`）。

## 8. 検証

- **連携 sync**: Doppler で値を変更 → 各プラットフォームの env vars に反映されるか
  （Vercel(web/backend) は project settings、Supabase は `supabase secrets list`）。
- **GitHub sync**: 各 GitHub Environment（dev / staging / production）の secrets に
  `POSTGRES_URL` 等が来ているか（`gh secret list --env production`）。
- **CI**: `ci.yml`（lint/test）が secrets 無しで green。`migrate.yml` は適用前の検証ステップが
  接続先を確認して落ちないこと。
- **デプロイ**: 各プラットフォームの GitHub 連携ビルドが sync された値で成功する。
