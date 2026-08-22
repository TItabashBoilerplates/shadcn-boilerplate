# Vercel Services のコンテナ — entrypoint 名とビルドコンテキスト（実装ソースで確定）

- 調査日: 2026-08-22
- 対象: `backend-py`（uv workspace）を Vercel Services の `runtime: "container"` で出す構成
- 結論: **Dockerfile は uv workspace ルート（`backend-py/`）に、blessed 名で置くしかない。
  blessed 名は 4 つあるので、1 ディレクトリにつき最大 4 つのコンテナサービスを置ける。**
  `2026-07-07-vercel-container-services.md` が「正しい」と結論づけた
  `entrypoint: "apps/api/Dockerfile.vercel"` は動かない（同ファイルに訂正を追記済み）。

---

## 1. 公式ドキュメントだけでは判断できない 2 点

Vercel のドキュメントは entrypoint を
「Set the `entrypoint` key to the path of your dockerfile, **relative to the service's `root`**」
としか書いておらず、**ビルドコンテキストの位置も、ファイル名の制約も書いていない**。
公式例はすべて `root: "backend/"` + `entrypoint: "Dockerfile.vercel"`（root と Dockerfile が
同じ場所）なので、ドキュメントからは差を区別できない。

実装（`vercel/vercel`）で両方とも確定した。

### 1.1 entrypoint の basename は 4 つだけ

```ts
// packages/fs-detectors/src/services/resolve-v2.ts
const CONTAINER_ENTRYPOINT_CANDIDATES = [
  'Dockerfile.vercel',
  'Containerfile.vercel',
  'Dockerfile',
  'Containerfile',
];
```

同ファイルのコメント:

> Both the supplied-entrypoint check and the `runtime: "container"` auto-detection use this
> single set, so **a suffixed name like `Dockerfile.prod` is never matched**.

> Matches only the basenames `Dockerfile`, `Containerfile`, `Dockerfile.vercel`, and
> `Containerfile.vercel` — a suffixed name such as `Dockerfile.prod` is not a container entrypoint.

つまり `Dockerfile.api.vercel` のようにアプリ名を挟む案は成立しない。
**公式ドキュメントに載っているのは先頭 2 つだけ**なので、まずその 2 つから使う。

### 1.2 ビルドコンテキストは常に `dirname(Dockerfile)`

```ts
// packages/container/src/index.ts
const dockerfilePath = path.join(workPath, dockerfileRel);
const contextDir = path.dirname(dockerfilePath);
```

**上書きする手段が無い。** `services.<name>.root` でも、project の Root Directory でも、
`.vercelignore` でも、`builds` でも変えられない。

> 同ファイルで build args だけは通る:
> `// Forward the project's build env to the image build as --build-arg s`
> `const buildArgs = buildArgsFromEnv(meta?.buildEnv);`
> ただしこれは **project の build env** であってサービス単位ではないので、
> 「1 つの Dockerfile を build arg で切り替えて複数サービスにする」用途には使えない。

### 1.3 uv 側の要求とぶつかる

uv 公式（[Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/)）:

> uv cannot assert that the `uv.lock` file is up-to-date **without each of the workspace member
> `pyproject.toml` files**.

したがって uv workspace のビルドは **workspace ルートをコンテキストにする必要がある**。
1.2 と合わせると、**Dockerfile を workspace ルートに置く以外の解が無い**。

（uv 公式の 2 段構えもそのまま採用している: 1 回目は `--frozen --no-install-workspace`、
member を COPY した後の 2 回目は **`--locked`** で lockfile を検証する。
「The next sync, after all the workspace members have been copied, can still use `--locked`
and will validate that the lockfile is correct for all workspace members.」）

---

## 2. 採った形

```
backend-py/                        ← Vercel project の Root Directory
├── vercel.json
├── Dockerfile.vercel              → service "api"   (apps/api / FastAPI)
├── .dockerignore                  ← Dockerfile と同じ場所でないと読まれない
├── uv.lock / pyproject.toml
├── apps/{api,mcp}/
└── packages/core/
```

```jsonc
{
  "services": {
    "api": { "runtime": "container", "root": ".", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [{ "source": "/(.*)", "destination": { "service": "api" } }]
}
```

`root` と Dockerfile の位置を一致させてあるので、
docs の "relative to the service's `root`" とスキーマの "relative to the workspace directory" の
**記述揺れの影響も受けない**。

### 2 つ目以降のアプリ: blessed 名の割り当て表

blessed 名は 4 つなので **1 ディレクトリにつき最大 4 サービス**。
名前からアプリが読み取れないため、対応表を Dockerfile 冒頭 / README / テストで固定する。

| ファイル | サービス | 状態 |
|---|---|---|
| `backend-py/Dockerfile.vercel` | `api`（apps/api / FastAPI） | 使用中 |
| `backend-py/Containerfile.vercel` | 2 つ目のアプリ | 未使用 |
| `backend-py/Dockerfile` | 3 つ目のアプリ | 未使用 |
| `backend-py/Containerfile` | 4 つ目のアプリ | 未使用 |

**アプリごとに別イメージなので `uv sync --package <app>` の絞り込みが効く**
（片方の重い依存が、もう片方のイメージに入らない）。

5 つ目が必要になったら、別ディレクトリ（別の uv workspace）か別 project にする。

### 採らなかった案: 1 イメージ + サービスごとの `command`

実装上は通る余地があるが、**公式ドキュメントにも公開 JSON schema にも `command` は無い**。
加えて全アプリの依存が 1 イメージに同居するので、コンテナを分ける目的（イメージサイズと
障害範囲の分離）を潰す。採用しない。

### 副次的に直った不具合: `.dockerignore` が効いていなかった

docker は **`<ビルドコンテキスト>/.dockerignore` しか読まない**。
`.dockerignore` は `backend-py/` にあったのにコンテキストは `backend-py/apps/api/` だったので、
**まるごと無視されていた**（ローカルの `.venv` / `__pycache__` を除外できていなかった）。

---

## 3. 実測（ローカル docker で A/B）

Vercel と同じ条件（`-f <Dockerfile>` + コンテキスト）で再現した。

| コンテキスト | 結果 |
|---|---|
| `backend-py/apps/api`（旧） | `failed to compute cache key: "/uv.lock": not found` = **本番と同じ失敗** |
| `backend-py`（新） | bind mount 段（`uv.lock` + 全 member の pyproject）を通過 |

---

## 4. 再発防止

### 4.1 静的検査

`backend-py/apps/api/tests/test_vercel_container_config.py`。
この種の設定崩れは**ローカルでは一切顕在化しない**（`uv sync` も `pytest` も `ci-check` も
devenv の backend 起動も通る）ので、静的検査でしか止められない。

| 検査 | 防いでいる事故 |
|---|---|
| `runtime: "container"` があるか | Vercel が runtime を自動検出し entrypoint を `module:app` と誤解する |
| entrypoint の basename が blessed 名 4 つのいずれか | 接尾辞つきが拒否される（1.1） |
| entrypoint が実在するか | パス typo |
| Dockerfile のディレクトリ = uv workspace ルートで `uv.lock` / `pyproject.toml` があるか | コンテキスト取り違え（1.2 / 1.3） |
| service ごとに entrypoint が重複していないか | 2 つの service が同じイメージを指す |
| 1 ディレクトリのサービス数 ≤ 4 | blessed 名を使い切っている |
| すべての service に top-level rewrite があるか | **service は既定で非公開**。無いとデプロイ成功のまま 404 |
| COPY / bind mount がコンテキスト内か | `failed to compute cache key` |
| コンテキストに `.dockerignore` があるか | `.dockerignore` が無言で効かなくなる |

### 4.2 デプロイ経路

`vercel-deploy` が `<app>/vercel.json` を見て **framework モード / container モード**を
自動判別するようにした（`vercel-deploy backend-py`）。container モードでは:

- 上表と同じ前提を **Vercel へ 1 件も送る前に**検査して落とす
- ローカル確認は `build-frontend` ではなく `test-backend-py`
  （container ビルドでは frontend のビルド結果は 1 バイトも使われないため）
- 本番 URL を入れる env の既定を `none` にする
  （backend project に `NEXT_PUBLIC_APP_URL` を入れても読まれない）
- bootstrap（`scripts/infra/vercel.sh`）が付けた project 名（`VERCEL_BACKEND_PROJECT`）を再利用し、
  同じ root を持つ project が 2 つできるのを防ぐ

---

## 出典

- `vercel/vercel` `packages/fs-detectors/src/services/resolve-v2.ts` — `CONTAINER_ENTRYPOINT_CANDIDATES`
- `vercel/vercel` `packages/container/src/index.ts` — `contextDir = path.dirname(dockerfilePath)` / `buildArgsFromEnv`
- [Vercel: Container Images](https://vercel.com/docs/functions/container-images) — `Dockerfile.vercel` / `Containerfile.vercel`・PORT 既定 80・SIGTERM + 30s・scale down・Secure Compute 非対応
- [Vercel: Services](https://vercel.com/docs/services) — service は既定で非公開・rewrites で公開・`runtime: "container"`・トップレベルキーの制約
- [Vercel: Service configuration reference](https://vercel.com/docs/services/config-reference)
- `https://openapi.vercel.sh/vercel.json` — `services` の JSON Schema（`additionalProperties: false`。`context` も `command` も無い）
- [uv: Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/) — workspace は全 member の pyproject が要る / `--frozen` → `--locked` の 2 段構え
- 実測: 本リポジトリのローカル docker A/B（2026-08-22）
