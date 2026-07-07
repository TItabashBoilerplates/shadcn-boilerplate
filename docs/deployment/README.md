# デプロイ & プロビジョニング runbook

Vercel（Web + FastAPI backend）/ Supabase（DB・Edge Functions・config）を **各 PaaS の
ネイティブ Git 連携**で `git push` デプロイし、外部プロジェクトの初期構築を
`infra-bootstrap`（scriptable な部分）＋一度きりの手動 dashboard 設定で行うための手順。

> **backend も Vercel（モノレポ = アプリごとに 1 コンテナ）**: backend-py は uv workspace
> （apps/api, apps/mcp, packages/core）。各アプリの Dockerfile を `apps/<app>/Dockerfile.vercel` に置き、
> `backend-py/vercel.json` の `services` から参照する（Vercel が service 単位で別コンテナをビルド）。
> web(Next.js) とは **別の Vercel project**（Root Directory = `backend-py`、ビルドコンテキストは
> workspace ルート）にする。詳細は [Vercel Container Images](https://vercel.com/docs/functions/container-images)。

> 設計の意思決定ログ: `/Users/titabash/.claude/plans/`（または本リポジトリの PR 説明）。
> 関連ルール: `.claude/rules/{mcp-doppler,mcp-supabase,database,supabase-config,commands}.md`。

---

## ⚠️ 最初に: 「コマンド一発」の正確な意味

公式 CLI 仕様の制約上、**初期プロビジョニングを単一コマンドで完全自動化することはできない**。
本構成では2つを分けて考える:

- **✅ 運用時の `git push`** … セットアップ完了後は **`git push` だけ**で3 PaaS が各ネイティブ連携で
  デプロイする。これが恒常運用の到達点（本物の「一発」）。
- **⚠️ 初期構築** … **一度きりの手動 dashboard 設定（OAuth・repo 接続・branch 紐付け）** ＋
  `infra-bootstrap`（project / env / GitHub 承認ゲートの自動化）。`infra-bootstrap` は
  scriptable な約7割を担う補助であり、「一発」ではない。

### 構造的に手動でしか出来ない箇所（公式仕様）

| 操作 | 理由 |
|---|---|
| 各 PaaS の GitHub 連携 OAuth / App install | dashboard 専用 |
| Supabase GitHub Integration（repo 接続・working dir・branch） | dashboard 専用 |
| Doppler→Vercel/Supabase の secret 連携 | UI Integration OAuth |
| API トークン発行 / Supabase org・課金 | 各サービス仕様 |

---

## アーキテクチャ

```
                 git push (main / staging / develop)   ← 運用時の唯一の操作
        ┌──────────────────────────────┬───────────────────────┬──────────────────────────┐
        ▼                              ▼                       ▼                          ▼
  Vercel GitHub App webhook        Supabase ネイティブ      .github/workflows/migrate.yml
  ├─ web project (turbo build)     GitHub Integration       └─ db:migrate-deploy (Drizzle)
  └─ backend project              config同期 + Functions       dev/stg=自動
     (Dockerfile.vercel コンテナ)  + Storage buckets            production=承認ゲート
        └────────────────── Doppler native sync (secrets) ─────────────────┘
```

**branch → env マッピング**

| branch | profile / ENV | Doppler config | Vercel (web / backend) | Supabase（1 project + branch） |
|---|---|---|---|---|
| `develop` | dev | `dev` | Preview | persistent branch `develop` |
| `staging` | staging | `stg` | Preview | persistent branch `staging` |
| `main` | production | `prd` | Production | project 本体（default branch） |

> **Supabase は 1 project + Branching**（公式想定）。project 本体 = production、staging/develop は
> **persistent branch**（long-lived・git branch に紐付け）。環境 prefix の付いた3 project は作らない。
>
> **マイグレは Drizzle が source of truth（意図的）**。Supabase ネイティブ連携 / Branching が読む
> migrations は `supabase/migrations/*.sql` のみで、Drizzle の `drizzle/migrations/`（フォルダ形式）は
> 対象外（branch は production の db dump で初期化される）。Drizzle の追加差分は `migrate.yml` が
> 各 env の `DATABASE_URL`（= 各 branch の接続情報）へ適用する。

---

## Phase 0 — 手動（アカウント・OAuth・トークン。一度きり）

CLI では代替できない前提づくり。

1. **アカウント / org / 課金**: Supabase org 作成＋課金プラン、Vercel / Doppler / GitHub。
   Vercel の Container Images（Dockerfile.vercel）は Beta 機能のため、対象アカウントで利用可能か確認する。
2. **各 PaaS の GitHub 連携を dashboard で認可**（対象は単一 repo `owner/repo`）:
   - **Vercel**: GitHub App を install（repo を許可）。web / backend の 2 project がこの repo を監視する。
   - **Supabase**: **1 project**（独立所有）の *Project Settings > Integrations > Authorize GitHub* で Branching を有効化。
     - **Working directory** = `.`（`supabase/` が repo ルート直下のため）
     - **"Deploy to production"** を有効（production branch = `main`）
     - staging/develop の persistent branch は Phase 1 の `infra-bootstrap`(supabase) が作成する。
     - ⚠️ persistent branch は long-lived＝常時 compute 課金（Micro 約 $0.0134/h, Spend Cap 対象外）。
       develop を常時必要としないなら PR時のみの preview 運用も検討。
   - **Vercel ⇄ Supabase（Marketplace Connect Account）**: Vercel project の *Settings > Integrations >
     Browse Marketplace > Supabase > **Connect Account*** で、**上で作った独立 Supabase を接続**する
     （Native の「新規作成」ではなく **Connect**。`vercel integration add supabase` でも可）。これで
     `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 等が **Vercel に自動注入**される。
     - ⚠️ 注入キー名（新 publishable/secret 体系か旧 anon/service_role か）は連携後に Vercel の
       Environment Variables 画面で実機確認し、アプリ参照名と一致させる。
3. **API トークン発行**（値はチャット / コミットに出さない）:
   - `VERCEL_TOKEN`（Full Access。web / backend 両 project の作成・env 設定・domain 取得に使う）
   - `SUPABASE_ACCESS_TOKEN`（PAT）/ `SUPABASE_DB_PASSWORD`（単一 project の DB パスワード）
   - `GH_TOKEN`（または `gh auth login` 済み）
   - これらを **Doppler の bootstrap 用 config** に投入（doppler MCP / dashboard）。
     `infra-bootstrap` が `doppler run` でこの config から環境変数として注入する。

> Doppler の書き込みは `.claude/rules/mcp-doppler.md` のフェーズ制に従う（現在 `初期構築(full-access)`）。

---

## Phase 1 — 自動（`infra-bootstrap`）

scriptable な project / env / GitHub 承認ゲートを冪等に作成する。

```bash
# 1) 非機密入力を用意（secret は書かない）
cp scripts/infra/config.example.env scripts/infra/config.env
$EDITOR scripts/infra/config.env      # APP_NAME / GH_REPO / SUPABASE_ORG_ID / GH_PROD_REVIEWERS 等

# 2) Doppler のローカル紐付け（bootstrap config を参照できる状態に）
doppler login && doppler setup

# 3) 実行（冪等・再実行可。全ステップ or 単一ステップ）
infra-bootstrap                 # doppler→supabase→vercel→github→wire
infra-bootstrap supabase github # 一部だけ再実行も可
```

`infra-bootstrap` が自動化する範囲:

| ステップ | 内容 |
|---|---|
| `doppler` | project + config(dev/stg/prd) の存在保証 |
| `supabase` | **1 project 作成**（ref を `.outputs`）＋ **persistent branch(staging/develop)** を Management API で作成 |
| `vercel` | **web + backend の 2 project** 作成 + repo 接続 + rootDirectory（web=`frontend/apps/web` / backend=`backend-py`）+ **静的な**非機密 env（REST API, upsert） |
| `github` | environment(dev/staging/production) + **production 承認ゲート** + 環境別 `DOPPLER_TOKEN`(read-only) |
| `wire` | **生成値を取得して Doppler に格納**（Doppler が backend/edge へ fan-out）＋ backend(Vercel) endpoint を Vercel(web) にも直接 set |

> 出力された `scripts/infra/.outputs`（project ref / URL。非機密）は wire の入力に使う。

### 生成値の自動配線（手動管理しない）

**所有/配線モデル（ユーザー決定）**: Supabase は独立所有。Vercel(web) へは **Marketplace「Connect Account」**で Supabase env が自動注入される。Vercel(web) 以外（Vercel backend/Expo/migration/edge）へは **Doppler 経由**で配る。よって `wire` ステップは「**生成値を取得 → Doppler の各 config(dev/stg/prd) に格納**」する（外部 API キーは対象外＝ユーザーが Doppler に直接投入）。

| 生成値（Doppler に格納するキー） | 由来 | 受け取る側 |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` | project本体=`api-keys`＋`https://<ref>.supabase.co` / branch=`branches get -o env` | Vercel backend・edge |
| `POSTGRES_URL` / `DATABASE_URL` | 直結 DB 接続（branch は `POSTGRES_URL_NON_POOLING`） | backend / Drizzle migration |
| `EXPO_PUBLIC_SUPABASE_URL` / `..._PUBLISHABLE_KEY` | 同上 | mobile(EAS) |
| `NEXT_PUBLIC_BACKEND_PY_URL` / `EXPO_PUBLIC_BACKEND_PY_URL` | backend(Vercel) project の公開ドメイン（本番=project domain、preview=`<project>-git-<branch>-<slug>.vercel.app`） | web / mobile |

配布経路:
- **Vercel(web)** … `wire` が **`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_BACKEND_PY_URL` を Vercel に直接 set**。
  - ⚠️ Marketplace「Connect Account」も Supabase env を注入するが、**注入名が旧 anon 体系**（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）で、リポジトリの期待名（`..._PUBLISHABLE_KEY`）と食い違う。`wire` が期待名を直接 set するため**注入名に依存せず動く**（Marketplace 連携は branching 連携/課金一元化の用途）。
- **Vercel(backend) / Supabase(edge)** … Doppler ネイティブ連携が config の値を sync（backend は `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `POSTGRES_URL` 等をランタイムで受け取る）。
- **migration(GitHub Actions)** … `DATABASE_URL` を Doppler から取得（env スコープ `DOPPLER_TOKEN`）。
- **mobile(EAS)** … Doppler に置いた `EXPO_PUBLIC_*` を EAS 側で取り込む（EAS の env 機構は別途・要設定）。
- **edge functions の `SUPABASE_URL`/`ANON`/`SERVICE_ROLE`/`SUPABASE_DB_URL`** … Supabase ランタイムが**自動注入**（配線不要）。
> **外部 API キー（OpenAI 等）は対象外**＝ユーザーが Doppler に直接投入し、各所へ native sync。

---

## Phase 2 — 手動（dashboard 専用の残り）

1. **Doppler ネイティブ連携（secret sync）**を環境別に接続（*Doppler project > Integrations*）:
   - **Vercel(backend)**: backend project に Doppler を接続し、config を対応（→ `SUPABASE_URL` /
     `SUPABASE_SECRET_KEY` / `POSTGRES_URL` 等が backend コンテナのランタイム env に届く）。
     backend は RLS を跨ぐ処理で service_role を使うため、backend project にのみ secret を配る。
   - Supabase(edge): Access Token を貼り、**branch 単位**で対応（OneSignal 等 edge secret 用）
   - Vercel(web): **任意**。Supabase env は Marketplace Connect で入るため、Doppler→Vercel(web) は基本不要
     （使うなら Supabase キーが二重化しないよう注意。backend URL は wire が Vercel(web) に直接 set 済み）。
2. **外部 API キー（OpenAI/Stripe 等）を Doppler の各 config に投入**（doppler MCP。値は露出しない）。
   ※ **Supabase の URL/keys/DB接続・backend(Vercel) endpoint は Phase 1 の `wire` が Doppler に自動投入済み**
     （手動不要）。ここで入れるのは「外部から持ち込む secret」だけ。
3. **env ファイルは不要**（リモートは Doppler 一本）:
   - **リモート(dev/stg/prd)** の非機密も秘密もすべて Doppler に集約される（生成値=`wire` が投入、
     外部 secret=手順2）。`.env.<dev|staging|production>` ファイルは**作らない**（gitignore 済みで
     デプロイ先に届かず配信手段にならない）。
   - **ローカル**のみ `env/<svc>/.env.local`（well-known なローカル既定値）を使う。詳細は `env/README.md`。

---

## Phase 3 — 運用（恒常・本物の「一発」）

```bash
git push origin develop    # → dev:  Vercel Preview(web+backend) / Supabase(dev) / migrate(dev 自動)
git push origin staging    # → stg
git push origin main       # → prd:  各 PaaS 反映 + migrate は GitHub で承認後に適用
```

- Vercel(web + backend) / Supabase … 各ネイティブ連携が自動ビルド/反映。
- Drizzle マイグレ … `migrate.yml`。`drizzle/{schema,migrations,config}` 変更時に起動。
  **production のみ GitHub Environment の承認待ち**（承認するまで適用されない）。

---

## 検証チェックリスト

- [ ] `infra-bootstrap` を2回流して重複作成が無い（冪等）。secret 値がログに出ない。
- [ ] Supabase MCP（read-only）で **1 project + persistent branch(staging/develop)** を確認。`.outputs` に ref。
- [ ] `gh api repos/<owner>/<repo>/environments/production` に required reviewers。
- [ ] `develop` にダミー commit → Vercel Preview（web + backend）が green。backend の `/healthcheck` が 200。
- [ ] `drizzle/schema` 変更を `main` に push → `migrate.yml` が production で**承認待ち**。
- [ ] 各 PaaS に Doppler 由来 env が反映（Supabase は `supabase secrets list`）。
- [ ] 既存 CI（`ci.yml`）が非回帰で green。

---

## トラブルシュート / 既知の注意

| 事象 | 対応 |
|---|---|
| Vercel preview env が CI でハング | CLI bug #15763。本構成は **REST API** で投入済み（`vercel.sh`）。手動時も API を使う。 |
| backend project が Dockerfile を検出しない / runtime が違う | ① `vercel.json` の `services.<app>` に **`"runtime": "container"`** があるか（無いと Vercel が runtime 自動検出し entrypoint を module:app と誤解する）。② Root Directory が `backend-py` で `services.<app>.root` が `"."`、`entrypoint` が `apps/<app>/Dockerfile.vercel` か。③ Container Images(Beta) が有効か。※ `root:"."` が受け付けられない場合は project の Root Directory を repo ルートにし `root:"backend-py"` にする代替も可。 |
| backend が起動直後に落ちる / 502 | サーバが `$PORT`（既定 80）で listen しているか確認。`api.main` は `PORT` 環境変数を読む。Doppler→Vercel(backend) で `SUPABASE_URL` / `POSTGRES_URL` 等が届いているかも確認。 |
| `wire` が backend の preview URL を取れない | team/personal の slug 取得に失敗している可能性。`VERCEL_TEAM_ID` を確認（個人アカウントは空）。best-effort のため warn のみで継続する。 |
| persistent branch 作成 API が失敗 | project の GitHub Integration(Branching) が dashboard で有効か確認（Phase 0）。CLI の git 紐付けフラグは `supabase branches create --help` で確認、確実なのは Management API の `git_branch`。 |
| branch の DB 接続が分からない | `supabase --experimental branches get <branch> -o env` の `POSTGRES_URL_NON_POOLING` を使う（Phase 2-3）。 |
| persistent branch のコスト | long-lived は常時 compute 課金（Spend Cap 対象外）。develop を PR 時のみ preview にすればコスト減。 |
| Doppler フラグ綴り差 | `doppler ... create --help`(v3.75 で確認済み) と一致しているか確認。 |
| 本番ローンチ後 | `.claude/rules/mcp-doppler.md` の手順で Doppler を `本番(protected)` フェーズへ切替（prd 書込を service token スコープで封鎖）。 |
