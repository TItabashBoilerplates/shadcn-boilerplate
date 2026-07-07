# Vercel Container Services (`vercel.json`) 調査レポート

## 調査情報
- **調査日**: 2026-07-07
- **調査者**: spec agent
- **対象**: FastAPI (Python) backend を Docker コンテナとして Vercel Services でデプロイする `vercel.json` の妥当性検証
- **前提**: Vercel プロジェクトの Root Directory = `backend-py`（uv workspace: apps/api, apps/mcp, packages/core）

## 検証対象の設定

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "api": {
      "runtime": "container",
      "root": ".",
      "entrypoint": "apps/api/Dockerfile.vercel"
    }
  },
  "rewrites": [{ "source": "/(.*)", "destination": { "service": "api" } }]
}
```

---

## Q1. Docker コンテナ backend デプロイのサポート / 製品名 / GA・前提

- **サポートされている**。コンテナは **Vercel Functions** 上で OCI イメージとして実行され、**Vercel Container Registry (VCR)** に push され、自動スケールする。製品面は 2 つ:
  - **Container Images**（単一の `Dockerfile.vercel` を Vercel Function として実行）
  - **Services**（1 プロジェクトに複数の backend/frontend を同居。FastAPI backend + Next.js frontend を同一プロジェクトにデプロイする用途はまさにこれ）
  - 「Fluid」ではない。Fluid Compute は別概念。コンテナは Vercel Functions + Active CPU 課金で動く。
- **GA/beta**: KB ページには beta 表記が無く GA 相当。ただし Services / Container Images 両ドキュメント冒頭に **`🔒 Permissions Required: Services` / `Container Images`** の注記があり、**アカウント側で当該機能（permission）が有効化されている必要がある**。プラン別可否はドキュメントに明記なし。
- 引用: 「Vercel Functions can run Open Container Initiative (OCI) compatible container images stored in Vercel Container Registry (VCR).」
  - https://vercel.com/docs/functions/container-images
  - https://vercel.com/docs/services
  - https://vercel.com/kb/guide/does-vercel-support-docker-deployments

## Q2. `services` キーとサービスエントリのフィールド

- **`services` トップレベルキーは正しい**。「Define services in `vercel.json` using the `services` key.」
- サービス設定オブジェクトのフィールド（config reference より、`root` 以外はすべて optional）:
  - **`root`**（**Required**, string）: 「The path to the service root, relative to `vercel.json`.」
  - **`runtime`**（optional, string）: 「The Runtime for the service. Vercel detects the runtime automatically when `runtime` is not set.」→ `"container"` は Services ドキュメントに明示された有効値。
  - **`entrypoint`**（optional, string）: 「The framework or runtime entrypoint, such as `main:app` for a Python ASGI app or a file path for Node.js.」コンテナの場合は Dockerfile パス（後述）。
  - その他: `framework`, `installCommand`, `buildCommand`, `devCommand`, `ignoreCommand`, `outputDirectory`, `bindings`, `functions`, `headers`, `redirects`, `rewrites`, `routes`, `cleanUrls`, `trailingSlash`。
- **`name` / `port` / `memory` / `regions` というサービスフィールドは存在しない**。サービス名は `services` オブジェクトのキー（ここでは `"api"`）。ポートは vercel.json ではなくプロジェクト設定の環境変数（Q4）。メモリ/リージョンは `functions` 設定や通常の Function 設定側。
- `runtime: "container"` + `entrypoint`(=Dockerfile) の組み合わせは有効。Container Images ドキュメントの Services 例では `entrypoint: "Dockerfile.vercel"` を指定し、「Set the `entrypoint` key to the path of your dockerfile, relative to the service's `root`」と明記。→ **検証対象の 3 フィールド (`runtime`,`root`,`entrypoint`) はすべて正しい**。
  - https://vercel.com/docs/services/config-reference
  - https://vercel.com/docs/functions/container-images

## Q3. `rewrites` で `destination: { "service": "api" }` は有効か

- **有効**。「Set the `destination` value in a rewrite rule to an object like `{ "service": "my_backend" }`.」
- destination オブジェクト: `service`（**Yes/必須**）, `path`（No）。
- catch-all 例が公式にそのまま存在: 「For the smallest possible setup, a single service with a catch-all rewrite: `{ "services": { "api": { "root": "api/" } }, "rewrites": [ { "source": "/(.*)", "destination": { "service": "api" } } ] }`」
- **重要**: サービスは既定で internal（公開されない）。**トップレベル rewrite があって初めて公開される**。→ 検証対象の catch-all rewrite は必須かつ正しい。
  - https://vercel.com/docs/services/routing
  - https://vercel.com/docs/services

## Q4. コンテナが受け取る PORT / listen 方法

- 「Vercel Functions running container images are expected to open an HTTP server to receive traffic on. **The default port is `80`, and it can be overridden by setting the `PORT` environment variable in the project settings.**」
- つまり **既定は固定で 80**。ランダムポート注入方式ではない。別ポートにしたい場合は**プロジェクト設定で `PORT` を自分で設定**し、アプリをそれに合わせる。
- **FastAPI での実務含意（最重要 gotcha）**: uvicorn 既定は `127.0.0.1:8000`。コンテナ内では **`--host 0.0.0.0` かつ `--port 80`**（または Vercel 側で `PORT` を設定して `--port $PORT`）で listen しなければトラフィックを受けられない。`127.0.0.1` バインドは不可。
  - https://vercel.com/docs/functions/container-images#port-resolution

## Q5. ビルドコンテキスト / Root Directory / monorepo

- `root` は「relative to `vercel.json`」。プロジェクト Root Directory = `backend-py` なので `vercel.json` は `backend-py/` 直下 → **`root: "."` = `backend-py`**。
- `entrypoint` は「the path of your dockerfile, **relative to the service's `root`**」→ `apps/api/Dockerfile.vercel` は `backend-py/apps/api/Dockerfile.vercel` に解決。**正しい**。
- **uv workspace 的には `root: "."`（= backend-py 全体）が正しい選択**。Dockerfile が `uv.lock` / `packages/core` / `apps/api` を COPY できるよう、ビルドルート＝ワークスペースルートである必要がある。Dockerfile を `apps/api/` に置きつつ context を backend-py にするこの構成は理にかなう。
  - 注意: 公式ドキュメントは「ビルドコンテキストが厳密に `root` ディレクトリである」とまでは断言していない。Dockerfile 内の `COPY` パスは backend-py ルート基準で書く前提で用意し、初回デプロイのビルドログで context を確認すること。
  - https://vercel.com/docs/services/config-reference
  - https://vercel.com/docs/functions/container-images

## Q6. ヘルスチェック / SIGTERM / サイズ / cold start / 注意点

- **スケールイン**: 本番はトラフィック無しで 5 分、preview は 30 秒で自動スケールダウン。
- **SIGTERM**: スケールダウン時にコンテナへ `SIGTERM`、**30 秒の grace period** 後に強制終了。FastAPI/uvicorn は graceful shutdown を実装しておくべき。
- **ヘルスチェック**: vercel.json でのヘルスチェック設定項目はドキュメントに存在しない（Function として起動→HTTP を受けられるかで判断）。
- **Limits/課金**: 通常の Vercel Functions の limits と **Active CPU 課金**が適用（I/O 待ち・sleep 中は課金されない）。最大イメージサイズの明示値はこのページには記載なし（Functions limitations 側）。
- **未サポート**: **Secure Compute と Static IPs はコンテナイメージでは未対応**。固定 outbound IP が必要な外部連携（例: IP 許可制の DB/API）は要注意。
  - https://vercel.com/docs/functions/container-images#scale-in-behavior
  - https://vercel.com/docs/functions/limitations

---

## VERDICT

**検証対象の `vercel.json` は、Vercel Services + Container Images の現行仕様に照らして構文的・構造的に正しい。** 3 フィールド（`runtime:"container"` / `root:"."` / `entrypoint:"apps/api/Dockerfile.vercel"`）はいずれも config reference / Container Images ドキュメントに沿う。catch-all rewrite（`destination:{service:"api"}`）も公式の最小構成例と一致。deprecated フィールドや誤りは無し。

ただし **vercel.json 単体では動作保証にならない**。以下は vercel.json 外の必須条件:
1. アカウントで **Services / Container Images の permission が有効**であること。
2. `backend-py/apps/api/Dockerfile.vercel` を用意し、**FastAPI を `0.0.0.0:80`（既定）で listen** させること（または Vercel プロジェクト設定で `PORT` を設定して `$PORT` にバインド）。uvicorn 既定の `127.0.0.1:8000` は不可。
3. Dockerfile の `COPY` はビルドルート = `backend-py` 前提で記述（`uv.lock` / `packages/core` / `apps/api` を含められるように）。
4. SIGTERM(30s) の graceful shutdown、Secure Compute/Static IP 非対応の制約を許容できること。

補足: `runtime:"container"` は明示指定として正しいが、`entrypoint` に Dockerfile を指すこと自体でもコンテナビルドは成立する（Container Images の Services 例は `runtime` 省略）。両方書くのは冗長ではなく **最も明示的で推奨できる形**。
