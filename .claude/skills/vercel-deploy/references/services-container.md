# Vercel Services × コンテナ（web と backend-py を 1 project に載せる）

> 「backend をデプロイして」「FastAPI を Vercel に出して」「Dockerfile が検出されない」
> 「ビルドで `uv.lock` が見つからない」「entrypoint が拒否される」「service が 404」
> のときはここを読む。

**このファイルはビルド（配置・名前・コンテキスト）の正本。**
「ビルドは通ったのに起動しない / 500 になる」は [containers.md](containers.md) を読む。

**リポジトリルートの `vercel.json` の `services` に web（Next.js）と
api（`runtime: "container"` で Dockerfile から建てる FastAPI）を並べ、1 つの Vercel project・
同じドメインで出す**構成のガイド。project 側の Framework / Root Directory / Build コマンドは空。

---

## 0. まず結論

```bash
vercel-deploy --dry-run             # services の検査と計画（Vercel へ 1 件も送らない）
vercel-deploy                       # メインの project を本番デプロイ
```

`vercel-deploy`（引数なし）はルートの `vercel.json` の services を、下記の前提も含めて
**Vercel へ 1 件も送る前に**検査して落とす。

```
<repo>/                            ← Vercel project の Root Directory（= 空 / リポジトリルート）
├── vercel.json                    ← services / rewrites / headers / git の正本
├── frontend/apps/web/             → service "web"（root。install/build は cd ../.. で frontend/ へ）
└── backend-py/                    → service "api" の root
    ├── Dockerfile.vercel          ← entrypoint（ビルドコンテキスト = backend-py/）
    ├── .dockerignore              ← ★ Dockerfile と同じディレクトリでないと読まれない
    ├── uv.lock / pyproject.toml
    ├── apps/{api,mcp}/
    └── packages/core/
```

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "web": { "root": "frontend/apps/web", "framework": "nextjs", /* install / build / functions */
             "bindings": [{ "type": "service", "service": "api", "format": "url", "env": "BACKEND_PY_URL" }] },
    "api": { "runtime": "container", "root": "backend-py", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [
    { "source": "/healthcheck",  "destination": { "service": "api" } },
    { "source": "/openapi.json", "destination": { "service": "api" } },
    { "source": "/api/(.*)",     "destination": { "service": "api" } },
    { "source": "/(.*)",         "destination": { "service": "web" } }
  ]
}
```

CI の検査（**消さない**。どれも壊れてもローカルでは一切顕在化しない）:

| テスト | 見ているもの |
|---|---|
| `backend-py/apps/api/tests/test_vercel_container_config.py` | blessed 名・配置・ビルドコンテキスト・rewrite |
| `backend-py/apps/api/tests/test_vercel_container_contract.py` | ポート・CMD |
| `backend-py/apps/api/tests/test_vercel_routing.py` | FastAPI の全ルートが公開ドメインから api に届く |
| `frontend/apps/web/src/shared/config/vercel-routing.test.ts` | catch-all の位置・web に届くパス・binding・`app/api` の不在 |

---

## 0.5 ルーティングと service 間通信

- **rewrite は先勝ち**（[Services routing](https://vercel.com/docs/services/routing)）。catch-all
  `/(.*)` → web は**必ず末尾**。
- **Vercel は接頭辞を外さない**。`/api/users` は `/api/users` のまま FastAPI に届くので、
  FastAPI 側は `APIRouter(prefix="/api/...")` で受ける。`/api` の外に生やしたルートは web に
  吸われて 404。
- web に `app/api/**` の Route Handler を置くと、同じく FastAPI に吸われる。
- **web のサーバー側 → api は service binding**（`BACKEND_PY_URL`）。絶対 URL が runtime に注入され、
  preview では同じ preview の api に向く。公開経路を通らないので CORS も firewall も挟まらない。
  binding は **runtime 専用**でビルド時には解決しない → ブラウザ側は同一オリジンの相対 URL を使う。
- mobile / desktop など Vercel の外からは、アプリの公開ドメイン（`NEXT_PUBLIC_BACKEND_PY_URL` /
  `EXPO_PUBLIC_BACKEND_PY_URL`。Doppler）で `/api/*` を叩く。

---

## 1. 公式ドキュメントに書いていない 3 つの制約

ドキュメントは entrypoint を「the path of your dockerfile, **relative to the service's `root`**」と
書くだけで、**ファイル名の制約もビルドコンテキストの位置も書いていない**。公式例はすべて
root と Dockerfile が同じ場所なので、ドキュメントからは区別できない。実装で確定している。

### 1.1 entrypoint の basename は 4 つだけ

```ts
// vercel/vercel : packages/fs-detectors/src/services/resolve-v2.ts
const CONTAINER_ENTRYPOINT_CANDIDATES = [
  'Dockerfile.vercel',
  'Containerfile.vercel',
  'Dockerfile',
  'Containerfile',
];
// "a suffixed name like `Dockerfile.prod` is never matched"
```

`Dockerfile.api.vercel` のようにアプリ名を挟む案は成立しない。
**公式ドキュメントに載っているのは先頭 2 つだけ**なので、そこから順に使う。

### 1.2 ビルドコンテキストは常に `dirname(Dockerfile)`

```ts
// vercel/vercel : packages/container/src/index.ts
const dockerfilePath = path.join(workPath, dockerfileRel);
const contextDir = path.dirname(dockerfilePath);
```

**上書き手段が無い。** `services.<name>.root` でも Root Directory でも `.vercelignore` でも
`builds` でも変えられない。逆に言えば、**project の Root Directory をリポジトリルートにしても
コンテキストは `backend-py/` のまま**なので、1 project 構成でも Dockerfile は動かさなくてよい。

> build args だけは通る（`buildArgsFromEnv(meta?.buildEnv)` で project の build env を
> `--build-arg` として転送）。ただし**サービス単位ではない**ので、
> 「1 つの Dockerfile を build arg で切り替えて複数サービスにする」用途には使えない。

### 1.3 uv 側の要求とぶつかる

uv 公式（[Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/)）:

> uv cannot assert that the `uv.lock` file is up-to-date **without each of the workspace member
> `pyproject.toml` files**.

→ コンテキストは workspace ルートでなければならない。1.2 と合わせると、
**Dockerfile を workspace ルートに blessed 名で置く以外に解が無い。**

uv の 2 段構えもそのまま使う: 1 回目 `--frozen --no-install-workspace`（member がまだ無い）、
member を COPY した後の 2 回目は **`--locked`**（lockfile の鮮度をビルド時に検証できる）。

---

## 2. モノレポで複数アプリを出す

blessed 名が 4 つ = **1 ディレクトリにつき最大 4 サービス**。
名前からアプリが読み取れないので、対応表を Dockerfile 冒頭・README・テストで固定すること。

| ファイル | サービス |
|---|---|
| `Dockerfile.vercel` | 1 つ目 |
| `Containerfile.vercel` | 2 つ目 |
| `Dockerfile` | 3 つ目 |
| `Containerfile` | 4 つ目 |

**アプリごとに別イメージ**にする価値はここにある（`uv sync --package <app>` の絞り込みが効き、
片方の重い依存が、もう片方のイメージに入らない）。

追加するときは **service と rewrite を必ずセットで**足す（ルートの `vercel.json`。rewrite は
catch-all より前）。`rewrites` が無い service は **既定で非公開**なので、デプロイは成功したまま 404 になる。
**`PORT` は project に 1 つしか無い**ので、全コンテナを同じポート（8080）で listen させる。

5 つ目が必要になったら、別ディレクトリ（別 workspace）に Dockerfile を置く。
**代償があるので勝手に決めずユーザーに確認する。**

### 採らない案: 1 イメージ + サービスごとの `command`

実装上は通る余地があるが、`command` は**公式ドキュメントにも公開 JSON schema にも無い**。
かつ全アプリの依存が 1 イメージに同居し、コンテナを分ける目的（サイズと障害範囲の分離）を潰す。

---

## 3. `runtime: "container"` は省略しない

Container Images の Services 例は `runtime` を省いているが、**明示する**。
無いと Vercel が runtime を自動検出し、`entrypoint` を Dockerfile ではなく
`module:app`（Python ASGI の entrypoint）として解釈しようとして失敗する。

---

## 4. コンテナ側の要件

| 項目 | 要件 |
|---|---|
| **listen ポート** | `$PORT` で `0.0.0.0` にバインドする（`uvicorn` 既定の `127.0.0.1:8000` のままだと 502） |
| **ポート番号** | Vercel の既定は **80** だが、**非 root コンテナは 80 を bind できない**。本リポジトリは `ENV PORT=8080` に固定し、**Vercel project の env `PORT` も同じ値**にする（`vercel-deploy` / `infra-bootstrap vercel` が Dockerfile から読んで自動投入する）。揃わないと「デプロイ成功なのに 502」 |
| **CMD** | **絶対パス + exec 形式**（`["/app/.venv/bin/api"]`）。`$PATH` に依存すると Vercel 上でだけ exec に失敗し、ログを 1 行も残さず 500 になる |
| **shutdown** | scale-in 時に `SIGTERM` + **30 秒**の grace。uvicorn は SIGTERM で graceful shutdown |
| **scale down** | 無トラフィック 5 分（production）/ 30 秒（preview）で 0 に落ちる |
| **ログ** | stdout / stderr が runtime logs に出る。**リクエストに紐づかず、その時点の全 inflight リクエストにブロードキャストされる** |
| **非対応** | **Secure Compute / Static IP はコンテナでは使えない**。egress 固定 IP を要求する外部サービスがあるなら設計段階で弾く |
| **有効化** | Services / Container Images は **「Permissions Required（🔒）」**。チームで有効か事前に確認 |

---

## 5. `vercel-deploy`（services モード）が検査・投入するもの

| 観点 | 内容 |
|---|---|
| framework service | `root` の実在 / `installCommand` の `cd <dir>` 先に `bun.lock` がある |
| container service | blessed 名 / Dockerfile の実在 / コンテキストに `uv.lock` / `.dockerignore` |
| 共通 | service を指す rewrite がある / rewrites の末尾が catch-all |
| ローカル確認 | `build-frontend` + `test-backend-py` |
| project | 名前 = `APP_NAME`（bootstrap と同じ）/ Root Directory・framework = null |
| env | `NEXT_PUBLIC_APP_URL`（実測した本番 URL）/ `PORT`（Dockerfile の `ENV PORT`） |

`vercel-deploy frontend/apps/web` / `vercel-deploy backend-py` のように **service を単独 project で
出すことはできない**（止まる）。

イメージ自体はローカル確認では焼かれない。Vercel と同条件で焼くなら:

```bash
docker build -f backend-py/Dockerfile.vercel backend-py    # コンテキスト = Dockerfile のディレクトリ
```

---

## 6. 症状 → 原因

| 症状 | 原因 |
|---|---|
| `failed to compute cache key` / `uv.lock: not found` | ビルドコンテキストの取り違え（1.2）。Dockerfile を workspace ルートへ |
| entrypoint が拒否される | basename が blessed 名でない（1.1） |
| Dockerfile が使われず Python runtime として解釈される | `runtime: "container"` が無い（§3） |
| デプロイは成功するのに 404 | **rewrite が無い**。service は既定で非公開 |
| FastAPI のルートだけ 404（web の HTML が返る） | `/api` の外にルートがある / catch-all が上にある（§0.5） |
| デプロイは成功するのに 502 / タイムアウト | `$PORT` で listen していない・`127.0.0.1` にバインドしている・**Vercel project の env `PORT` と Dockerfile の値がズレている**（§4） |
| デプロイは成功するのに 500 / `INTERNAL_FUNCTION_INVOCATION_FAILED`（ログが空） | **起動前に死んでいる**。特権ポート bind か CMD の `$PATH` 依存（§4）。切り分けは [containers.md](containers.md) |
| ローカルの `.venv` がイメージに入る / ビルドが遅い | `.dockerignore` がコンテキスト外にある（§0 の図） |
| 2 つ目の service を足したらビルドが片方しか走らない | 2 つの service が同じ entrypoint を指している |
| `services` が効かない | project の **Root Directory が空か**（残っているとルートの `vercel.json` が読まれない）。`services` 使用時は `buildCommand` / `framework` / `functions` 等を**トップレベルに置けない**（service 内へ移す） |

---

## 7. 出典

- `vercel/vercel` `packages/fs-detectors/src/services/resolve-v2.ts` — `CONTAINER_ENTRYPOINT_CANDIDATES`
- `vercel/vercel` `packages/container/src/index.ts` — `contextDir = path.dirname(dockerfilePath)` / `buildArgsFromEnv`
- [Container Images](https://vercel.com/docs/functions/container-images) — 許容名（2 つ）/ `entrypoint` / PORT / SIGTERM / scale down / Secure Compute 非対応
- [Services](https://vercel.com/docs/services) — 1 project に複数 service・既定で非公開・rewrites で公開・`runtime: "container"`・トップレベルキーの制約
- [Services routing](https://vercel.com/docs/services/routing) — rewrite の先勝ち・接頭辞は外さない・bindings
- [Service configuration reference](https://vercel.com/docs/services/config-reference)
- `https://openapi.vercel.sh/vercel.json` — `services` の JSON Schema（`additionalProperties: false`）
- [uv: Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/) — workspace は全 member の pyproject が要る / `--frozen` → `--locked`
- 本リポジトリの実測: `docs/_research/2026-08-22-vercel-services-container-build-context.md`

> **公式の Agent Skill は存在しない。** Vercel は Claude Code 向けに
> `npx plugins add vercel/vercel-plugin` を公式配布しており（docs 各ページの frontmatter に記載）、
> その中の `create-a-backend` が「Functions / Services / containers / Workflow / Queues」を
> 横断的に扱うが、**コンテナ専用のスキルは無く、§1 の 3 制約はカバーされていない**。
> したがって本リポジトリではこのファイルが正本。
