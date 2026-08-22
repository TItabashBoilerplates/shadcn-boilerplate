# Vercel コンテナが「デプロイ成功・実行時 500」になる 2 つの原因（実測）

## 調査情報

- **調査日**: 2026-08-22
- **対象**: Vercel Services / Container Images（`backend-py` の `apps/*/Dockerfile.vercel`）
- **きっかけ**: 派生プロジェクトで web は 200 なのに api / mcp のコンテナが
  `500 INTERNAL_FUNCTION_INVOCATION_FAILED` になり、**ランタイムログが 1 行も出なかった**
- **結論**: 原因は 2 つ重なっていた。**どちらもローカルの `docker run` では再現しない**ため、
  boilerplate 側で（実装 + 静的検査 + skill）再発を止める

## 症状の性質（これが厄介な理由）

| 観点 | 結果 |
|---|---|
| `docker build` | 成功 |
| Vercel の deployment | **READY** |
| 型 / lint / unit test / CI | すべて緑 |
| ローカルの `docker run` | **正常に起動して 200 を返す** |
| 本番のリクエスト | 500 `INTERNAL_FUNCTION_INVOCATION_FAILED` |
| ランタイムログ | **空**（アプリの出力が 1 行も無い） |

「READY = 動いている」ではない。**デプロイ後に実際に叩くまで分からない。**

## 原因 ①: 非 root ユーザーが特権ポート（< 1024）を bind できない

```
ERROR: [Errno 13] error while attempting to bind on address ('0.0.0.0', 80): permission denied
```

- Vercel のコンテナの既定ポートは **80**。公式:
  > "The default port is `80`, and it can be overridden by setting the `PORT` environment
  > variable in the project settings."
  > — https://vercel.com/docs/functions/container-images （Port resolution）
- 一方 `Dockerfile.vercel` は `USER appuser`（uid 10001）で動く。非 root は
  `CAP_NET_BIND_SERVICE` が無いと 1024 未満を bind できない。
- **ローカルの Docker は既定で特権ポートを許可する**（`net.ipv4.ip_unprivileged_port_start=0`）
  ため、手元では 100% 動いてしまう。

**対処**: `ENV PORT=8080` + `EXPOSE 8080`、そして **Vercel project の env `PORT` も 8080**。
片方だけでは Vercel が 80 へ流し、コンテナは 8080 で待つ（500 のまま）。

## 原因 ②: `CMD` が `$PATH` 解決に依存していた（主犯）

```
exec: "api": executable file not found in $PATH
```

- `CMD ["api"]` は `ENV PATH="/app/.venv/bin:$PATH"` に依存していた。
- Vercel はコンテナ起動前に自前の wrapper を挟み、**イメージの `ENV PATH` が起動プロセスに
  反映されないことがある**。公式ドキュメントに記載は無く（2026-08 時点）、実測で確認した挙動。
  公式サンプルの `CMD ["srvx", "--prod"]` が動くのは、それが既定 PATH 上にあるため。
- exec に失敗したプロセスは**ログを 1 行も出さずに死ぬ**ので、ランタイムログからは何も分からない。

**対処**: `CMD` / `ENTRYPOINT` は**絶対パス**で書く（`["/app/.venv/bin/api"]`）。

## 再現方法（このリポジトリで実際に確認した）

```bash
cd backend-py
docker build -f apps/api/Dockerfile.vercel -t api-vercel .

# 修正後 = Vercel 相当の条件でも起動する
docker run --rm -p 8080:8080 \
  -e PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
  --sysctl net.ipv4.ip_unprivileged_port_start=1024 api-vercel
# → Uvicorn running on http://0.0.0.0:8080 / GET /healthcheck 200

# ① の再現
docker run --rm -e PORT=80 --sysctl net.ipv4.ip_unprivileged_port_start=1024 api-vercel
# → [Errno 13] ... bind on address ('0.0.0.0', 80): permission denied

# ② の再現
docker run --rm --entrypoint api -e PATH=/usr/local/bin:/usr/bin:/bin api-vercel
# → exec: "api": executable file not found in $PATH
```

## ランタイムログの取り方（パスを間違えると 404）

```
GET https://api.vercel.com/v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs
```

- **パスに projectId が要る**。`/v1/deployments/{id}/runtime-logs` 等は 404。
  （[Vercel REST API: Get logs for a deployment](https://vercel.com/docs/rest-api/logs/get-logs-for-a-deployment)）
- stream で返る。**空で返ることがあり、空は「正常」を意味しない**
  （起動前に死んでいると何も出ない）。
- dashboard の Project > Logs（Runtime Logs）が最短。

## この調査を受けて boilerplate に入れたもの

| 何 | どこ |
|---|---|
| 実装の修正（PORT 8080 / 絶対パス CMD）と**理由のコメント** | `backend-py/apps/api/Dockerfile.vercel` |
| 静的検査（非 root × 特権ポート / CMD の絶対パス / EXPOSE 整合 / vercel.json の entrypoint 実在） | `backend-py/apps/api/tests/test_vercel_container_contract.py` |
| Vercel project への `PORT` 自動投入（Dockerfile から読む） | `scripts/infra/vercel.sh` の `push_container_port` |
| 切り分け手順・再現レシピ・ログの取り方 | `.claude/skills/vercel-deploy/references/containers.md` |
| トラブルシュート表・検証チェックリスト | `docs/deployment/README.md` |

## 参考

- [Vercel: Container Images](https://vercel.com/docs/functions/container-images)
- [Vercel: Services](https://vercel.com/docs/services) / [config reference](https://vercel.com/docs/services/config-reference)
- [Vercel REST API: Get logs for a deployment](https://vercel.com/docs/rest-api/logs/get-logs-for-a-deployment)
- `docs/_research/2026-07-07-vercel-container-services.md`（vercel.json の妥当性検証）
