---
name: fal
description: 本リポジトリで fal.ai（画像・動画・音声などの生成 AI 推論、serverless GPU）を実装するときのガイダンス。同期 subscribe とキュー submit の使い分け、Webhook でのコールバック、`FAL_KEY` を絶対にクライアントへ出さないための proxy 構成、backend-py / Edge Functions のどちらに置くかの判断、そして fal のツール窓口を **CLI に一元化**（fal-ai MCP は廃止）したうえで、認証が 2 系統（アプリは API キー、CLI は `fal auth login` の OAuth）に分かれていて devenv が流す `FAL_KEY` が OAuth を上書きしてしまう罠を扱う。「画像生成」「動画生成」「image generation」「text-to-image」「Flux」「生成モデルを呼びたい」「GPU 推論」「fal」といった話題が出たら、ユーザーが fal.ai の名前を出していなくても必ず最初に起動すること。公式 Agent Skill が存在しないサービスなので、鍵の扱いと配置ルールはこのスキルが唯一の拠り所になる。
---

# fal.ai（生成 AI 推論 / serverless GPU）

`.claude/CLAUDE.md` の AI/ML プロバイダに **FAL** として載っている。
**アプリ側の実装コードはまだ無い**ので、このスキルは「これから書くときの設計判断」を固定するためのもの。公式 Agent Skill は存在しない。

**fal を触る窓口は `fal` CLI に一元化している**（`.mcp.json` にあった `fal-ai` MCP は廃止した）。
CLI は devenv が提供する（`scripts.fal` = `uvx fal` のラッパ）。調査記録: `docs/_research/2026-08-06-service-clis.md`

> **併読必須**: `.claude/skills/ai-usage-metering/` も起動すること。fal は**トークンではなく実行秒数・枚数・解像度**で課金されるため、
> レスポンスに usage が無いケースがある。数量が確定する場所（リクエストのパラメータ、または Webhook 側）で記録する。

---

## 1. 最重要: `FAL_KEY` はサーバ側にしか置けない

`FAL_KEY` は課金に直結する。**ブラウザ / Expo アプリに置いた時点で他人に GPU 代を使われる。**

fal 公式が用意している逃げ道は 2 つで、本リポジトリでは **A を既定**とする:

| | 構成 | 採否 |
|---|---|---|
| **A. サーバ経由** | クライアント → 自分のサーバ（Edge Function / backend-py）→ fal | **既定**。入力検証・レート制限・利用量記録を自分で持てる |
| B. fal の client proxy | クライアント SDK → 自前の proxy エンドポイント → fal | A で足りないとき（ストリーミング等）のみ検討 |

`NEXT_PUBLIC_FAL_*` / `EXPO_PUBLIC_FAL_*` という環境変数は**作らない**。

---

## 2. どこに実装するか（supabase-first の判断）

`.claude/rules/supabase-first.md` の決定順に当てはめる:

| ケース | 置き場所 | 理由 |
|---|---|---|
| 短時間で返る単発推論（数秒で終わる画像生成など） | **Edge Function** | 既定どおり。外部 API 連携で単発・短時間 |
| **完了 Webhook の受信** | **Edge Function** | Webhook ハンドラは Edge Functions の典型用途 |
| 動画生成など**数十秒〜数分**かかるジョブ | **backend-py**（または Edge Function で `submit` して webhook で受ける） | Edge Function のタイムアウトを超える = エスカレーション条件「長時間処理」 |
| LangChain / LangGraph のパイプラインに組み込む | **backend-py** | エスカレーション条件「LLM 処理 / エージェント的処理」 |

**判断のコツ**: 「待たせるか、投げっぱなしにするか」で分かれる。
数分かかるジョブを Edge Function で同期的に待つのは必ず失敗するので、その場合は
`submit` + `webhook_url` にして **リクエストと結果受信を別の関数に分ける**。

---

## 3. 認証は 2 系統ある（混同しない）

fal には **API キー**と **OAuth（ユーザー）** の 2 つの資格情報があり、**用途が違う**。

| 経路 | 資格情報 | 取得方法 | どこで使う |
|---|---|---|---|
| **アプリコード**（`fal_client`） | **API キー** `FAL_KEY`（`key_id:key_secret` 形式） | ダッシュボード or `fal keys create --scope API` | Edge Function / backend-py。env から自動で読まれる |
| **`fal` CLI（ローカル）** | **OAuth（Auth0 device flow, RFC 8628）** | `fal auth login` → ブラウザで GitHub / Google / SSO を選択 | 開発者の手元。**資格情報は `~/.fal/auth0_token` に保存され、他マシンへ持ち出せない** |
| **`fal` CLI（CI / クラウド sandbox）** | **API キー**（deploy 等をするなら ADMIN スコープ） | `fal keys create --scope ADMIN` | GitHub Actions / Claude Code on the web 等。**ブラウザが無いので OAuth は使えない** |

### 資格情報の解決順（fal 1.79.1 `fal/auth/__init__.py::key_credentials` で確認）

1. **`FAL_FORCE_AUTH_BY_USER=1` が立っていたら key 系を全部無視**して OAuth トークンへ倒れる
2. `FAL_KEY`（env）
3. `~/.fal` の profile key（`fal profile key`）
4. Google Colab の `FAL_KEY`
5. `FAL_KEY_ID` + `FAL_KEY_SECRET`
6. どれも無ければ `~/.fal/auth0_token` の OAuth（`fal auth login`）

つまり **`FAL_KEY` が env にあると `fal auth login` 済みでも常にキー側が勝つ**。

### ⚠️ このリポジトリ固有の罠と、その解決（`fal` script が吸収済み）

本リポジトリは `devenv shell` 進入時に **`loadDopplerByEnv` が Doppler のシークレットを丸ごと env へ export する**。
素の `uvx fal` を叩くと、Doppler の `FAL_KEY` がローカルでも常に OAuth を上書きしてしまう
（症状: `fal deploy` が権限エラー／個人アカウントのつもりがチーム共有キーの principal で動く）。

そこで devenv の **`fal` script が実行環境を見て認証モードを決めてから CLI を起動する**。
**手で `uvx fal` を叩かず、必ず `fal` script を使うこと**（`.claude/rules/commands.md`）。

| 環境 | mode | 使う資格情報 | script がやること |
|---|---|---|---|
| 開発者のローカルマシン（既定） | `user` | `fal auth login` の OAuth | `FAL_KEY` / `FAL_KEY_ID` / `FAL_KEY_SECRET` を unset し `FAL_FORCE_AUTH_BY_USER=1` を立てる |
| クラウド sandbox（Claude Code on the web / Codespaces / Gitpod） | `key` | Doppler の `FAL_ADMIN_KEY` → 無ければ `FAL_KEY` | キー未設定なら**エラーで停止**（黙って OAuth に落ちない） |
| CI（GitHub Actions） | `key` | 同上 | 同上 |

判定材料は `CI` / `GITHUB_ACTIONS` / `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` / `CODESPACES` / `GITPOD_WORKSPACE_ID`。
**ローカルの Claude Code でも立つ `CLAUDECODE` / `IS_SANDBOX` は判定に使わない**（ローカルは OAuth を通せるため）。
明示上書きは **`FAL_AUTH_MODE=user|key`**:

```bash
fal auth whoami                  # 今どの principal で動いているか ← 迷ったらまずこれ
FAL_AUTH_MODE=key fal <cmd>      # ローカルで CI 相当（キー）を再現したい
FAL_AUTH_MODE=user fal <cmd>     # sandbox でも自分の OAuth を使いたい（要 fal auth login）
fal profile set <name>           # 複数キーの切り替え（~/.fal に保存）
```

**アプリ用（API スコープ）と CLI/CI 用（ADMIN スコープ）を 1 つの `FAL_KEY` で兼ねない。**
ADMIN キーはアカウント全体を操作できるので、Edge Function / backend-py のランタイムへ配ってはいけない。
`fal` script が `FAL_ADMIN_KEY` を優先するのはこのため（アプリに配る `FAL_KEY` は API スコープのまま据え置ける）。

### Doppler 上の扱い

`FAL_` は予約 prefix（`GITHUB_` / `SUPABASE_` / `VERCEL_`）に当たらないので **Doppler にそのままの名前で置ける**
（`.claude/rules/env-naming.md`）。書き込みは `doppler` MCP 経由で、**値をチャット / ログ / コミットに出さない**
（`.claude/rules/mcp-doppler.md`）。

| キー | スコープ | 用途 |
|---|---|---|
| `FAL_KEY` | **API** | アプリ実行時（`fal_client`）。CI / sandbox の CLI もこれで足りる（deploy 以外） |
| `FAL_ADMIN_KEY` | **ADMIN** | `fal deploy` 等。**任意**。置けば CLI が自動で優先する |

> boilerplate の共通 Doppler（project `all` / config `all`）には **ダミーの `FAL_KEY` を登録済み**。
> 派生プロジェクトで fal を実際に使うときに実キーへ差し替えること（ダミーのままだと当然 401 になる）。

---

## 4. 呼び出し方（3 つのモードを使い分ける）

fal のクライアントは Python / JS / Swift / Java / Kotlin / Dart で **同じ 4 メソッド**（`subscribe` / `submit` / `run` / `stream`）を提供する。
サーバ側環境では `FAL_KEY` を env から自動で読む。

### 4.1 `subscribe` — キューに投げて結果まで待つ（既定）

自動リトライ・タイムアウト処理込みでブロッキングに書ける。**短時間で返るモデルはこれ。**

```python
import fal_client

result = fal_client.subscribe("fal-ai/flux/schnell", arguments={
    "prompt": "a sunset over mountains",
})
image_url = result["images"][0]["url"]
```

### 4.2 `submit` — 投げっぱなし（長時間ジョブ）

ハンドラが返るので、`request_id` を DB に持っておいて後で照会する。

```python
handler = fal_client.submit("fal-ai/flux/schnell", arguments={"prompt": "..."})
handler.request_id        # ← これを DB に保存する
handler.status()          # 状態照会
handler.get()             # 完了後の取得
```

### 4.3 `submit` + `webhook_url` — 完了通知を受ける（推奨: 長時間ジョブ）

ポーリングを持たなくて済むので、Edge Functions と相性が良い。

```python
handler = fal_client.submit(
    "fal-ai/flux/schnell",
    arguments={"prompt": "..."},
    webhook_url="https://<project>.supabase.co/functions/v1/fal-webhooks?secret=...",
)
```

Webhook を受ける Edge Function は `supabase/functions/onesignal-webhooks/` と同じ形にする:

1. **共有シークレット検証**（クエリ or ヘッダ）。検証なしで公開すると誰でも偽の完了通知を投げられる
2. `request_id` で **冪等**に処理する（重複配信されうる）
3. `supabase-js` の `{ error }` は必ずチェックしてログ + 明示的な失敗にする（`.claude/rules/error-handling.md`）

---

## 5. ジョブの状態を DB に持つ

長時間ジョブを扱うなら、**`request_id` と状態を自分の DB に持つ**のが基本。
持たないと「生成中なのか失敗したのか」をユーザーに出せず、Webhook の取りこぼしにも気づけない。

- テーブルは **Drizzle が source of truth**（`drizzle/schema/`）。マイグレーションは `devenv tasks run app:migrate-dev`
- RLS を必ず張り、**自分のジョブしか見えない**ようにする（`.claude/skills/rls/`）
- 生成物（画像 / 動画）を保存するなら **Private バケット + `createSignedUrl`** が既定
  （`.claude/rules/supabase-first.md` の Storage Policy）。パスは `users/{user_id}/generations/{id}.png` のような
  RESTful 階層にする
- 日時は **UTC + `withTimezone: true`**（`.claude/rules/datetime.md`）

---

## 6. ツールの窓口は `fal` CLI 一本（MCP は廃止）

以前は `fal-ai` MCP（`https://mcp.fal.ai/mcp` を `Bearer ${FAL_KEY}` で叩く HTTP MCP）を `.mcp.json` に
配線していたが、**廃止して CLI に一元化した**。理由:

- **認証が二重になる**。MCP は API キー固定、CLI は既定で OAuth。同じ「fal を触る」操作が
  エージェントの選んだ経路次第で**別の principal**になり、権限エラーの原因が特定できない
- CLI だけでモデル検索・実行・キュー確認・デプロイまで足りる（MCP に固有の機能が無い）
- 経路が 1 本なら、§3 の環境別モード解決（ローカル=OAuth / sandbox=Doppler のキー）を
  **`fal` script 1 か所に閉じ込められる**

| やりたいこと | 使うもの | 認証 |
|---|---|---|
| モデルを探す / 動作を試す / キューの状態を見る | **`fal` CLI** | §3 のモード解決に従う |
| 自前の serverless 関数を fal 上にデプロイする | **`fal` CLI**（`fal deploy my_app.py`） | ローカル=OAuth / CI=ADMIN スコープキー |
| 既製モデル（`fal-ai/flux/...` など）を叩くだけ | **CLI 不要** — アプリコードから client を呼ぶ | `FAL_KEY`（API スコープ） |

```bash
fal auth whoami             # 今どの principal で動いているかを確認 ← 迷ったらまずこれ
fal auth login              # ブラウザで GitHub / Google / SSO を選択（--connection github で省略可）
fal auth login --no-browser # SSH 越し等、ブラウザを開けない環境では URL を表示するだけにする
```

CLI は devenv の `fal` script（`uvx fal` のラッパ）経由で提供している
（Python 製。backend-py の依存には入れていない = 運用ツールなので）。

> ⚠️ **`fal` CLI が要るのは「自前モデルをホストする」場合だけ**。
> 既製モデルを使うだけなら `fal_client` の依存を足すだけでよく、CLI は不要。
>
> ⚠️ **`fal auth login` したのに挙動が変**なら §3 の優先順位を疑い、まず `fal auth whoami`。
> `fal` script 経由なら Doppler の `FAL_KEY` はローカルで自動的に無効化されるが、
> `uvx fal` を直接叩くとこのガードが効かない。

### backend-py に依存を足すとき

uv workspace なので `--package` 必須（`.claude/rules/python-monorepo.md`）:

```bash
cd backend-py && uv add --package api fal-client
```

> `src/fal/` というパッケージ名は付けないこと。依存している `fal` / `fal_client` を import shadow する
> （python-monorepo.md §4）。`src/generation/` などにする。

---

## 7. テスト方針

`.claude/rules/backend-py.md` / `.claude/skills/python-testing/` のとおり、
**外部 SDK を丸ごと Mock しない**。`fal_client` は本物を使い、**HTTP 層だけ差し替える**。
そうしないと引数の型ミスや戻り値のキー違い（`result["images"][0]["url"]` の形が変わった等）を
単体テストで検知できず、本番で初めて `TypeError` / `KeyError` になる。

---

## 8. 公式リファレンス

推測で API を書かないための一次情報:

- [fal client](https://fal.ai/docs/model-apis/client)（`subscribe` / `submit` / `run` / `stream` と鍵の扱い）
- [Queue & webhooks](https://fal.ai/docs/model-apis/model-endpoints/queue)
- [Model APIs](https://fal.ai/docs/model-apis)（モデルごとの入出力スキーマ）
- [Private serverless models](https://docs.fal.ai/private-serverless-models/)（`fal` CLI でのデプロイ）

モデルごとに入出力スキーマが違うので、**使うモデルのページを必ず確認してから引数を書く**
（`.claude/rules/research.md`）。`fal-ai` MCP でモデルスキーマを引くのが最短。
