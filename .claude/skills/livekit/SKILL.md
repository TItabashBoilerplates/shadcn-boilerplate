---
name: livekit
description: 本リポジトリで LiveKit（リアルタイム音声・映像 / WebRTC / 音声 AI エージェント）を実装するときのガイダンス。アクセストークン発行をどこに置くか、room 管理、`lk` CLI の使い方、backend-py（uv workspace）への配置、Doppler での鍵管理を扱う。「ビデオ通話」「音声通話」「リアルタイム音声」「WebRTC」「voice agent」「音声エージェント」「画面共有」「room に参加」「LiveKit」といった話題が出たら、ユーザーが LiveKit の名前を出していなくても必ず最初に起動すること。公式 Agent Skill が存在しないサービスなので、配置ルール（トークン発行を絶対にクライアントへ出さない等）はこのスキルが唯一の拠り所になる。
---

# LiveKit（リアルタイム音声・映像 / 音声 AI エージェント）

`.claude/CLAUDE.md` の AI/ML スタックに **Real-time: LiveKit** として載っているが、**実装コードはまだ無い**。
このスキルは「これから書くときに、どこに何を置くか」を決めるためのもの。公式 Agent Skill は存在しない。

CLI (`lk`) は devenv が提供済み（`pkgs.livekit-cli`）。調査記録: `docs/_research/2026-08-06-service-clis.md`

---

## 1. 最重要: トークン発行はサーバ側にしか置けない

LiveKit のアクセストークンは **API Secret で署名した JWT**。
つまり `LIVEKIT_API_SECRET` を持てる場所でしか発行できず、**ブラウザ / Expo アプリに置いた時点で全 room を掌握される**。

```
[client] ──① トークンをリクエスト──▶ [サーバ側] ──② API Secret で JWT 署名
   │                                        │
   └────────── ③ token + wsUrl ◀────────────┘
   │
   └──④ token を持って LiveKit サーバへ WebRTC 接続
```

`NEXT_PUBLIC_` / `EXPO_PUBLIC_` prefix を付けてよいのは **`LIVEKIT_URL`（ws エンドポイント）だけ**。
`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` は絶対にクライアントへ出さない。

---

## 2. どこに実装するか（supabase-first の判断）

`.claude/rules/supabase-first.md` の決定順に当てはめると:

| やること | 置き場所 | 理由 |
|---|---|---|
| **トークン発行**（room 参加 JWT を返すだけ） | **Edge Function** | 短時間で完結する署名処理。既定どおり Edge Functions が第一候補 |
| **room の作成 / 削除 / 参加者一覧**（RoomService API 呼び出し） | **Edge Function** | 単発の外部 API 呼び出し |
| **Webhook 受信**（room_started / participant_joined 等） | **Edge Function** | OneSignal Webhook と同じ形（`supabase/functions/onesignal-webhooks/` が参考実装） |
| **音声 AI エージェント**（LiveKit Agents で room に常駐し STT→LLM→TTS を回す） | **backend-py** | エスカレーション条件の「LLM 処理」「エージェント的処理」「長時間処理」に該当。Edge Function では実現不可 |

**「LiveKit だから backend-py」ではない。** トークン発行だけなら Edge Function に置くこと。
backend-py を選ぶなら、どのエスカレーション条件に当たるかを明示してから書く（supabase-first.md の Justification Required）。

---

## 3. 環境変数

| キー | 置き場所 | 備考 |
|---|---|---|
| `LIVEKIT_URL` | 非機密 → `env/backend/.env.local` / `env/frontend/.env.local` | `wss://...`。クライアントにも渡すので `NEXT_PUBLIC_LIVEKIT_URL` / `EXPO_PUBLIC_LIVEKIT_URL` を別途用意する |
| `LIVEKIT_API_KEY` | **Doppler** | サーバ側のみ |
| `LIVEKIT_API_SECRET` | **Doppler** | サーバ側のみ。**公開したら即ローテーション** |

`LIVEKIT_` は予約 prefix（`GITHUB_` / `SUPABASE_` / `VERCEL_`）に当たらないので **Doppler にそのままの名前で置ける**
（`.claude/rules/env-naming.md`）。書き込みは `doppler` MCP 経由で、**値をチャット / ログ / コミットに出さない**
（`.claude/rules/mcp-doppler.md`）。

---

## 4. Python（backend-py）での書き方

`livekit-api` パッケージ。**uv workspace なので依存追加は `--package` 必須**（`.claude/rules/python-monorepo.md`）:

```bash
cd backend-py && uv add --package api livekit-api
# エージェントを作るなら: uv add --package <svc> "livekit-agents[openai]"
```

### トークン発行

```python
from livekit.api import AccessToken, VideoGrants

token = (
    AccessToken()                       # 引数なしなら LIVEKIT_API_KEY / LIVEKIT_API_SECRET を env から読む
    .with_identity(user_id)             # Supabase auth.users.id を入れる（後述）
    .with_grants(VideoGrants(room_join=True, room=room_name))
    .to_jwt()
)
```

エージェントを room に自動参加させたい場合は `.with_room_config(RoomConfiguration(agents=[RoomAgentDispatch(...)]))` を足す。

### RoomService（room の操作）

```python
import os
from livekit import api

client = api.LiveKitAPI(
    os.environ["LIVEKIT_URL"],
    os.environ["LIVEKIT_API_KEY"],
    os.environ["LIVEKIT_API_SECRET"],
)
await client.room.delete_room(api.DeleteRoomRequest(room=room_name))
```

### エラーハンドリング

`.claude/rules/error-handling.md` に従い、**Gateway / UseCase では握りつぶさず raise**、
FastAPI の `@app.exception_handler` で一括処理する。接続失敗を握りつぶして空トークンを返すのは禁止
（クライアントが「繋がらない」としか分からなくなる）。

### 新しいサービスとして切る場合

音声エージェントは常駐プロセスなので、`backend-py/apps/<name>/` を **src-layout** で追加し、
`devenv.nix` の `processes` に `start.enable = false` の opt-in プロセスとして宣言する。
手順は `.claude/rules/python-monorepo.md` §10-11 と `.claude/skills/python-monorepo/`。

> ⚠️ **パッケージ名の衝突に注意**: `src/livekit/` という名前を付けると、依存している `livekit` パッケージを
> import shadow して本物の SDK が `ModuleNotFoundError` になる（python-monorepo.md §4）。`src/voice_agent/` 等にする。

---

## 5. identity は Supabase の `user.id` に揃える

LiveKit の participant `identity` を Supabase `auth.users.id` にしておくと、
room 内の参加者と DB のユーザーが 1:1 で対応し、権限判定と監査が単純になる。
OneSignal で `external_id = user.id` に揃えているのと同じ発想で、**識別子の正本を Supabase 側に一本化する**。

トークン発行エンドポイントは **必ず呼び出し元の JWT を検証してから** その user.id で発行すること。
クライアントから渡された identity をそのまま署名すると、任意のユーザーになりすませる。

---

## 6. `lk` CLI（devenv 提供済み）

ローカル検証用。認証は `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`（devenv shell が env をロード済み）。

```bash
lk token create --join --room dev-room --identity me --valid-for 1h   # 手検証用トークン
lk room list                                                          # room 一覧
lk room participants list --room dev-room                             # 参加者
lk app env -w                                                         # LiveKit Cloud の鍵を .env.local へ書き出す
```

> `lk app env -w` は鍵をファイルへ書き出す。**このリポジトリのシークレット正本は Doppler** なので、
> 書き出したファイルをコミットしないこと。値は `doppler` MCP で Doppler に入れる。

---

## 7. フロントエンド

- Web: `@livekit/components-react` + `livekit-client`。トークンはサーバから取得し、**クライアントに鍵を置かない**
- Mobile: `@livekit/react-native`。Expo では config plugin と `expo prebuild` が必要になる（Expo Go では動かない）
- UI コンポーネントは **単体テスト不要 / Storybook 必須**、接続ロジック（`model/` のフック）は **TDD 対象**

---

## 8. 公式リファレンス

推測で API を書かないための一次情報:

- [LiveKit Docs](https://docs.livekit.io/) / [Authentication](https://docs.livekit.io/home/get-started/authentication/)
- [Server SDK (Python)](https://docs.livekit.io/reference/server-sdks/) / [Agents framework](https://docs.livekit.io/agents/)
- [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup/)

バージョン差が大きいライブラリなので、実装前に **Context7 MCP または公式ドキュメント**で現行 API を必ず確認すること
（`.claude/rules/research.md`）。
