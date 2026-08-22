# Vercel Services × コンテナ（backend-py をモノレポのまま出す）

> 「backend をデプロイして」「FastAPI を Vercel に出して」「Dockerfile が検出されない」
> 「ビルドで `uv.lock` が見つからない」「entrypoint が拒否される」「service が 404」
> のときはここを読む。

Next.js（`frontend/apps/web`）の話ではない。**`vercel.json` の `services` に
`runtime: "container"` を書いて Dockerfile からコンテナを建てる**構成のガイド。

---

## 0. まず結論

```bash
vercel-deploy backend-py            # これで通る（--dry-run で計画だけ確認できる）
```

`vercel-deploy` は `<app>/vercel.json` を見て **framework モード / container モード**を
自動判別する。container モードでは、下記の前提を **Vercel へ 1 件も送る前に**検査して落とす。

```
backend-py/                        ← Vercel project の Root Directory
├── vercel.json
├── Dockerfile.vercel              → service "api"
├── .dockerignore                  ← ★ Dockerfile と同じディレクトリでないと読まれない
├── uv.lock / pyproject.toml
├── apps/{api,mcp}/
└── packages/core/
```

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "api": { "runtime": "container", "root": ".", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [{ "source": "/(.*)", "destination": { "service": "api" } }]
}
```

`backend-py/apps/api/tests/test_vercel_container_config.py` が同じ不変条件を CI で検査する。
**この検査を消さない**（どれも壊れてもローカルでは一切顕在化しない）。

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
`builds` でも変えられない。

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

追加するときは **service と rewrite を必ずセットで**足す。`rewrites` が無い service は
**既定で非公開**なので、デプロイは成功したまま 404 になる。

5 つ目が必要になったら、別ディレクトリ（別 workspace）か別 project。
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
| **listen ポート** | `$PORT`（既定 **80**）。`uvicorn` 既定の `127.0.0.1:8000` のままだと 502。`0.0.0.0` にバインドする |
| **PORT の変更** | project settings の環境変数 `PORT` で上書きできる |
| **shutdown** | scale-in 時に `SIGTERM` + **30 秒**の grace。uvicorn は SIGTERM で graceful shutdown |
| **scale down** | 無トラフィック 5 分（production）/ 30 秒（preview）で 0 に落ちる |
| **ログ** | stdout / stderr が runtime logs に出る。**リクエストに紐づかず、その時点の全 inflight リクエストにブロードキャストされる** |
| **非対応** | **Secure Compute / Static IP はコンテナでは使えない**。egress 固定 IP を要求する外部サービスがあるなら設計段階で弾く |
| **有効化** | Services / Container Images は **「Permissions Required（🔒）」**。チームで有効か事前に確認 |

---

## 5. `vercel-deploy` の container モードが framework モードと違うところ

| 観点 | framework | container |
|---|---|---|
| `vercel.json` の検査 | `installCommand` が `cd ../..` でルートへ戻っているか | blessed 名 / Dockerfile の実在 / コンテキストに `uv.lock` / rewrite の有無 |
| ローカル確認 | `build-frontend` | `test-backend-py`（container ビルドでは frontend の成果物は 1 バイトも使われない） |
| 本番 URL の env | `NEXT_PUBLIC_APP_URL` | **`none`**（backend project に `NEXT_PUBLIC_*` を入れても読まれない） |
| framework preset | package.json から判定 | 常に `none` |
| project 名 | `[APP_NAME-]<dir>` | `VERCEL_BACKEND_PROJECT` があればそれ（bootstrap と重複した project を作らないため） |

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
| デプロイは成功するのに 502 / タイムアウト | `$PORT` で listen していない・`127.0.0.1` にバインドしている（§4） |
| ローカルの `.venv` がイメージに入る / ビルドが遅い | `.dockerignore` がコンテキスト外にある（§0 の図） |
| 2 つ目の service を足したらビルドが片方しか走らない | 2 つの service が同じ entrypoint を指している |
| `services` が効かない | Root Directory 直下に `vercel.json` があるか。`services` 使用時は `buildCommand` 等の build/runtime 系キーを**トップレベルに置けない**（service 内へ移す） |

---

## 7. 出典

- `vercel/vercel` `packages/fs-detectors/src/services/resolve-v2.ts` — `CONTAINER_ENTRYPOINT_CANDIDATES`
- `vercel/vercel` `packages/container/src/index.ts` — `contextDir = path.dirname(dockerfilePath)` / `buildArgsFromEnv`
- [Container Images](https://vercel.com/docs/functions/container-images) — 許容名（2 つ）/ `entrypoint` / PORT / SIGTERM / scale down / Secure Compute 非対応
- [Services](https://vercel.com/docs/services) — 既定で非公開・rewrites で公開・`runtime: "container"`・トップレベルキーの制約
- [Service configuration reference](https://vercel.com/docs/services/config-reference)
- `https://openapi.vercel.sh/vercel.json` — `services` の JSON Schema（`additionalProperties: false`）
- [uv: Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/) — workspace は全 member の pyproject が要る / `--frozen` → `--locked`
- 本リポジトリの実測: `docs/_research/2026-08-22-vercel-services-container-build-context.md`

> **公式の Agent Skill は存在しない。** Vercel は Claude Code 向けに
> `npx plugins add vercel/vercel-plugin` を公式配布しており（docs 各ページの frontmatter に記載）、
> その中の `create-a-backend` が「Functions / Services / containers / Workflow / Queues」を
> 横断的に扱うが、**コンテナ専用のスキルは無く、§1 の 3 制約はカバーされていない**。
> したがって本リポジトリではこのファイルが正本。
