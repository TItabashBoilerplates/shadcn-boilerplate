---
name: vercel-deploy
description: Vercel との GitHub 連携（repo 接続 + rootDirectory 設定）と、それを使った本番/プレビューデプロイ、および **Docker コンテナ（Services / Container Images = backend-py）のビルドと起動の切り分け**の手順。「Vercel に連携して」「デプロイして」「このアプリを本番に出して」「Vercel project を作って」「vercel-deploy」「デプロイが 15000 files で落ちる」「本番 URL を env に入れたい」に加え、**backend-py（FastAPI / uv workspace）をコンテナとして出す場合も対象**で、「backend をデプロイして」「Dockerfile が検出されない」「entrypoint が拒否される」「ビルドで uv.lock が見つからない」「vercel.json の services / runtime: container」「デプロイは成功したのに 500 になる」「INTERNAL_FUNCTION_INVOCATION_FAILED」「コンテナが起動しない / 起動直後に落ちる」「ランタイムログが空で何も出ない」「Dockerfile.vercel を書いた・直した」「backend が 502」といった指示・症状が出たら必ず最初に起動する。モノレポ（frontend/apps/*）の rootDirectory 設定・`--archive=tgz`・**entrypoint に使える名前とビルドコンテキストの固定**・**非 root コンテナが特権ポートを bind できない / CMD の $PATH 依存で exec に失敗する**という、ローカルでは絶対に再現しない落とし穴を踏まないためのファクトと、`vercel-deploy` script の使い方を提供する。
---

# Vercel 連携 & デプロイ

**このリポジトリで Vercel へのデプロイを指示されたら、手で `vercel` を叩く前に必ず
`vercel-deploy` script を使うこと。** 手順・順序・回避策がすべて入っている。

```bash
vercel-deploy                          # frontend/apps/web を本番デプロイ
vercel-deploy frontend/apps/lp         # 任意のアプリ
vercel-deploy frontend/apps/lp --dry-run     # 計画だけ（Vercel へ 1 件も送らない）
vercel-deploy frontend/apps/lp --no-deploy   # project + env だけ作り、配信は git push に任せる
vercel-deploy frontend/apps/lp --preview     # preview デプロイ
```

実体は `scripts/infra/vercel_deploy.sh`。冪等なので途中で失敗しても再実行してよい。

---

## ⚠️ 資格情報は Doppler が唯一のソース（最初に理解すること）

**このリポジトリでは、トークン・API キー・シークレットの類はすべて Doppler にある。**
`.env` ファイルにも、`config.env` にも、コード中にも書かない。

| 何を | どこから来るか |
|---|---|
| **Vercel の API トークン** | **Doppler の bootstrap config の `VERCEL_TOKEN`**。`devenv shell` 進入時に `loadDopplerByEnv` が env へ載せるので、`vercel-deploy` は何もせず拾える |
| Vercel project の **runtime secret**（外部 API キー等） | **Doppler → Vercel のネイティブ連携（sync）** が Vercel の Environment Variables へ fan-out する。**`--env` で入れない** |
| **Supabase の接続情報** | **Vercel Marketplace の Supabase 連携**が自動注入する。Doppler にも Vercel にも手で入れない |
| 本番 URL 等の**生成値** | `vercel-deploy` が実測して投入する（`NEXT_PUBLIC_APP_URL`） |

### キー名が `VERCEL_TOKEN` である理由

**Doppler のキー名は「そのツールが実際に読む名前」に揃える**（`.claude/rules/env-naming.md` §4）。
`VERCEL_TOKEN` は vercel CLI が読む名前そのものなので、この script は読み替えなしで拾える。

このトークンを置く `all` project は native sync を張っていないため、`VERCEL_` prefix の制約
（sync 先が予約している prefix は使えない、という §1 の制約）はかからない。
**Terraform provider だけが `VERCEL_API_TOKEN` を読む**ので、そこだけ `scripts/infra/tf.sh` の
`bridge_env` がプロセス内で写す。

### token 解決の優先順（script の実装）

1. `VERCEL_TOKEN`（**通常はこれ。Doppler 由来**）
2. `VERCEL_TOKEN`（CI の慣例名。プロセス env なので許容）
3. `vercel login` 済み CLI の `auth.json`（**Doppler が使えないときの最後の手段**）

**新しいトークンを勝手に発行しない。値をチャット / ログ / コミット / PR に出さない**
（会話はキー名だけで行う）。Doppler への書き込みが必要なら `doppler` MCP 経由・フェーズ制に従う
（`.claude/rules/mcp-doppler.md`）。

---

## 0. 2 つのプロビジョニング経路（取り違えない）

| 経路 | 何をするか | いつ使うか |
|---|---|---|
| `infra-bootstrap`（`scripts/infra/vercel.sh`） | **web + backend の 2 project を固定で**作る。config.env + Doppler bootstrap トークンが前提 | リポジトリから**実プロジェクトを起こす初期構築** |
| **`vercel-deploy`**（`scripts/infra/vercel_deploy.sh`） | **アプリ 1 つ**を project 化してデプロイ。config.env 不要 | **アプリを後から足す / 手で本番へ出す**（＝ふだんの「デプロイして」） |

「デプロイして」「Vercel と連携して」という指示は、ほぼ常に後者。

---

## 1. 事前に確認すること（プリフライト）

```bash
vercel --version           # devenv script（bunx 経由）。入っていることの確認
vercel whoami              # ログイン済みか。未ログインなら `vercel login`
find . -name .vercel -type d -not -path "*/node_modules/*"   # 既存リンクの有無
```

- **`vercel project ls` が "No projects found" でも鵜呑みにしない。** scope（team）が違うと
  そう見える。実態は REST API（`GET /v9/projects`）か dashboard で確認する。
- ローカルビルドが通ることを先に確認する。`vercel-deploy` は既定で `build-frontend` を
  実行してから進む（`--skip-build-check` で省略可）。**壊れたものをデプロイして枠と時間を
  無駄にしないため**。

### 手作業が必要な前提（自動化できない）

**Vercel GitHub App が対象 repo に install 済み**であること（dashboard で一度きり）。
未 install だと project 作成の `gitRepository` 紐付けが失敗する。

---

## 2. script が行うこと（＝手でやる場合の正しい順序）

1. **token 解決** — `VERCEL_TOKEN` → `VERCEL_TOKEN` → `vercel login` 済み CLI の `auth.json`。
   値はログに出さない。新しいトークンを勝手に発行しない。
2. **scope 解決** — `VERCEL_TEAM_ID` があればそれ、無ければ `GET /v2/teams`。
   **team が複数あるときは自動で選ばず止まる**（誤った team に作ると名前が予約されて厄介）。
3. **`<app>/vercel.json` の存在確認** — 無ければ落とす（§4）。
4. **project の作成 / 確認** — `POST /v11/projects`（`rootDirectory` + `gitRepository`）。
   既存なら `rootDirectory` を PATCH で冪等に再保証。
5. **本番ドメインの実測** — `GET /v9/projects/{name}/domains?target=production`。
   **URL を推測しない**（§5）。
6. **env の投入** — 本番 URL を `NEXT_PUBLIC_APP_URL` に（`--url-env-key` で変更・`none` で無効）、
   追加は `--env KEY=VALUE`。`upsert=true` なので再実行しても 403 にならない。
7. **link → deploy** — リポジトリルートで `vercel link`、`vercel deploy --prod --archive=tgz`。
8. **疎通確認** — 本番 URL に curl して HTTP ステータスを表示。

---

## 3. なぜ project 作成だけ REST API なのか（CLI を避ける理由）

- **`vercel project add` に `rootDirectory` を指定するフラグが無い。** モノレポでは
  rootDirectory 無しのビルドは必ず壊れる。
- `vercel env add <name> preview` は `--yes` / `--force` / `--non-interactive` を付けても
  **git branch を対話で聞いてくる**（[vercel/vercel#15763](https://github.com/vercel/vercel/issues/15763)、
  公式 issue の回避策も「REST API を使う」）。

`link` / `deploy` は CLI の方が確実なので CLI を使う。**「CLI 全般が使えない」という話ではない。**

---

## 4. モノレポでは `<app>/vercel.json` が必須

rootDirectory（`frontend/apps/<name>`）の配下には `bun.lock` も `turbo.json` も無い。
install / build をリポジトリルートへ戻さないとビルドが落ちる。

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "cd ../.. && turbo build --filter=@workspace/<pkg>",
  "installCommand": "cd ../.. && bun install",
  "outputDirectory": ".next"
}
```

`frontend/apps/web/vercel.json` が既存の実例。`vercel-deploy` は無ければこの雛形を出して止まる。

> **container モードは対象外。** `runtime: "container"` の service は install / build コマンドを
> 使わない（Dockerfile が全部やる）ので、この検査は走らない。代わりに §4.5 の検査が走る。

**link とデプロイをリポジトリルートで行うのも同じ理由**（`cd ../..` がリポジトリルートに
届く必要があるので、アップロードの起点もルートでなければならない）。

---

## 4.5 backend-py をコンテナで出す場合（`services` + `runtime: "container"`）

```bash
vercel-deploy backend-py              # これで通る（--dry-run で計画だけ確認できる）
```

`vercel-deploy` は `<app>/vercel.json` を見て **framework モード / container モード**を
自動判別する。container モードでは検査もローカル確認も env の既定も切り替わる（§4.6）。

Next.js アプリと違い、backend は **`services` から Dockerfile を建てる**。ここは
**公式ドキュメントに書かれていない制約が 3 つ**あり、外すと**ローカルでは何も起きないまま
本番のビルドだけが落ちる**（いずれも Vercel の実装ソースで確定）:

1. **entrypoint の basename は 4 つだけ** — `Dockerfile.vercel` / `Containerfile.vercel` /
   `Dockerfile` / `Containerfile`（`fs-detectors/src/services/resolve-v2.ts` の
   `CONTAINER_ENTRYPOINT_CANDIDATES`）。接尾辞つきは "never matched"。
   **公式ドキュメントに載っているのは先頭 2 つだけ。**
2. **ビルドコンテキストは常に `dirname(Dockerfile)`**（`packages/container/src/index.ts` の
   `contextDir = path.dirname(dockerfilePath)`）。`root` でも Root Directory でも変えられない。
   uv 公式は workspace のビルドに全 member の `pyproject.toml` を要求するので、
   **Dockerfile は workspace ルートに置くしかない**。
3. **service は既定で非公開。** top-level `rewrites` が無いとデプロイは成功したまま 404。

```jsonc
// backend-py/vercel.json（Root Directory = backend-py / Dockerfile = backend-py/Dockerfile.vercel）
{
  "services": {
    "api": { "runtime": "container", "root": ".", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [{ "source": "/(.*)", "destination": { "service": "api" } }]
}
```

**モノレポで複数アプリを出せる**: blessed 名が 4 つあるので 1 ディレクトリにつき最大 4 サービス。
`Dockerfile.vercel` → 1 つ目、`Containerfile.vercel` → 2 つ目、以下同様。名前からアプリが
読み取れないので**対応表を Dockerfile 冒頭と README に必ず書く**。5 つ目が要るときは
別ディレクトリか別 project になるので**ユーザーに確認する**。

## 4.6 container モードで変わること

| 観点 | framework | container |
|---|---|---|
| `vercel.json` の検査 | `installCommand` がルートへ戻っているか | blessed 名 / Dockerfile の実在 / コンテキストに `uv.lock` / rewrite の有無 |
| ローカル確認 | `build-frontend` | `test-backend-py` |
| 本番 URL の env | `NEXT_PUBLIC_APP_URL` | `none`（backend は `NEXT_PUBLIC_*` を読まない） |
| project 名 | `[APP_NAME-]<dir>` | `VERCEL_BACKEND_PROJECT` があればそれ |

イメージ自体はローカル確認では焼かれない。Vercel と同条件で焼くなら
`docker build -f backend-py/Dockerfile.vercel backend-py`。

**詳細・症状別の原因表・出典は [references/services-container.md](references/services-container.md)。
コンテナを触るなら必ずそちらを読む。**

## 5. 本番 URL は推測せず実測する

canonical / sitemap / OG 画像 / メールのリンクに焼き込まれるため、URL を 1 文字間違えると
本番の SEO と導線が壊れる。**env に入れる前に必ずドメインを API で取得する**。

```bash
# 実測（script が内部でやっていること）
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/<project>/domains?target=production&limit=1&teamId=$VERCEL_TEAM_ID" \
  | jq -r '.domains[0].name'
```

---

## 6. 既存 project に GitHub repo を後から繋ぐ REST API は無い

git repository を紐付けられるのは **`POST /v11/projects`（作成時）だけ**。
`PATCH /v9/projects/{idOrName}` の body に `gitRepository` は無く、公開された link
エンドポイントも存在しない。

したがって「project は在るが repo 未接続」に出くわしたら:

1. dashboard の Project > Settings > Git > **Connect Git Repository** で接続する、または
2. `--project <別名>` で作り直す

`vercel-deploy` はこの状態を検知して**止まる**（黙って repo 未接続のままデプロイしない）。

---

## 7. `files should NOT have more than 15000 items`

モノレポ全体をアップロードするとファイル数が Vercel の上限を超える。
**公式の回避策が `--archive=tgz`**（`vercel-deploy` は常に付けている）。

```bash
vercel deploy --prod --yes --archive=tgz
```

> `--archive` はソースファイルのアップロードキャッシュを無効化するので、
> ケースによっては遅くなる。それでもファイル数上限を踏むよりはよい。

---

## 8. `.gitignore` を汚さない

`vercel link` は `.gitignore` に `.vercel` を追記するが、本リポジトリは既に
`**/.vercel/` を無視している（**重複した差分が出るだけ**）。
`vercel-deploy` は link 前後で `.gitignore` を比較し、増えていたら元に戻す。

手で `vercel link` した場合は `git diff .gitignore` を確認して戻すこと。

---

## 9. env に入れてよいもの / いけないもの

| 値 | どこから来るか |
|---|---|
| **runtime secret**（外部 API キー等） | **Doppler → Vercel のネイティブ連携**。`--env` で入れない |
| **Supabase の接続情報** | **Vercel Marketplace の Supabase 連携が自動注入**。手で入れない・Doppler にも置かない |
| 本番 URL 等の生成値 | `vercel-deploy` が投入（`NEXT_PUBLIC_APP_URL`） |
| 静的な非機密 config | `--env KEY=VALUE` |

**`VERCEL_` prefix のキーは作れない**（Vercel の system 予約）。
詳細は `.claude/rules/env-naming.md`。`vercel-deploy` は `VERCEL_*` を弾く。

---

## 9.5. Docker コンテナ（backend-py）を載せるとき

`backend-py` は Next.js ではなく **Vercel Services + Container Images**（`vercel.json` の
`services` + workspace ルート直下の Dockerfile）で動く。ここには **frontend と全く別の
落とし穴**があり、しかも **ローカルでは 100% 再現しない**:

| 症状 | 原因 |
|---|---|
| デプロイは READY なのに 500（`INTERNAL_FUNCTION_INVOCATION_FAILED`） | 非 root コンテナが特権ポート（既定の 80）を bind できない / `CMD` が `$PATH` 解決に依存して exec に失敗 |
| ランタイムログが空のまま何も出ない | **起動する前に死んでいる**サイン。ログを掘っても何も出ない |

守ること（`backend-py/apps/api/tests/test_vercel_container_contract.py` が CI で検査する）:

1. `ENV PORT` は **1024 以上**（本リポジトリは 8080）。**Vercel project の env `PORT` も同じ値**に揃える
   （`scripts/infra/vercel.sh` が Dockerfile から読んで自動投入する）。
2. `CMD` は **絶対パス**（`["/app/.venv/bin/api"]`）。`CMD ["api"]` は Vercel 上で exec に失敗する。
3. **push する前にローカルで「Vercel 相当」を再現**して起動を確認する:

```bash
cd backend-py && docker build -f Dockerfile.vercel -t api-vercel .
docker run --rm -p 8080:8080 \
  -e PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
  --sysctl net.ipv4.ip_unprivileged_port_start=1024 api-vercel
curl -fsS localhost:8080/healthcheck
```

4. **デプロイ後は必ず叩く**。「READY」は「動いている」ではない。

→ 原因の詳細・切り分け順序・**ランタイムログの正しい取り方**は
  [references/containers.md](references/containers.md)

---

## 10. トラブルシュート

| 症状 | 原因 / 対処 |
|---|---|
| project 作成が失敗する | Vercel GitHub App が repo に未 install / project 名が他 team で重複 |
| `files should NOT have more than 15000 items` | `--archive=tgz`（§7） |
| ビルドが「lockfile が無い」で落ちる | `<app>/vercel.json` の install/build が `cd ../..` していない（§4） |
| デプロイは成功するのに 404 | rootDirectory が違う。`PATCH /v9/projects/{name}` で再設定（script が冪等に行う） |
| 疎通確認が 401 | Deployment Protection が有効。dashboard の Settings > Deployment Protection |
| コンテナが 500 / `INTERNAL_FUNCTION_INVOCATION_FAILED` | §9.5。非 root × 特権ポート / `CMD` の `$PATH` 依存。→ [references/containers.md](references/containers.md) |
| ランタイムログが空で取れない | パスに projectId が要る: `GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs`。空のときは「起動前に死んだ」を先に疑う |
| `vercel project ls` に何も出ない | scope 違い。`--team <slug>` を明示（§1） |
| team が複数あって止まる | 意図した team を `--team <slug>` で指定 |
| ビルドが `uv.lock: not found` で落ちる | container: Dockerfile がコンテキスト外を参照。workspace ルートへ移す（§4.5-2） |
| `entrypoint` が拒否される | container: basename が blessed 名でない（§4.5-1） |
| container のデプロイは成功するのに 404 | service を指す top-level rewrite が無い（§4.5-3） |
| container のデプロイは成功するのに 502 | `$PORT`（既定 80）で listen していない / `127.0.0.1` にバインドしている |

---

## 11. 完了報告に必ず含めること

- 作成/更新した **project 名と scope**
- **rootDirectory** と接続した **GitHub repo**
- 投入した **env のキー名**（値は出さない）
- **本番 URL と疎通確認の HTTP ステータス**
- 残っている手作業（dashboard での Supabase 連携 / Deployment Protection 等）

---

## 参照

- REST API のエンドポイントと curl 例: [references/rest-api.md](references/rest-api.md)
- **backend-py をコンテナで出す（配置 / 名前 / ビルドコンテキスト / モノレポで複数サービス）**: [references/services-container.md](references/services-container.md)
- **コンテナが起動しない（デプロイ成功なのに 500）の切り分け**: [references/containers.md](references/containers.md)
- 初期構築の全体像: `docs/deployment/README.md`
- env / secret の命名規約: `.claude/rules/env-naming.md`
- マイクロフロントエンド構成で複数 project を 1 ドメインに合成する場合: `vercel-microfrontends` skill
