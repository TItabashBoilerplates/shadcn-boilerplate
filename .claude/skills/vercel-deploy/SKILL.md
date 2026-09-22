---
name: vercel-deploy
description: "Vercel との GitHub 連携と本番/プレビューデプロイ、および **1 つの Vercel project に web（Next.js）と backend-py（FastAPI の Docker コンテナ）を Services として載せる構成（リポジトリルートの vercel.json）**の手順。「Vercel に連携して」「デプロイして」「このアプリを本番に出して」「Vercel project を作って」「vercel-deploy」「デプロイが 15000 files で落ちる」「本番 URL を env に入れたい」に加え、「backend をデプロイして」「vercel.json の services / rewrites / bindings」「runtime: container」「FastAPI のルートが 404 になる / web に吸われる」「web から backend を呼ぶ URL」「BACKEND_PY_URL」「Dockerfile が検出されない」「entrypoint が拒否される」「ビルドで uv.lock が見つからない」「デプロイは成功したのに 500 になる」「INTERNAL_FUNCTION_INVOCATION_FAILED」「コンテナが起動しない / 起動直後に落ちる」「ランタイムログが空で何も出ない」「Dockerfile.vercel を書いた・直した」「backend が 502」といった指示・症状が出たら必ず最初に起動する。Root Directory を空にしてルートの vercel.json の services に全部書く構成・rewrite の先勝ち・service binding・`--archive=tgz`・**entrypoint に使える名前とビルドコンテキストの固定**・**非 root コンテナが特権ポートを bind できない / CMD の $PATH 依存で exec に失敗する**という、ローカルでは絶対に再現しない落とし穴を踏まないためのファクトと、`vercel-deploy` script の使い方を提供する。"
---

# Vercel 連携 & デプロイ

**このリポジトリで Vercel へのデプロイを指示されたら、手で `vercel` を叩く前に必ず
`vercel-deploy` script を使うこと。** 手順・順序・回避策がすべて入っている。

```bash
vercel-deploy                          # メインの project（web + backend-py）を本番デプロイ
vercel-deploy --dry-run                # 計画と vercel.json の検査だけ（Vercel へ 1 件も送らない）
vercel-deploy --preview                # preview デプロイ
vercel-deploy frontend/apps/lp         # 独立した別 project のフロントアプリ（LP 等）
vercel-deploy frontend/apps/lp --no-deploy   # project + env だけ作り、配信は git push に任せる
```

実体は `scripts/infra/vercel_deploy.sh`。冪等なので途中で失敗しても再実行してよい。

---

## 0. 構成: 1 project + ルートの `vercel.json` の Services

**Vercel project は 1 つ。** web（Next.js）と backend-py（FastAPI コンテナ）は
[Services](https://vercel.com/docs/services) として同じ project・同じドメインに載る。

| 項目 | 値 |
|---|---|
| Vercel project | 1 つ（名前 = `APP_NAME`） |
| project の Framework Preset / Root Directory / Build・Install コマンド | **すべて空（null）** |
| 設定の正本 | **リポジトリルートの `vercel.json`**（`services` / `rewrites` / `headers` / `git`） |
| backend の URL | 同じドメインの `/api/*`（+ `/healthcheck` / `/openapi.json`） |
| web → backend（サーバー側） | **service binding** が注入する `BACKEND_PY_URL` |

```jsonc
// /vercel.json（抜粋）
{
  "services": {
    "web": {
      "root": "frontend/apps/web",
      "framework": "nextjs",
      "installCommand": "cd ../.. && bun install",           // frontend/（bun workspace ルート）へ戻る
      "buildCommand": "cd ../.. && turbo build --filter=@workspace/web",
      "functions": { "app/**/route.ts": { "maxDuration": 30 } },
      "bindings": [{ "type": "service", "service": "api", "format": "url", "env": "BACKEND_PY_URL" }]
    },
    "api": { "runtime": "container", "root": "backend-py", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [
    { "source": "/healthcheck",  "destination": { "service": "api" } },
    { "source": "/openapi.json", "destination": { "service": "api" } },
    { "source": "/api/(.*)",     "destination": { "service": "api" } },
    { "source": "/(.*)",         "destination": { "service": "web" } }   // catch-all は必ず末尾
  ]
}
```

### 守ること（外すとローカルでは何も起きず、本番だけが壊れる）

| # | 不変条件 | 外すと | 検査 |
|---|---|---|---|
| 1 | **project の Root Directory は空**。framework も空 | ルートの `vercel.json` が読まれず services が無視される | `vercel.sh` / Terraform / `vercel-deploy` が null に揃える |
| 2 | `framework` / `buildCommand` / `functions` 等は **service の中**に書く。トップレベルに残すのは `rewrites` / `headers` / `git` 等 | 公式の決まり。トップレベルに置いた build 設定は services と両立しない | — |
| 3 | **rewrite は先勝ち**。`/(.*)` → web は**末尾** | 上にあると backend が全部 web に吸われる | `frontend/apps/web/src/shared/config/vercel-routing.test.ts` |
| 4 | **FastAPI のルートは `/api/...` の下**（`APIRouter(prefix="/api/...")`）。Vercel は接頭辞を外さない | `/users` のようなルートは web に吸われて 404 | `backend-py/apps/api/tests/test_vercel_routing.py` |
| 5 | **web に `app/api/**` の Route Handler を置かない** | `/api/(.*)` で FastAPI に吸われて 404 | `vercel-routing.test.ts` |
| 6 | **service は既定で非公開**。公開する service は top-level rewrite で必ず指す | デプロイ成功なのに 404 | `test_vercel_container_config.py` / `vercel-deploy` |
| 7 | web → api の **binding** を消さない | サーバー側の `BACKEND_PY_URL` が消え、localhost へフォールバックして本番が壊れる | `vercel-routing.test.ts` |
| 8 | Services は **Permissions Required（🔒）** 機能。team で有効化されている必要がある | project 作成・デプロイが失敗する | — |

### backend を呼ぶ URL（経路ごとに違う）

| 経路 | 使う URL | 実装 |
|---|---|---|
| web のサーバー側（Server Component / Server Action / Route Handler） | **`BACKEND_PY_URL`**（binding が注入する絶対 URL。内部通信で CORS も firewall も挟まらない。preview では同じ preview の api に向く） | `frontend/apps/web/src/shared/api/backend.ts` / `@workspace/api-client` |
| web のブラウザ側 | **相対 URL**（同一オリジン）。binding は runtime 専用なので `NEXT_PUBLIC_*` に焼けない | `@workspace/api-client` の `resolveBaseUrl` |
| mobile / desktop / ローカル開発 | `NEXT_PUBLIC_BACKEND_PY_URL` / `EXPO_PUBLIC_BACKEND_PY_URL`（= アプリの公開ドメイン） | Doppler（`wire.sh` / Terraform が配る） |

> ⚠️ **Vercel の env に `NEXT_PUBLIC_BACKEND_PY_URL` を入れない。** 入れるとブラウザ側が絶対 URL を
> 使い、**preview の web が本番の api を叩く**。

---

## ⚠️ 資格情報は Doppler が唯一のソース

**このリポジトリでは、トークン・API キー・シークレットの類はすべて Doppler にある。**
`.env` ファイルにも、`config.env` にも、コード中にも書かない。

| 何を | どこから来るか |
|---|---|
| **Vercel の API トークン** | **Doppler の `all` project の `VERCEL_TOKEN`**。`devenv shell` 進入時に `loadDopplerByEnv` が env へ載せるので、`vercel-deploy` は何もせず拾える |
| Vercel project の **runtime secret**（外部 API キー等） | **Doppler → Vercel のネイティブ連携（sync）**。**`--env` で入れない** |
| **Supabase の接続情報** | **Vercel Marketplace の Supabase 連携**（または Terraform）が注入する。Doppler にも手でも入れない |
| 本番 URL 等の**生成値** | `vercel-deploy` が実測して投入する（`NEXT_PUBLIC_APP_URL`） |
| コンテナの listen ポート `PORT` | `Dockerfile.vercel` の `ENV PORT` を読んで投入する（`vercel.sh` / `vercel-deploy` / Terraform） |

`VERCEL_TOKEN` は vercel CLI が読む名前そのもの（`.claude/rules/env-naming.md` §4）。これを置く
`all` project は native sync を張っていないので `VERCEL_` prefix の制約はかからない。
**Terraform provider だけが `VERCEL_API_TOKEN` を読む**ので `scripts/infra/tf.sh` の `bridge_env` が写す。

token 解決の順: ① `VERCEL_TOKEN`（Doppler 由来）② `vercel login` 済み CLI の `auth.json`（最後の手段）。
**新しいトークンを勝手に発行しない。値をチャット / ログ / コミット / PR に出さない。**

---

## 1. プロビジョニング経路（取り違えない）

| 経路 | 何をするか | いつ使うか |
|---|---|---|
| `infra-deploy`（Terraform `terraform/modules/vercel`） | **1 project** を作り、Supabase の env と `PORT` を書く | 実プロジェクトを起こす初期構築（推奨） |
| `infra-bootstrap`（`scripts/infra/vercel.sh`） | 同じく **1 project**（Root Directory / framework = null）+ `PORT` + 静的 env | Terraform を使わない初期構築 |
| **`vercel-deploy`**（`scripts/infra/vercel_deploy.sh`） | services モード: メインの project を検査してデプロイ / framework モード: 別 project のアプリを追加 | **手で本番へ出す / アプリを後から足す**（＝ふだんの「デプロイして」） |

**`frontend/apps/web` と `backend-py` を単独の project として出すことはできない**（ルートの
`vercel.json` の service なので `vercel-deploy` が止める）。旧構成（web / backend の 2 project、
それぞれの Root Directory に `vercel.json`）から来た場合は、`vercel.sh` か Terraform を流すと
メインの project の Root Directory が空に戻る。**旧 backend project は手で削除する**
（同じ repo を監視し続け、無駄にビルドが走る）。

---

## 2. 事前に確認すること（プリフライト）

```bash
vercel --version           # devenv script（bunx 経由）。入っていることの確認
vercel whoami              # ログイン済みか。未ログインなら `vercel login`
vercel-deploy --dry-run    # vercel.json の検査（services / rewrite / Dockerfile）と計画
```

- **`vercel project ls` が "No projects found" でも鵜呑みにしない。** scope（team）が違うと
  そう見える。実態は REST API（`GET /v9/projects`）か dashboard で確認する。
- `vercel-deploy` は既定で `build-frontend`（container service があれば `test-backend-py` も）を
  実行してから進む（`--skip-build-check` で省略可）。**壊れたものをデプロイして枠と時間を無駄にしないため**。
- **Vercel GitHub App が対象 repo に install 済み**であること（dashboard で一度きり）。
  未 install だと project 作成の `gitRepository` 紐付けが失敗する。

---

## 3. script が行うこと（＝手でやる場合の正しい順序）

1. **モード判定** — 引数なし = services（ルートの `vercel.json`）/ `frontend/apps/<name>` = framework。
2. **`vercel.json` の検査**（Vercel へ送る前）— services モードは §4、framework モードは §5。
3. **token / scope 解決** — `VERCEL_TEAM_ID` があればそれ、無ければ `GET /v2/teams`。
   **team が複数あるときは自動で選ばず止まる**（誤った team に作ると名前が予約されて厄介）。
4. **ローカル確認** — `build-frontend`（+ `test-backend-py`）。
5. **project の作成 / 確認** — `POST /v11/projects`（`gitRepository` 付き）。既存なら
   `PATCH /v9/projects` で Root Directory / framework を冪等に再保証（services モードは null）。
6. **本番ドメインの実測** — `GET /v9/projects/{name}/domains?target=production`（§6）。
7. **env の投入** — 本番 URL を `NEXT_PUBLIC_APP_URL` に（`--url-env-key` で変更・`none` で無効）、
   container service があれば `PORT`、追加は `--env KEY=VALUE`。`upsert=true` で再実行可。
8. **link → deploy** — リポジトリルートで `vercel link`、`vercel deploy --prod --archive=tgz`。
9. **疎通確認** — 本番 URL に curl して HTTP ステータスを表示。

`vercel project add` には Root Directory を指定・解除するフラグが無く、`vercel env add <name> preview`
は `--yes` を付けても git branch を対話で聞く（[vercel/vercel#15763](https://github.com/vercel/vercel/issues/15763)）。
そのため作成と env は REST API、link / deploy は CLI を使う。

---

## 4. services の検査（services モード）

| service | 検査 |
|---|---|
| framework（`web`） | `root` が実在する / `installCommand` の `cd <dir>` の行き先に `bun.lock` がある（service root 配下には lockfile も `turbo.json` も無い） |
| container（`api`） | entrypoint の basename / Dockerfile の実在 / コンテキストに `uv.lock` / `.dockerignore` |
| 共通 | その service を指す top-level rewrite がある / rewrites の末尾が catch-all |

### container service の制約（公式ドキュメントに書かれていない）

いずれも Vercel の実装ソースで確定している。外すと**ローカルでは何も起きないまま本番のビルドだけが落ちる**:

1. **entrypoint の basename は 4 つだけ** — `Dockerfile.vercel` / `Containerfile.vercel` /
   `Dockerfile` / `Containerfile`（`fs-detectors/src/services/resolve-v2.ts` の
   `CONTAINER_ENTRYPOINT_CANDIDATES`）。接尾辞つきは "never matched"。
2. **ビルドコンテキストは常に `dirname(Dockerfile)`**（`packages/container/src/index.ts` の
   `contextDir = path.dirname(dockerfilePath)`）。`root` でも Root Directory でも変えられない。
   uv 公式は workspace のビルドに全 member の `pyproject.toml` を要求するので、
   **Dockerfile は workspace ルート（`backend-py/`）に置くしかない**。project の Root Directory が
   リポジトリルートでも、Dockerfile の場所で決まるので `backend-py/` がコンテキストになる。
3. **1 ディレクトリに最大 4 コンテナ**（blessed 名が 4 つ）。対応表は `Dockerfile.vercel` 冒頭と
   `backend-py/README.md`。5 つ目が要るときは**ユーザーに確認する**。
4. **`PORT` は project に 1 つ**。container service はすべて同じポート（8080）で listen する。

**詳細・症状別の原因表・出典は [references/services-container.md](references/services-container.md)。
コンテナを触るなら必ずそちらを読む。**

---

## 5. 独立した別 project のアプリ（framework モード）

LP のように**別ドメイン・別 project で出したいアプリ**だけがこのモード。`<app>/vercel.json` が必須:

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "cd ../.. && turbo build --filter=@workspace/<pkg>",
  "installCommand": "cd ../.. && bun install",
  "outputDirectory": ".next"
}
```

project の Root Directory は `frontend/apps/<name>`。`vercel-deploy` は無ければこの雛形を出して止まる。
**同じドメインに載せたいなら、別 project にせずルートの `vercel.json` に service を足す**
（rewrite を catch-all より前に置く）。

---

## 6. 本番 URL は推測せず実測する

canonical / sitemap / OG 画像 / メールのリンクに焼き込まれるため、URL を 1 文字間違えると
本番の SEO と導線が壊れる。**env に入れる前に必ずドメインを API で取得する**。

```bash
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/<project>/domains?target=production&limit=1&teamId=$VERCEL_TEAM_ID" \
  | jq -r '.domains[0].name'
```

---

## 7. 既存 project に GitHub repo を後から繋ぐ REST API は無い

git repository を紐付けられるのは **`POST /v11/projects`（作成時）だけ**。
`PATCH /v9/projects/{idOrName}` の body に `gitRepository` は無い。
「project は在るが repo 未接続」なら dashboard の Project > Settings > Git > **Connect Git Repository**
で接続するか、`--project <別名>` で作り直す。`vercel-deploy` はこの状態を検知して**止まる**。

---

## 8. `files should NOT have more than 15000 items`

モノレポ全体をアップロードするとファイル数が Vercel の上限を超える。
**公式の回避策が `--archive=tgz`**（`vercel-deploy` は常に付けている）。

---

## 9. `.gitignore` を汚さない

`vercel link` は `.gitignore` に `.vercel` を追記するが、本リポジトリは既に `**/.vercel/` を無視している。
`vercel-deploy` は link 前後で `.gitignore` を比較し、増えていたら元に戻す。
手で `vercel link` した場合は `git diff .gitignore` を確認して戻すこと。

---

## 10. env に入れてよいもの / いけないもの

| 値 | どこから来るか |
|---|---|
| **runtime secret**（外部 API キー等） | **Doppler → Vercel のネイティブ連携**。`--env` で入れない |
| **Supabase の接続情報** | **Vercel Marketplace の Supabase 連携**（または Terraform）。Doppler に置かない |
| 本番 URL 等の生成値 | `vercel-deploy` が投入（`NEXT_PUBLIC_APP_URL`） |
| `PORT` | Dockerfile から読んで自動投入 |
| `BACKEND_PY_URL` | **service binding が注入する**。手で入れない |
| `NEXT_PUBLIC_BACKEND_PY_URL` | **Vercel には入れない**（§0）。mobile / desktop 用に Doppler だけ |
| 静的な非機密 config | `--env KEY=VALUE` |

**`VERCEL_` prefix のキーは作れない**（Vercel の system 予約）。`vercel-deploy` は `VERCEL_*` / `SUPABASE_*` を弾く。

---

## 11. Docker コンテナ（api）が起動しないとき

| 症状 | 原因 |
|---|---|
| デプロイは READY なのに 500（`INTERNAL_FUNCTION_INVOCATION_FAILED`） | 非 root コンテナが特権ポート（既定の 80）を bind できない / `CMD` が `$PATH` 解決に依存して exec に失敗 |
| ランタイムログが空のまま何も出ない | **起動する前に死んでいる**サイン。ログを掘っても何も出ない |

守ること（`backend-py/apps/api/tests/test_vercel_container_contract.py` が CI で検査する）:

1. `ENV PORT` は **1024 以上**（本リポジトリは 8080）。**Vercel project の env `PORT` も同じ値**。
2. `CMD` は **絶対パス**（`["/app/.venv/bin/api"]`）。`CMD ["api"]` は Vercel 上で exec に失敗する。
3. **push する前にローカルで「Vercel 相当」を再現**して起動を確認する:

```bash
cd backend-py && docker build -f Dockerfile.vercel -t api-vercel .
docker run --rm -p 8080:8080 \
  -e PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
  --sysctl net.ipv4.ip_unprivileged_port_start=1024 api-vercel
curl -fsS localhost:8080/healthcheck
```

4. **デプロイ後は必ず叩く**（`https://<domain>/healthcheck`）。「READY」は「動いている」ではない。

→ 切り分け順序・**ランタイムログの正しい取り方**は [references/containers.md](references/containers.md)

---

## 12. トラブルシュート

| 症状 | 原因 / 対処 |
|---|---|
| services が無視され、web だけ（または何も）ビルドされない | project の Root Directory が残っている。`vercel-deploy` / `vercel.sh` で null に戻す |
| FastAPI のルートが本番だけ 404（HTML が返る） | `/api` の外にルートがある / catch-all が上にある（§0 の 3・4） |
| web の Route Handler が本番だけ 404（JSON が返る） | `app/api/**` に置いている（§0 の 5） |
| web のサーバー側から backend に繋がらない / localhost に行く | binding が無い、または `BACKEND_PY_URL` を読んでいない（§0） |
| preview の web が本番の api を叩いている | Vercel の env に `NEXT_PUBLIC_BACKEND_PY_URL` が入っている。削除する |
| project 作成が失敗する | Vercel GitHub App が未 install / project 名が重複 / Services が team で未有効 |
| `files should NOT have more than 15000 items` | `--archive=tgz`（§8） |
| ビルドが「lockfile が無い」で落ちる | service の `installCommand` が `cd ../..` していない（§4） |
| 疎通確認が 401 | Deployment Protection が有効。dashboard の Settings > Deployment Protection |
| コンテナが 500 / `INTERNAL_FUNCTION_INVOCATION_FAILED` | §11。非 root × 特権ポート / `CMD` の `$PATH` 依存 |
| ランタイムログが空で取れない | パスに projectId が要る: `GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs`。空のときは「起動前に死んだ」を先に疑う |
| ビルドが `uv.lock: not found` で落ちる | Dockerfile がコンテキスト外を参照。workspace ルートへ移す（§4-2） |
| `entrypoint` が拒否される | basename が blessed 名でない（§4-1） |
| container のデプロイは成功するのに 502 | `$PORT` で listen していない / `127.0.0.1` にバインドしている / env の `PORT` がズレている |
| `vercel project ls` に何も出ない | scope 違い。`--team <slug>` を明示 |

---

## 13. 完了報告に必ず含めること

- 作成/更新した **project 名と scope**、接続した **GitHub repo**
- **モード**（services / framework）と、services なら検査した service の一覧
- 投入した **env のキー名**（値は出さない）
- **本番 URL と疎通確認の HTTP ステータス**（services なら `/healthcheck` も）
- 残っている手作業（Supabase 連携 / Deployment Protection / 旧 project の削除 等）

---

## 参照

- REST API のエンドポイントと curl 例: [references/rest-api.md](references/rest-api.md)
- **Services とコンテナ（配置 / 名前 / ビルドコンテキスト / ルーティング / 複数サービス）**: [references/services-container.md](references/services-container.md)
- **コンテナが起動しない（デプロイ成功なのに 500）の切り分け**: [references/containers.md](references/containers.md)
- 公式: [Services](https://vercel.com/docs/services) / [Services routing](https://vercel.com/docs/services/routing) / [Container Images](https://vercel.com/docs/functions/container-images)
- 初期構築の全体像: `docs/deployment/README.md`
- env / secret の命名規約: `.claude/rules/env-naming.md`
