# Vercel REST API リファレンス（本リポジトリで使うぶんだけ）

`scripts/infra/vercel_lib.sh` の `vapi` ヘルパが叩いているエンドポイント。
script で足りないことをやるときの原典として使う。

認証は **Bearer token**。`teamId` / `slug` はクエリパラメータで渡す
（`vapi` は `VERCEL_TEAM_ID` があれば自動で付ける）。

```bash
curl -fsS "https://api.vercel.com/v9/projects?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VC_TOKEN" | jq
```

## エンドポイント一覧

| 用途 | Method | Path | 備考 |
|---|---|---|---|
| project 作成 | POST | `/v11/projects` | **git 連携を張れるのはここだけ** |
| project 取得 | GET | `/v9/projects/{idOrName}` | 404 = 未作成 |
| project 更新 | PATCH | `/v9/projects/{idOrName}` | `rootDirectory` / `framework` / `buildCommand` / `installCommand` / `devCommand`。**`gitRepository` は無い** |
| project 一覧 | GET | `/v10/projects` | scope の確認に |
| ドメイン一覧 | GET | `/v9/projects/{idOrName}/domains` | `?target=production&limit=1` |
| env 作成/更新 | POST | `/v10/projects/{idOrName}/env` | `?upsert=true` で冪等 |
| env 一覧 | GET | `/v10/projects/{idOrName}/env` | 値は暗号化されて返る |
| team 一覧 | GET | `/v2/teams` | scope 解決 |
| team 取得 | GET | `/v2/teams/{id}` | `.slug` は CLI の `--scope` に使う |
| 個人アカウント | GET | `/v2/user` | team が無い場合の `.user.username` |

## project 作成の body

```json
{
  "name": "myapp-lp",
  "framework": "nextjs",
  "rootDirectory": "frontend/apps/lp",
  "gitRepository": { "type": "github", "repo": "owner/repo" }
}
```

| フィールド | 制約 |
|---|---|
| `name` | 必須・最大 100 文字 |
| `framework` | nullable。`null` = framework 指定なし（Dockerfile コンテナ等） |
| `rootDirectory` | nullable・最大 256 文字。`null` = リポジトリルート |
| `gitRepository.type` | `github` / `github-limited` / `gitlab` / `bitbucket` 等 |
| `gitRepository.repo` | `"owner/repo"` 形式 |
| `buildCommand` / `installCommand` | nullable・最大 256 文字。`null` = 自動検出 |

> 本リポジトリでは build/install は **`<app>/vercel.json` 側**に書く（`cd ../..` でルートへ戻す）。
> API 側では指定しない — 2 か所に散らすと drift する。

## env 作成の body

```json
{
  "key": "NEXT_PUBLIC_APP_URL",
  "value": "https://myapp-lp.vercel.app",
  "type": "plain",
  "target": ["production", "preview"]
}
```

| `type` | 使いどころ |
|---|---|
| `plain` | 公開値（`NEXT_PUBLIC_*` 等）。dashboard で読める |
| `encrypted` | 非公開値。既定 |

ブランチ別に出し分けたいときは `target: ["preview"]` + `gitBranch: "staging"`
（`scripts/infra/vercel_lib.sh` の `vercel_env_set` がこの形）。

## 出典

- [Create a new project](https://vercel.com/docs/rest-api/reference/endpoints/projects/create-a-new-project)
- [Update an existing project](https://vercel.com/docs/rest-api/reference/endpoints/projects/update-an-existing-project)
- [projects エンドポイント一覧](https://vercel.com/docs/rest-api/projects)
- [vercel deploy CLI](https://vercel.com/docs/cli/deploy) / [vercel link](https://vercel.com/docs/cli/link) / [global options](https://vercel.com/docs/cli/global-options)
