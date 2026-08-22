# Vercel の Docker コンテナ（Services / Container Images）

`backend-py` のような **コンテナで動くサービス**を Vercel に載せるときの落とし穴。
frontend（Next.js）のデプロイ手順は `SKILL.md` 側で、ここは**コンテナ固有**。

対象: `backend-py/vercel.json` の `services` + `backend-py/` 直下の Dockerfile。

**このファイルは「ビルドは通ったのに起動しない / 500 になる」側の正本。**
配置・ファイル名・ビルドコンテキスト・モノレポで複数サービスを出す方法は
[services-container.md](services-container.md) を読む。

---

## 0. 最初に理解すること — この不具合はローカルで再現しない

コンテナが起動しない障害は、次の性質を持つ:

- **ビルドは成功する**（Vercel の deployment は READY になる）
- **型チェックも lint も unit test も CI も緑**
- **`docker build` / `docker run` もローカルでは正常に動く**
- 本番でだけ **500 `INTERNAL_FUNCTION_INVOCATION_FAILED`**
- **アプリのログが 1 行も出ない**（＝ログを見ても何も分からない）

「READY = 動いている」ではない。**デプロイ後は必ず実際に叩いて確認する**
（`curl -sS -o /dev/null -w '%{http_code}' https://<domain>/healthcheck`）。

---

## 1. 起動が無言で死ぬ 2 大原因

### ① 非 root ユーザーで特権ポート（< 1024）を bind している

```
ERROR: [Errno 13] error while attempting to bind on address ('0.0.0.0', 80): permission denied
```

- Vercel のコンテナの**既定ポートは 80**。公式:
  > "The default port is `80`, and it can be overridden by setting the `PORT`
  > environment variable in the project settings."
  > — https://vercel.com/docs/functions/container-images （Port resolution）
- しかし `USER appuser`（非 root）で動くコンテナは、`CAP_NET_BIND_SERVICE` が無いと
  **1024 未満を bind できない**。
- **ローカルの Docker は既定で特権ポートを許可する**ため、手元では 100% 動く。

**直し方（本リポジトリの形）**:

1. `Dockerfile.vercel` の `ENV PORT=8080` / `EXPOSE 8080`。
2. **Vercel project の環境変数 `PORT` も 8080 にする**。片方だけだと
   Vercel は 80 へ流し、コンテナは 8080 で待つ（= 500 のまま）。
   → `scripts/infra/vercel.sh` の `push_container_port` が Dockerfile の値を読んで自動投入する。

> root で動かして 80 のままにする選択もあるが、非 root は落としたくないので
> **本リポジトリは 8080 に寄せる**。

### ② `CMD` が `$PATH` 解決に依存している

```
exec: "api": executable file not found in $PATH
```

- Vercel はコンテナ起動前に自前の wrapper（証明書の配置等）を挟む。このとき
  **イメージの `ENV PATH`（`/app/.venv/bin` を足したもの）が起動プロセスに反映されない**
  ことがある。`CMD ["api"]` は `[project.scripts]` が `/app/.venv/bin/api` に入れた
  実行ファイルを PATH 越しに探すので、exec に失敗する。
- **この挙動は Vercel の公式ドキュメントに記載が無い**（実測で確認したもの）。
  公式サンプルが `CMD ["srvx", "--prod"]` のように書けているのは、それが既定 PATH
  （`/usr/local/bin` など）にあるからで、**venv や独自ディレクトリに置いた実行ファイルは
  同じようには解決されない**。
- exec に失敗したプロセスは**アプリのログを 1 行も出さない**。ランタイムログが空なのは
  「起動する前に死んだ」サイン。

**直し方**: `CMD` / `ENTRYPOINT` は**必ず絶対パス**で書く。

```dockerfile
CMD ["/app/.venv/bin/api"]     # ✅
CMD ["api"]                    # ❌ PATH 依存
```

`ENV PATH=...` を消す必要はない（`docker exec` で人が使うぶんには有用）。
**起動の解決に使わない**のが要点。

---

## 2. ローカルで「Vercel 相当」を作って確かめる

**Dockerfile を触ったら、これを通してから push する。** 素の `docker run` では
両方の不具合が消えてしまうので、条件を意図的に作る。

```bash
cd backend-py
docker build -f Dockerfile.vercel -t api-vercel .                 # cwd = backend-py

docker run --rm -p 8080:8080 \
  -e PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
  --sysctl net.ipv4.ip_unprivileged_port_start=1024 \
  api-vercel

curl -fsS localhost:8080/healthcheck    # → {"message":"OK"}
```

| フラグ | 何を再現しているか |
|---|---|
| `-e PATH=...`（venv を含めない） | Vercel の起動 wrapper で PATH が失われる状況（②） |
| `--sysctl net.ipv4.ip_unprivileged_port_start=1024` | 特権ポートを bind できない状況（①） |

**壊れていることの確認**（ガードが本物を捕まえているかを疑ったとき）:

```bash
docker run --rm -e PORT=80 --sysctl net.ipv4.ip_unprivileged_port_start=1024 api-vercel
# → [Errno 13] error while attempting to bind on address ('0.0.0.0', 80): permission denied

docker run --rm --entrypoint api -e PATH=/usr/local/bin:/usr/bin:/bin api-vercel
# → exec: "api": executable file not found in $PATH
```

**本番の env を使って確かめたいとき**は Doppler から直接流す。
**値をチャット・ログ・コミットに出さない**（`.claude/rules/mcp-doppler.md`）。

```bash
doppler run --project <app> --config prd -- \
  docker run --rm -p 8080:8080 --env-file /dev/stdin api-vercel <<< "$(doppler secrets download --no-file --format env)"
```

> 実際には `--env-file` に平文を落とさない形（`docker run` に `-e KEY` を列挙、または
> `doppler run` の環境をそのまま継承させる）を選ぶこと。ファイルに書いたら必ず消す。

---

## 3. 障害の切り分け順序

1. **本当に落ちているのはどれか**を確定する。web が 200 でも backend は別コンテナ。
   `/`（web）と `/healthcheck`（api）と `/mcp` を個別に叩く。
2. **ランタイムログを見る**（§4）。
   - ログに **アプリの出力がある** → アプリ内部の問題（env 不足・DB 接続・例外）。
   - ログが **空のまま** → **起動前に死んでいる**（① / ②、または OOM）。
     ここでログを掘り続けても何も出ない。§2 のローカル再現に切り替える。
3. **ローカルで Vercel 相当を再現**する（§2）。ここで再現すれば原因は確定する。
4. env の有無を疑うのは**その後**。`SUPABASE_*` / `POSTGRES_*` は Vercel Marketplace の
   Supabase 連携が、外部 API キーは Doppler→Vercel 連携が入れる
   （`.claude/rules/env-naming.md`）。**手で入れない**。

---

## 4. ランタイムログの取り方（パスを間違えやすい）

```bash
# projectId が要る。deployments/{id}/runtime-logs だけでは 404 になる
curl -N -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/projects/${PROJECT_ID}/deployments/${DEPLOYMENT_ID}/runtime-logs?teamId=${VERCEL_TEAM_ID}"
```

- `GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs`（**stream**）。
  [Vercel REST API: Get logs for a deployment](https://vercel.com/docs/rest-api/logs/get-logs-for-a-deployment)
- CLI なら `vercel logs <deployment-url>`（`vercel inspect --logs` も可）。
- **空で返ってくることがある**（既知の挙動）。**空 = 障害が無い、ではない**。
  上の §3-2 のとおり「起動前に死んだ」可能性を先に潰す。
- コンテナの `stdout` / `stderr` はリクエストに紐づかないため、
  「inflight の全リクエストへ broadcast される」形で出る（公式 Observability の記述）。
- dashboard の **Project > Logs（Runtime Logs）** が最短。人に見てもらえるなら頼む。

---

## 5. 新しいコンテナサービスを足すときのチェックリスト

| # | 確認 |
|---|---|
| 1 | Dockerfile を **workspace ルート直下に blessed 名で**作り（[services-container.md](services-container.md)）、`vercel.json` の `services` と `rewrites` に足したか |
| 2 | `services.<app>.runtime = "container"` を明示したか（無いと runtime 自動検出で entrypoint を `module:app` と誤解する） |
| 3 | `0.0.0.0` で listen しているか（`127.0.0.1` はトラフィックを受けられない） |
| 4 | ポートを `$PORT` から読んでいるか。非 root なら **1024 以上**か |
| 5 | Vercel project の env `PORT` をコンテナと同じ値にしたか |
| 6 | `CMD` / `ENTRYPOINT` が**絶対パス**かつ exec 形式（JSON 配列）か |
| 7 | SIGTERM で graceful shutdown するか（scale-in は SIGTERM + 30s grace） |
| 8 | §2 のローカル再現を通したか |
| 9 | デプロイ後に**実際に叩いて** 2xx を確認したか |

1〜2 と 4・6 は `backend-py/apps/api/tests/test_vercel_container_contract.py` が CI で検査する。
**このテストを消さない**（無変換でも画面が出てしまう storage-image と同じで、静的検査でしか止まらない）。

---

## 6. その他の仕様（設計時に効くもの）

| 項目 | 内容 |
|---|---|
| scale-in | 本番はトラフィック無しで 5 分、preview は 30 秒でスケールダウン |
| 終了 | `SIGTERM` + **30 秒**の grace。uvicorn は graceful shutdown する |
| 課金 | Vercel Functions の Active CPU 課金（I/O 待ち中は課金されない） |
| 非対応 | **Secure Compute / Static IP はコンテナでは未対応**（IP 許可制の外部連携は要検討） |
| 権限 | Services / Container Images は **Permissions Required** 機能。アカウント側で有効か確認 |
| ビルド | Root Directory = `backend-py`、`services.<app>.root = "."`、`entrypoint` は `root` からの相対 |

---

## 参考

- [Vercel: Container Images](https://vercel.com/docs/functions/container-images) — Port resolution / scale-in / SIGTERM / 非対応機能
- [Vercel: Services](https://vercel.com/docs/services) / [config reference](https://vercel.com/docs/services/config-reference) / [routing](https://vercel.com/docs/services/routing)
- [Vercel REST API: Get logs for a deployment](https://vercel.com/docs/rest-api/logs/get-logs-for-a-deployment)
- 本リポジトリ: `backend-py/Dockerfile.vercel`（冒頭コメントが正本）/
  `backend-py/apps/api/tests/test_vercel_container_contract.py` /
  `scripts/infra/vercel.sh` / `docs/_research/2026-07-07-vercel-container-services.md`
