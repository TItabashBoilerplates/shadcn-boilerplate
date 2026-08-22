# デプロイ & プロビジョニング runbook

Vercel（Web + FastAPI backend）/ Supabase（DB・Edge Functions・config）を **各 PaaS の
ネイティブ Git 連携**で `git push` デプロイし、外部プロジェクトの初期構築を
`infra-bootstrap`（scriptable な部分）＋一度きりの手動 dashboard 設定で行うための手順。

> **backend も Vercel（Services のコンテナサービス）**: backend-py は uv workspace
> （apps/api, apps/mcp, packages/core）。**Dockerfile は workspace ルートの
> `backend-py/` 直下に blessed 名で置き**、`backend-py/vercel.json` の `services` から
> entrypoint として参照する。web(Next.js) とは **別の Vercel project**（Root Directory = `backend-py`）で、
> デプロイは `vercel-deploy backend-py`。
> entrypoint に使える名前は `Dockerfile.vercel` / `Containerfile.vercel` / `Dockerfile` /
> `Containerfile` の 4 つだけで（接尾辞つきは不可）、**ビルドコンテキストは Dockerfile の
> あるディレクトリに固定**（`root` では変えられない）。結果として
> **1 ディレクトリにつき最大 4 コンテナサービス**まで置ける。実装ソースでの裏取りは
> [`docs/_research/2026-08-22-vercel-services-container-build-context.md`](../_research/2026-08-22-vercel-services-container-build-context.md)、
> 公式は [Vercel Container Images](https://vercel.com/docs/functions/container-images)。

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
> 各 env の `POSTGRES_URL`（= 各 branch の接続情報）へ適用する。

---

## Phase 0 — 手動（アカウント・OAuth・トークン。一度きり）

CLI では代替できない前提づくり。

1. **アカウント / org / 課金**: Supabase org 作成＋課金プラン、Vercel / Doppler / GitHub。
   Vercel の **Container Images / Services**（`vercel.json` の `services` + `runtime:"container"` + `Dockerfile.vercel`）は
   **GA だが「Permissions Required（🔒）」** の機能 → 対象アカウント/チームで**有効化されているか事前確認**する
   （[Services](https://vercel.com/docs/services) / [Container Images](https://vercel.com/docs/functions/container-images)）。
   ⚠️ **制約**: container Services では **Static IP / Secure Compute が非対応**。backend の egress 固定 IP を要求する
   外部サービス（IP 許可リスト等）がある場合は要注意（Supabase 接続は固定 IP 不要なので通常は問題なし）。
2. **各 PaaS の GitHub 連携を dashboard で認可**（対象は単一 repo `owner/repo`）:
   - **Vercel**: GitHub App を install（repo を許可）。web / backend の 2 project がこの repo を監視する。
   - **Supabase**: **1 project**（独立所有）の *Project Settings > Integrations > Authorize GitHub* で Branching を有効化。
     - **Working directory** = `.`（`supabase/` が repo ルート直下のため）
     - **"Deploy to production"** を有効（production branch = `main`）
     - staging/develop の persistent branch は Phase 1 の `infra-bootstrap`(supabase) が作成する。
     - ⚠️ persistent branch は long-lived＝常時 compute 課金（Micro 約 $0.0134/h, Spend Cap 対象外）。
       develop を常時必要としないなら PR時のみの preview 運用も検討。
   - **Vercel ⇄ Supabase（Marketplace Connect Account）**: **web / backend の両 Vercel project** で
     *Settings > Integrations > Browse Marketplace > Supabase > **Connect Account*** から、
     **上で作った独立 Supabase を接続**する（Native の「新規作成」ではなく **Connect**。
     `vercel integration add supabase` でも可）。**外部で作った Supabase を Connect した場合も env vars は
     同期される**（[Vercel Marketplace: Supabase](https://vercel.com/marketplace/supabase)）。
     **backend も Vercel project（Services）なので同じ経路で賄える** → Supabase の値を Doppler で配る
     必要は無い（`.claude/rules/env-naming.md`）。
     - 注入される変数（公式・確定）: `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` /
       `POSTGRES_USER` / `POSTGRES_HOST` / `POSTGRES_PASSWORD` / `POSTGRES_DATABASE` / `SUPABASE_URL` /
       `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` / `NEXT_PUBLIC_SUPABASE_URL` /
       `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（＋ Supabase 側ドキュメントには `SUPABASE_JWT_SECRET`）。
     - **本リポジトリの参照名（web=`NEXT_PUBLIC_SUPABASE_URL`/`..._PUBLISHABLE_KEY`、
       backend=`SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`）とこれは完全一致しているので、通常は調整不要**。
     - 旧 `anon` / `service_role` 名で入るのは **Marketplace 以前の旧 Integration**。混同しないこと。
       万一ズレた場合のみ **Vercel 側で別名の env var を追加**して合わせる（Doppler には戻さない）。
3. **API トークン発行**（値はチャット / コミットに出さない）:
   - `VERCEL_TOKEN`（Vercel Full Access。web / backend 両 project の作成・env 設定・domain 取得に使う）
   - `SUPABASE_ACCESS_TOKEN`（Supabase PAT）/ `SUPABASE_DB_PASSWORD`（単一 project の DB パスワード）
   - `GH_TOKEN`（または `gh auth login` 済み）
   - これらを **Doppler の bootstrap 用 config** に投入（doppler MCP / dashboard）。
     `infra-bootstrap` が `doppler run` でこの config から環境変数として注入する。

   > ⚠️ **キー名は各ツールが実際に読む名前に揃える**（`.claude/rules/env-naming.md` §4）。
   > これらを置く config（`all` / `<app>/bootstrap`）は native sync を張っていないため、
   > `SUPABASE_*` / `VERCEL_*` をフルネームで持てる。`GH_TOKEN` だけ短いのは `GITHUB_` が
   > GitHub Actions の予約 prefix だから（かつ `gh` CLI の公式名）。

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
| `github` | environment(dev/staging/production) + **production 承認ゲート** + env secret の同期状況チェック |
| `wire` | **Vercel 外の消費者向けの生成値を Doppler に格納**（migration 用 `POSTGRES_URL` / mobile 用 `EXPO_PUBLIC_*`）＋ backend(Vercel) endpoint を Vercel(web) にも直接 set。Supabase の値は Marketplace 任せで扱わない |

> 出力された `scripts/infra/.outputs`（project ref / URL。非機密）は wire の入力に使う。

### 生成値の自動配線（手動管理しない）

**所有/配線モデル（ユーザー決定）**: Supabase は独立所有。**web / backend はどちらも Vercel project**（backend は Vercel Services のコンテナ）なので、**両方に Marketplace「Connect Account」を張れば Supabase env は Vercel 側へ自動注入**される。したがって **`wire` は Supabase の値を一切扱わない**。`wire` が Doppler に入れるのは「**Vercel の外にいる消費者**が必要とする値」だけ（外部 API キーは対象外＝ユーザーが Doppler に直接投入）。

> ⚠️ **`SUPABASE_` / `VERCEL_` / `GITHUB_` prefix のキーは Doppler に登録禁止**（各 PF の予約名前空間 →
> sync が予約値違反で落ちる）。詳細は `.claude/rules/env-naming.md`。

| 生成値（Doppler に格納するキー） | 由来 | 受け取る側 |
|---|---|---|
| `POSTGRES_URL` | **Supavisor の session pooler**（`postgres.<ref>@<region>.pooler.supabase.com:5432`）。host は Management API の pooler 設定から取得する | Drizzle migration（GitHub Actions） |
| `EXPO_PUBLIC_SUPABASE_URL` / `..._PUBLISHABLE_KEY` | project本体=`api-keys`＋`https://<ref>.supabase.co` / branch=`branches get -o env` | mobile(EAS) |
| `NEXT_PUBLIC_BACKEND_PY_URL` / `EXPO_PUBLIC_BACKEND_PY_URL` | backend(Vercel) project の公開ドメイン（本番=project domain、preview=`<project>-git-<branch>-<slug>.vercel.app`） | web / mobile |

配布経路:
- **Vercel(web) / Vercel(backend) の Supabase env** … **Marketplace「Connect Account」が自動注入**
  （`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` / `NEXT_PUBLIC_SUPABASE_*` /
  `POSTGRES_*`）。**Doppler にも `wire` にも持たせない**（二重管理の禁止）。
  - ⚠️ 注入されるキー名は新体系（publishable/secret）／旧体系（anon/service_role）で揺れる。
    **Connect 後に Vercel の Environment Variables 画面で実機確認**し、アプリの参照名
    （web: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、
    backend: `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`）と一致させる。ズレていれば
    **Vercel 側で別名を追加**して合わせる（Doppler には戻さない）。
- **Vercel(web) の backend endpoint** … Marketplace の管轄外なので `wire` が `NEXT_PUBLIC_BACKEND_PY_URL` を直接 set。
- **migration(GitHub Actions)** … Doppler→GitHub ネイティブ sync で GitHub Environment secrets に届いた `POSTGRES_URL` を job env で受け取る（Actions 内で doppler CLI は使わない）。
  - ⚠️ **接続先は pooler の session mode（`*.pooler.supabase.com:5432`）でなければならない。**
    GitHub-hosted runner は **IPv4 のみ**で、Supabase の直結エンドポイント（`db.<ref>.supabase.co`）は
    **IPv6**（IPv4 add-on を購入した project のみ IPv4）。直結を渡すと migration の実行中に
    `ENETUNREACH` で落ちるが、**開発者のマシンからは繋がるのでローカルでは再現しない**。
    transaction mode（`:6543`）も prepared statement 非対応なので migration には使えない。
    → 検査は `drizzle/scripts/migration-endpoint.ts`（`nr check-endpoint`、単体テストで固定）が
    workflow と `db:migrate-deploy` の両方で行う。IPv4 add-on 購入済みで直結を使いたい場合のみ
    `MIGRATE_ALLOW_DIRECT_DB=1` で許可できる。
    出典: [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)
- **mobile(EAS)** … Doppler に置いた `EXPO_PUBLIC_*` を EAS 側で取り込む（EAS の env 機構は別途・要設定）。
- **edge functions の `SUPABASE_URL`/`ANON`/`SERVICE_ROLE`/`SUPABASE_DB_URL`** … Supabase ランタイムが**自動注入**（配線不要）。
> **外部 API キー（OpenAI 等）は対象外**＝ユーザーが Doppler に直接投入し、各所へ native sync。

---

## Phase 2 — 手動（dashboard 専用の残り）

1. **Vercel ⇄ Supabase の Marketplace 連携を web / backend の両 project に張る**（Phase 0-2 の続き）:
   各 Vercel project の *Settings > Integrations > Supabase > **Connect Account*** で同一 Supabase を接続。
   これで両 project に Supabase env が自動注入される（Doppler で配らない）。**注入キー名は画面で実機確認**。
2. **Doppler ネイティブ連携（secret sync）**を環境別に接続（*Doppler project > Integrations*）:
   - **Vercel(backend)**: 外部 API キー（OpenAI 等）を backend コンテナに届けるために接続。
     **Supabase の値は Marketplace が入れるので Doppler 側に置かない**。
   - Supabase(edge): Access Token を貼り、**branch 単位**で対応（OneSignal 等 edge secret 用）。
     `SUPABASE_*` は platform の default secrets で入るため対象外。
   - Vercel(web): **任意**（web が必要とする外部 secret がある場合のみ）。
   - **GitHub Actions**: `migrate.yml` が使う `POSTGRES_URL` を配るため、**GitHub Environment 単位で
     sync を作る**（*Doppler project > Integrations > GitHub*）。公式仕様どおり **environment を選べば
     Repository secrets ではなく Environment secrets に同期**される。config ごとに sync を 1 つずつ作成:
     `prd`→Environment `production` / `stg`→`staging` / `dev`→`dev`。
     これにより Actions 内で doppler CLI / service token を使わずに `${{ secrets.POSTGRES_URL }}` で解決できる。
     確認: `gh secret list --env production`（`infra-bootstrap github` も未同期なら warn を出す）。
3. **外部 API キー（OpenAI/Stripe 等）を Doppler の各 config に投入**（doppler MCP。値は露出しない）。
   ※ **`POSTGRES_URL` / `EXPO_PUBLIC_*` / backend(Vercel) endpoint は Phase 1 の `wire` が Doppler に自動投入済み**
     （手動不要）。ここで入れるのは「外部から持ち込む secret」だけ。
   ※ **`SUPABASE_` / `VERCEL_` / `GITHUB_` prefix のキーは作らない**（`.claude/rules/env-naming.md`）。
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
- Drizzle マイグレ … `migrate.yml`。`drizzle/{schema,migrations,config}` / `migrate.ts` /
  `drizzle.config.ts` / `package.json` / `bun.lock` 変更時に起動。
  **production のみ GitHub Environment の承認待ち**（承認するまで適用されない）。

### アプリを 1 つ後から Vercel へ足す / 手で本番へ出す

`infra-bootstrap` は web + backend の 2 project を固定で作る初期構築用。その後で
`frontend/apps/<name>` を増やしたときや、git push を伴わずに本番へ出したいときは
**`vercel-deploy`** を使う（`config.env` は不要）。

```bash
vercel-deploy frontend/apps/lp --dry-run   # 計画だけ（Vercel へ 1 件も送らない）
vercel-deploy frontend/apps/lp             # project 作成（GitHub 連携 + rootDirectory）→ env → デプロイ
vercel-deploy frontend/apps/lp --no-deploy # project と env だけ。以降の配信は git push に任せる
```

トークンは **Doppler の `VERCEL_TOKEN`**（devenv shell 進入時にロード済み）。
GitHub repo を紐付けられるのは **project 作成時だけ**なので、「project は在るが repo 未接続」に
なったら dashboard で接続するか別名で作り直す。手順と落とし穴は
[`.claude/skills/vercel-deploy/`](../../.claude/skills/vercel-deploy/SKILL.md)。

### モバイル（EAS）のリリース

```bash
mobile-release-ios                 # expo.dev でビルド → TestFlight
mobile-release-ios --local         # ローカルビルド（EAS のビルド枠を消費しない）
mobile-release-android             # expo.dev でビルド → Play 内部テスト（--local 可）
```

資格情報（`EXPO_TOKEN` / `APPLE_*` / `PLAY_SERVICE_ACCOUNT_JSON`）は **Doppler が唯一のソース**で、
script が `doppler run` で自身を再実行して注入する。非機密の設定だけを
`scripts/mobile/config.env`（`config.example.env` からコピー）に置く。
手順・既知バグの回避策は [`.claude/skills/mobile-release/`](../../.claude/skills/mobile-release/SKILL.md)。

### マイグレーションの手動実行（push を伴わない再実行 / 任意環境への適用）

Actions タブ > **DB Migrate (Drizzle)** > **Run workflow** で、branch と `environment`
（`dev` / `staging` / `production`）を選んで実行する。CLI なら:

```bash
gh workflow run migrate.yml --ref main -f environment=production
gh run watch   # 承認待ち → GitHub 上で approve すると適用が進む
```

- production は deployment branch policy により **`main` からのみ**実行でき、required reviewers の
  **承認後に適用**される（dev / staging は承認なしで即適用）。
- 中身は push 時と同一（`devenv tasks run -P "$ENV" db:migrate-deploy`）。job summary に
  profile / trigger / ref / actor / result が残る。
- **接続先の解決**: Doppler → **GitHub ネイティブ sync** → GitHub Environment secrets → job env → task。
  ⚠️ job env では `POSTGRES_URL` ではなく **`MIGRATE_POSTGRES_URL`** という名前で渡す。devenv の
  enterShell は `set -a; . env/<svc>/.env.$ENV` を行うため、env ファイルが定義する変数は外から
  渡した同名の値を**上書きする**（実測: ENV 未指定だと 127.0.0.1:54322 に化ける）。devenv が
  触らない名前で輸送し、`db:migrate-deploy` task が最後に `POSTGRES_URL` へ反映する。
  適用前に検証ステップが解決とローカル値混入をチェックして落とす。

---

## 検証チェックリスト

- [ ] `infra-bootstrap` を2回流して重複作成が無い（冪等）。secret 値がログに出ない。
- [ ] Supabase MCP（read-only）で **1 project + persistent branch(staging/develop)** を確認。`.outputs` に ref。
- [ ] `gh api repos/<owner>/<repo>/environments/production` に required reviewers。
- [ ] `develop` にダミー commit → Vercel Preview（web + backend）が green。backend の `/healthcheck` が 200。
      **「READY」で終わらせない**（コンテナは起動に失敗しても deployment は READY になる）。
      `curl -sS -o /dev/null -w '%{http_code}\n' https://<backend-domain>/healthcheck` で実際に叩く。
- [ ] backend project の env に `PORT`（= Dockerfile の値。既定 8080）が入っている。
- [ ] `drizzle/schema` 変更を `main` に push → `migrate.yml` が production で**承認待ち**。
- [ ] 各 PaaS に Doppler 由来 env が反映（Supabase は `supabase secrets list`）。
- [ ] 既存 CI（`ci.yml`）が非回帰で green。

---

## トラブルシュート / 既知の注意

| 事象 | 対応 |
|---|---|
| Vercel preview env が CI でハング | CLI bug #15763。本構成は **REST API** で投入済み（`vercel.sh`）。手動時も API を使う。 |
| backend project が Dockerfile を検出しない / runtime が違う | ① `services.<app>` に **`"runtime": "container"`** があるか（無いと runtime 自動検出で entrypoint を module:app と誤解する）。② entrypoint の basename が **`Dockerfile.vercel` / `Containerfile.vercel` / `Dockerfile` / `Containerfile`** のいずれかか（接尾辞つきは拒否）。③ その Dockerfile が **`backend-py/` 直下**にあるか（ビルドコンテキストは Dockerfile のあるディレクトリに固定。サブディレクトリに置くと `uv.lock` が見えず落ちる）。④ service を指す **top-level rewrite** があるか（無いと成功のまま 404）。⑤ container Services（Permissions Required 機能）がアカウントで有効か。→ ①〜④は `test-backend-py` と `vercel-deploy backend-py` が事前に検査する。詳細は `docs/_research/2026-08-22-vercel-services-container-build-context.md` |
| backend が 500 / `INTERNAL_FUNCTION_INVOCATION_FAILED`（デプロイは READY） | **コンテナが起動する前に死んでいる**。①非 root コンテナが特権ポート（Vercel 既定の 80）を bind できない ②`CMD` が `$PATH` 解決に依存して exec に失敗、の 2 つが定番。**どちらもローカルの `docker run` では再現しない**。本リポジトリは `PORT=8080` + `CMD ["/app/.venv/bin/api"]` で回避済みで、`test_vercel_container_contract.py` が CI で検査する。再現手順と切り分けは `.claude/skills/vercel-deploy/references/containers.md`。 |
| backend が 502 / タイムアウト | サーバが `0.0.0.0:$PORT` で listen しているか、**Vercel project の env `PORT` がコンテナの値（8080）と一致**しているかを確認（`infra-bootstrap vercel` / `vercel-deploy backend-py` が自動投入する）。Doppler→Vercel(backend) で外部 API キーが、Marketplace 連携で `SUPABASE_URL` / `POSTGRES_URL` が届いているかも確認。 |
| ランタイムログが空で原因が分からない | パスに projectId が要る: `GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs`。**空 = 正常ではない**（起動前に死んだサイン）。dashboard の Project > Logs が最短。 |
| `wire` が backend の preview URL を取れない | team/personal の slug 取得に失敗している可能性。`VERCEL_TEAM_ID` を確認（個人アカウントは空）。best-effort のため warn のみで継続する。 |
| persistent branch 作成 API が失敗 | project の GitHub Integration(Branching) が dashboard で有効か確認（Phase 0）。CLI の git 紐付けフラグは `supabase branches create --help` で確認、確実なのは Management API の `git_branch`。 |
| branch の DB 接続が分からない | Dashboard の *Connect > Session pooler*（`*.pooler.supabase.com:5432`）を使う。`supabase --experimental branches get <branch> -o env` は **pooler の host を返さない**（直結 = IPv6 のみ。supabase/cli#4012）ので、CI 用の値としてそのまま使わない。 |
| migration が `ENETUNREACH` / `connect ETIMEDOUT` で落ちる | 接続先が直結（IPv6）になっている。GitHub の runner は IPv4 のみ。Doppler の `POSTGRES_URL` を session pooler（`*.pooler.supabase.com:5432`）に差し替える（`infra-deploy` / `infra-bootstrap wire` が自動で入れる）。 |
| migration が TLS / SSL 関連で落ちる | project の *Enforce SSL* が有効な場合は接続文字列に `?sslmode=require` を付ける（postgres-js は URL の `sslmode` を解釈する。既定は非 TLS）。 |
| migration が prepared statement 関連のエラーで落ちる | 接続先が transaction pooler（`:6543`）。同じホストの **5432**（session mode）に変える。 |
| `POSTGRES_URL` secret が空のまま | pooler 設定を取得できず、誤った値を書き込まないよう **意図的にスキップ**している（terraform の `check` が警告を出す）。branch 起動直後なら数分後に再 apply。復旧しなければ Dashboard の *Connect > Session pooler* の文字列を Doppler の該当 config に手入力する。 |
| persistent branch のコスト | long-lived は常時 compute 課金（Spend Cap 対象外）。develop を PR 時のみ preview にすればコスト減。 |
| Doppler フラグ綴り差 | `doppler ... create --help`(v3.75 で確認済み) と一致しているか確認。 |
| 本番ローンチ後 | `.claude/rules/mcp-doppler.md` の手順で Doppler を `本番(protected)` フェーズへ切替（prd 書込を service token スコープで封鎖）。 |
