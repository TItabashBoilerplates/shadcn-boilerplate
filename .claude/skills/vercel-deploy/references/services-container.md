# Vercel Services × コンテナ（backend-py を Docker で出す）

> 「backend をデプロイして」「FastAPI を Vercel に出して」「Dockerfile が検出されない」
> 「ビルドで `uv.lock` が見つからない」「entrypoint が拒否される」ときはここを読む。

Next.js（`frontend/apps/web`）の話ではない。**`vercel.json` の `services` に
`runtime: "container"` を書いて Dockerfile からコンテナを建てる**構成のガイド。

---

## 0. 先に結論（この形以外は動かない）

```
backend-py/
├── vercel.json          ← Vercel project の Root Directory はここ（= backend-py）
├── Dockerfile.vercel    ← ★ workspace ルート直下。名前も位置も選べない
├── .dockerignore        ← ★ Dockerfile と同じディレクトリでないと読まれない
├── uv.lock
├── pyproject.toml
├── apps/{api,mcp}/
└── packages/core/
```

```jsonc
// backend-py/vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "api": { "runtime": "container", "root": ".", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [{ "source": "/(.*)", "destination": { "service": "api" } }]
}
```

`backend-py/apps/api/tests/test_vercel_container_config.py` がこの形を CI で検査している。
**この検査を消さない**（下記の 3 つはどれも、壊れてもローカルでは一切顕在化しない）。

---

## 1. 公式ドキュメントに書いていない 3 つの落とし穴

### 1.1 Dockerfile の名前は 2 つしか受け付けない

公式:

> Get started by creating a `Dockerfile.vercel` (or `Containerfile.vercel`) file placed at the
> root of your project.
> — [Container Images](https://vercel.com/docs/functions/container-images)

**`Dockerfile.api.vercel` のようなアプリ名入りの派生名は、`entrypoint` に明示しても拒否される。**
「モノレポだからアプリ名を付けて並べよう」という発想はここで潰れる。

### 1.2 ビルドコンテキストは `root` ではなく「Dockerfile のあるディレクトリ」

公式は `entrypoint` を「the path of your dockerfile, **relative to the service's `root`**」と
説明するだけで、**ビルドコンテキストがどこかは一言も書いていない**。
公式例はすべて `root: "backend/"` + `entrypoint: "Dockerfile.vercel"`、つまり root と Dockerfile の
位置が一致しているので、ドキュメントだけでは区別できない。

実測（2026-08-22）: `root: "."` / `entrypoint: "apps/api/Dockerfile.vercel"` にすると、
`--mount=type=bind,source=uv.lock` が解決できずビルドが落ちた。
**コンテキストは `apps/api/` だった。**

uv workspace は `uv.lock` + ルート `pyproject.toml` + 全 member の pyproject が同一コンテキストに
無いと解決できない。したがって **Dockerfile は workspace ルートに置く以外に選択肢が無い。**

### 1.3 ビルドコンテキストを上書きする設定は存在しない

`services.<name>` に許されるフィールドは公式スキーマ（`https://openapi.vercel.sh/vercel.json`）に
`additionalProperties: false` で列挙されている:

`root` / `framework` / `runtime` / `entrypoint` / `installCommand` / `buildCommand` / `devCommand` /
`ignoreCommand` / `outputDirectory` / `bindings` / `functions` / `headers` / `redirects` /
`rewrites` / `routes` / `cleanUrls` / `trailingSlash`

**`context` も `dockerfile` も無い。** 「Dockerfile はサブディレクトリ、コンテキストはルート」は
仕様上できないので、その方向で悩まないこと。

> スキーマ側の `entrypoint` の説明は "relative to the **workspace directory**"、docs 本文は
> "relative to the service's **root**" で食い違っている。`root: "."` にしておけば両方の解釈が
> 一致するので、この曖昧さを踏まない（**root と Dockerfile の位置を揃えるのが最も安全**）。

---

## 2. `runtime: "container"` は省略しない

Container Images の Services 例は `runtime` を省いているが、**明示する**。
無いと Vercel が runtime を自動検出し、`entrypoint` を Dockerfile ではなく
`module:app`（Python ASGI の entrypoint）として解釈しようとして失敗する。

---

## 3. コンテナ側の要件

| 項目 | 要件 |
|---|---|
| **listen ポート** | `$PORT`（既定 **80**）。`uvicorn` の既定 `127.0.0.1:8000` のままだと 502 になる。`0.0.0.0` にバインドすること |
| **PORT の変更** | project settings の環境変数 `PORT` で上書きできる |
| **shutdown** | scale-in 時に `SIGTERM` + **30 秒**の grace。uvicorn は SIGTERM で graceful shutdown する |
| **scale down** | 無トラフィック 5 分（production）/ 30 秒（preview）で 0 に落ちる |
| **ログ** | コンテナの stdout / stderr が runtime logs に出る。ただし**リクエストに紐づかず、その時点の全 inflight リクエストにブロードキャストされる** |
| **非対応** | **Secure Compute / Static IP はコンテナでは使えない**。egress 固定 IP を要求する外部サービスがあるなら設計段階で弾く |
| **有効化** | Services / Container Images は **「Permissions Required（🔒）」**。チームで有効になっているか事前に確認する |

---

## 4. 1 workspace に 1 コンテナサービスまで

1.1 + 1.2 の帰結として、**同一の uv workspace から 2 つの container service は出せない**
（2 つ目も同じ `Dockerfile.vercel` を workspace ルートに要求するため）。

`apps/mcp` などを足したくなったら、**勝手に決めずユーザーに選択肢を示す**:

| 案 | 内容 | 代償 |
|---|---|---|
| A. 1 コンテナに同居 | FastAPI 側でルータをマウントしてパス分岐 | スケール単位・依存・障害範囲が共有 |
| B. 別 project | Root Directory を分けた Vercel project を作る | ドメイン・env・デプロイの二重管理 |
| C. workspace 分割 | 独立した uv プロジェクトにする | 単一 `uv.lock` の利点を失う |

---

## 5. 症状 → 原因

| 症状 | 原因 |
|---|---|
| `failed to compute cache key` / `uv.lock: not found` | ビルドコンテキストの取り違え（1.2）。Dockerfile を workspace ルートへ |
| entrypoint が拒否される | ファイル名（1.1）。`Dockerfile.vercel` / `Containerfile.vercel` のみ |
| Dockerfile が使われず Python runtime として解釈される | `runtime: "container"` が無い（§2） |
| デプロイは成功するのに 502 / タイムアウト | `$PORT` で listen していない・`127.0.0.1` にバインドしている（§3） |
| ローカルの `.venv` がイメージに入る / ビルドが遅い | `.dockerignore` がコンテキスト外にある（§0 の図） |
| service にリクエストが来ない（404） | `rewrites` が無い。**service は既定で非公開**で、top-level rewrite が唯一の公開手段 |
| そもそも `services` が効かない | Root Directory の直下に `vercel.json` があるか。`services` 使用時は `buildCommand` 等の build/runtime 系キーを**トップレベルに置けない**（service 内へ移す） |

---

## 6. 出典

- [Container Images](https://vercel.com/docs/functions/container-images) — 許容ファイル名 / `entrypoint` / PORT / SIGTERM / scale down / Secure Compute 非対応
- [Services](https://vercel.com/docs/services) — service は既定で非公開・rewrites で公開・`runtime: "container"`・トップレベルキーの制約
- [Service configuration reference](https://vercel.com/docs/services/config-reference) — 全フィールド
- `https://openapi.vercel.sh/vercel.json` — `services` の JSON Schema（`additionalProperties: false`）
- 本リポジトリの実測: `docs/_research/2026-08-22-vercel-services-container-build-context.md`

> **公式の Agent Skill は存在しない。** Vercel は Claude Code 向けに
> `npx plugins add vercel/vercel-plugin` を公式配布しており（docs 各ページの frontmatter に記載）、
> その中の `create-a-backend` が「Functions / Services / containers / Workflow / Queues」を
> 横断的に扱うが、**コンテナ専用のスキルは無く、上記 1.1〜1.3 はカバーされていない**。
> したがって本リポジトリではこのファイルが正本。
