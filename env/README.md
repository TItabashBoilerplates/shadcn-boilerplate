# `env/` ディレクトリ

環境変数の置き場所。**シークレットとリモートの値は Doppler、ローカルの非機密既定値はファイル**。
読み込みは環境変数 `ENV` で切り替わる。詳細は `.claude/skills/doppler/SKILL.md`。

## 方針（Doppler-main）

| 種類 | 例 | 置き場所 |
|---|---|---|
| **シークレット**（全環境） | 外部 API キー / トークン / DB パスワード / service_role 等 | **Doppler のみ**（ファイルフォールバック廃止） |
| **生成される非機密**（リモート） | migration 用 `POSTGRES_URL`（**session pooler / IPv4**）/ mobile 用 `EXPO_PUBLIC_*` / backend(Vercel) endpoint | **Doppler**（`scripts/infra/wire.sh` が投入 → ネイティブ連携で配布） |
| **Vercel 上の Supabase env** | `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_*` / `POSTGRES_*` | **Vercel Marketplace の Supabase 連携が自動注入**（Doppler にもファイルにも置かない） |
| **ローカルの非機密既定値** | local Supabase URL / publishable key / `localhost:54322` の `POSTGRES_URL` / port | **このディレクトリの `.env.local`** |

要点:

- **ローカル（`ENV=local`）** = `env/<svc>/.env.local`（コミット・well-known なローカル既定値）
  ＋ Doppler `dev_personal`（実シークレット）。
- **リモート（dev/stg/prd）** = **Doppler 一本**。非機密も秘密もすべて Doppler に集約し、
  ネイティブ連携（Doppler→Vercel(web/backend)/Supabase）と Vercel Marketplace で各サービスへ届く。
  **`.env.<dev|staging|production>` ファイルは作らない**（gitignore 済みでデプロイ先に届かず、
  リモート配信手段にならないため）。

## 構成

```
env/
├── README.md              # このファイル
├── backend/.env.local     # backend ローカル非機密（Supabase URL / port 等）
├── frontend/.env.local    # frontend ローカル非機密（NEXT_PUBLIC_*）
└── migration/.env.local   # migration ローカル非機密（ローカル POSTGRES_URL）
```

`.env.local` のみコミット（非機密）。それ以外の `.env.*` は gitignore。

## 読み込み（ENV 駆動）

`devenv.nix` が `ENV`（既定 `local`）に従って読み込む:

1. `loadEnvFilesForEnv`: `env/<svc>/.env.$ENV` を source（**実運用では `.env.local` のみ存在**。
   リモートは Doppler 一本なので `.env.<remote>` は無い）。
2. `loadDopplerByEnv`: `$ENV` 対応の Doppler config からシークレット＋リモート非機密を注入。
   取得できなければ警告（フォールバック無し）。

```bash
devenv shell                      # ENV=local: .env.local（config）+ Doppler local（secrets）
devenv shell -P staging -- <cmd>  # ENV=staging: Doppler stg（非機密も秘密も Doppler から）
```

| `ENV`（= devenv profile） | Doppler config |
|---|---|
| `local`（既定） | ローカル紐付け（`dev_personal`） |
| `dev` / `staging` / `production` | `dev` / `stg` / `prd` |

## ⚠️ Doppler のキー命名（予約 prefix 禁止）

**`GITHUB_` / `SUPABASE_` / `VERCEL_` 始まりのキーを Doppler に登録してはならない。**
各 PF の予約名前空間なので、ネイティブ連携の sync が予約値違反でエラーになり config 全体が届かなくなる。

- **Supabase の env は Doppler で管理しない**。Vercel(web/backend) へは **Vercel Marketplace の
  Supabase 連携（Connect Account）** が `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` /
  `SUPABASE_SECRET_KEY` / `NEXT_PUBLIC_SUPABASE_*` / `POSTGRES_*` を自動注入し、Edge Functions へは
  Supabase platform が **default secrets** として自動提供する。
- 自前で持つ値は**そのツールが実際に読む名前**で持つ（`SUPABASE_ACCESS_TOKEN` /
  `SUPABASE_DB_PASSWORD` / `VERCEL_TOKEN` / `DOPPLER_TOKEN`）。sync を張っていない config
  （`all` / `<app>/bootstrap`）なので予約 prefix の制約はかからない。
  例外は `GH_TOKEN` だけで、`GITHUB_` は GitHub Actions が予約しており `dev`/`stg`/`prd` は
  GitHub へ sync されるため（かつ `GH_TOKEN` は `gh` CLI の公式名）。
  `NEXT_PUBLIC_SUPABASE_URL` のように**先頭でなければ可**。
- **このディレクトリの `.env.local` は対象外**（ファイル管理・sync されないため `SUPABASE_URL=` 等はそのままでよい）。

→ 詳細: `.claude/rules/env-naming.md`

## シークレット / 値の登録（Doppler）

```bash
doppler login                       # 一度だけ（keyring）。CI/headless は DOPPLER_TOKEN
doppler setup                       # ローカルを project/config に紐付け（doppler.yaml）

# 推奨（最小タイプ・値は非表示入力）: dev/stg/prd へ一括。dev に入れるとローカルは継承で反映
doppler-set OPENAI_API_KEY          # 値を非表示で入力 → dev stg prd
doppler-set STRIPE_SECRET_KEY dev   # config を絞る場合は列挙

# 複数キーまとめて（.env ファイル → 投入後に削除）
doppler-import /tmp/secrets.dev.env --config dev
```

- **本番（prd）への write はフェーズ制**（`.claude/rules/mcp-doppler.md`）。
- **リモートの生成非機密**（migration 用 `POSTGRES_URL` / mobile 用 `EXPO_PUBLIC_*` / backend(Vercel)
  endpoint）は `infra-bootstrap`（`scripts/infra/wire.sh`）が自動投入する（手動不要）。
  **Vercel(web/backend) の Supabase env は Marketplace 連携が注入するので Doppler には入れない**。
  詳細は `docs/deployment/README.md`。

## Git 追跡

commit するのは **`.env.local`（非機密）と `README.md` のみ**。その他 `.env.*` は gitignore。
シークレット・リモート値は一切ファイルに置かない（Doppler が単一ソース）。
