# Vercel Services のコンテナサービス — Dockerfile の名前とビルドコンテキスト（実測）

- 調査日: 2026-08-22
- 対象: `backend-py`（uv workspace）を Vercel Services の `runtime: "container"` で出す構成
- 結論: **Dockerfile は uv workspace ルート（`backend-py/`）に `Dockerfile.vercel` という名前で置くしかない。**
  `2026-07-07-vercel-container-services.md` が「正しい」と結論づけた
  `entrypoint: "apps/api/Dockerfile.vercel"` は**実デプロイで動かない**（同ファイルの冒頭に訂正を追記済み）。

---

## 1. なぜ調べ直したか

2026-07-07 の調査は「公式ドキュメントの記述と矛盾しないこと」までしか確認できておらず、
本人も次の 2 点を未確認事項として残していた:

> 公式ドキュメントは「ビルドコンテキストが厳密に `root` ディレクトリである」とまでは断言していない。
> Dockerfile 内の `COPY` パスは backend-py ルート基準で書く前提で用意し、
> **初回デプロイのビルドログで context を確認すること。**

実際にデプロイしたところ、この未確認事項がそのまま不具合になった。

---

## 2. 実測でわかったこと

### 2.1 ビルドコンテキストは `services.<name>.root` ではなく「Dockerfile のあるディレクトリ」

`root: "."` / `entrypoint: "apps/api/Dockerfile.vercel"` で `apps/api/` に Dockerfile を置いた状態で
デプロイすると、Dockerfile 冒頭の

```docker
--mount=type=bind,source=uv.lock,target=uv.lock
```

が解決できずにビルドが落ちた。`uv.lock` は `backend-py/uv.lock` にあるので、
**コンテキストが `backend-py/` ではなく `backend-py/apps/api/` だった**ことになる。

公式ドキュメントは entrypoint について
「Set the `entrypoint` key to the path of your dockerfile, **relative to the service's `root`**」
とだけ書いており（[Container Images](https://vercel.com/docs/functions/container-images)）、
**ビルドコンテキストがどこかは一切書いていない**。公式例はいずれも
`root: "backend/"` + `entrypoint: "Dockerfile.vercel"`、すなわち **root と Dockerfile の位置が
一致している**ので、ドキュメントだけからはこの差を区別できない。

### 2.2 Dockerfile の名前は `Dockerfile.vercel` / `Containerfile.vercel` だけ

「アプリごとに Dockerfile を分けたい」ので workspace ルートに `Dockerfile.api.vercel` を置いて
entrypoint から指したところ、**Vercel 側が entrypoint のファイル名を拒否**した。

公式も許容名を 2 つしか挙げていない:

> Get started by creating a `Dockerfile.vercel` (or `Containerfile.vercel`) file placed at the
> root of your project.
> — [Container Images](https://vercel.com/docs/functions/container-images)

### 2.3 ビルドコンテキストを上書きする設定は存在しない

`services.<name>` に許される全フィールドは公式 JSON Schema（`https://openapi.vercel.sh/vercel.json`）に
`additionalProperties: false` で列挙されている:

`root` / `framework` / `runtime` / `entrypoint` / `installCommand` / `buildCommand` / `devCommand` /
`ignoreCommand` / `outputDirectory` / `bindings` / `functions` / `headers` / `redirects` / `rewrites` /
`routes` / `cleanUrls` / `trailingSlash`

**`context` / `dockerfile` に相当するフィールドは無い**。したがって「Dockerfile はサブディレクトリに
置いたまま、コンテキストだけ workspace ルートにする」ことは仕様上できない。

> 補足: 同スキーマの `entrypoint` の説明文は "Entry file for the service, **relative to the workspace
> directory**" となっており、docs 本文の "relative to the service's `root`" と食い違う。
> 本リポジトリは `root: "."` なので両者の解釈は一致し、この曖昧さの影響を受けない。

---

## 3. したがって取れる構成は 1 つだけ

```jsonc
// backend-py/vercel.json（Vercel project の Root Directory = backend-py）
{
  "services": {
    "api": { "runtime": "container", "root": ".", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [{ "source": "/(.*)", "destination": { "service": "api" } }]
}
```

- Dockerfile は `backend-py/Dockerfile.vercel`。
- コンテキスト = `backend-py/` = uv workspace ルート → `uv.lock` / ルート `pyproject.toml` /
  `apps/*/pyproject.toml` / `packages/core` がすべて見える。
- **root と Dockerfile の位置が一致するので、公式例と同じ形になり 2.1 の曖昧さを踏まない**
  （コンテキストが root であっても Dockerfile のディレクトリであっても、答えが同じになる）。

### 副次的に直った不具合: `.dockerignore` が効いていなかった

docker は **`<ビルドコンテキスト>/.dockerignore` しか読まない**。
`.dockerignore` は `backend-py/` に置いてあったのに、コンテキストは `backend-py/apps/api/` だったので
**まるごと無視されていた**（ローカルの `.venv` や `__pycache__` を除外できていなかった）。
Dockerfile をルートへ移したことで、コンテキストと `.dockerignore` の位置が一致した。

---

## 4. 引き換えに失った選択肢（設計上の制約として受け入れる）

**1 つの uv workspace につきコンテナサービスは 1 つしか置けない。**
2 つ目のアプリ（`apps/mcp`）も同じ `backend-py/Dockerfile.vercel` という名前・位置を要求するため、
`vercel.json` に 2 つ目の container service を足すことはできない。

`apps/mcp` を出す必要が生じたときの選択肢（どれもトレードオフがあるので、その時点で判断する）:

| 案 | 内容 | 代償 |
|---|---|---|
| A. 1 コンテナに同居 | `api` の FastAPI に MCP のルータをマウントし、`rewrites` ではなくアプリ内でパス分岐 | スケール単位・依存・障害範囲が共有になる |
| B. 別の Vercel project | `apps/mcp` 用に Root Directory を分けた project を作る | ドメイン・env・デプロイが二重管理になる |
| C. workspace を分割 | `apps/mcp` を独立した uv プロジェクトにし、`packages/core` を配布物として持たせる | 単一 `uv.lock` の利点（`.claude/rules/python-monorepo.md`）を失う |

現時点で `apps/mcp` はコンテナ化していないため、**この判断は保留**。

---

## 5. 再発防止

`backend-py/apps/api/tests/test_vercel_container_config.py` を追加した。
この種の設定崩れは**ローカルでは一切顕在化しない**（`uv sync` も `pytest` も `ci-check` も
devenv の backend 起動も通る）ので、静的検査でしか止められない。検査内容:

| 検査 | 防いでいる事故 |
|---|---|
| `runtime: "container"` があるか | Vercel が runtime を自動検出し entrypoint を `module:app` と誤解する |
| entrypoint のファイル名が `Dockerfile.vercel` / `Containerfile.vercel` か | 派生名が拒否される（2.2） |
| entrypoint が実在するか | パス typo |
| Dockerfile のディレクトリ = uv workspace ルートで、`uv.lock` / `pyproject.toml` があるか | コンテキスト取り違え（2.1） |
| Dockerfile 内の COPY / bind mount がコンテキスト内に収まるか | `failed to compute cache key: not found` |
| コンテキストに `.dockerignore` があるか | `.dockerignore` が無言で効かなくなる（§3） |

---

## 出典

- [Vercel: Container Images](https://vercel.com/docs/functions/container-images) — 許容ファイル名、`entrypoint` の意味、PORT（既定 80）、SIGTERM + 30s
- [Vercel: Services](https://vercel.com/docs/services) — `services` の考え方、`runtime: "container"`、rewrites による公開
- [Vercel: Service configuration reference](https://vercel.com/docs/services/config-reference) — 全フィールド（ビルドコンテキストへの言及は無い）
- `https://openapi.vercel.sh/vercel.json` — `services` の JSON Schema（`additionalProperties: false`）
- [Vercel KB: Running Docker on Vercel](https://vercel.com/kb/guide/docker)
- 実測: 本リポジトリの backend project のビルドログ（2026-08-22）
