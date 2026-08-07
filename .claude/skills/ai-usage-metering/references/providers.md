# プロバイダ別: usage の取り出し方と計上の罠

> **このファイルの使い方**: 実装するプロバイダの節だけ読む。
> **単価（金額）は意図的に書いていない**。改定されるため、必ず公式の料金ページを確認して単価表（`data-model.md`）に登録すること。
> ここに書くのは「どのフィールドを、どう足すか」という**構造**であり、これはめったに変わらない。

## 目次

1. [最重要: 内数か外数か](#1-最重要-内数か外数か)
2. [OpenAI](#2-openai)
3. [Anthropic (Claude)](#3-anthropic-claude)
4. [Google Gemini](#4-google-gemini)
5. [LangChain / LangGraph 経由](#5-langchain--langgraph-経由)
6. [Vercel AI SDK 経由](#6-vercel-ai-sdk-経由)
7. [ストリーミングの罠](#7-ストリーミングの罠)
8. [非トークン課金（画像・音声・動画）](#8-非トークン課金画像音声動画)
9. [新しいプロバイダを足すときの手順](#9-新しいプロバイダを足すときの手順)

---

## 1. 最重要: 内数か外数か

**同じ「キャッシュ読み込み 1920 トークン」でも、プロバイダによって入力トークンに含まれたり含まれなかったりする。**
ここを間違えると、コストが体感で数倍ずれる。しかも**テストでは気づけない**（数字は出るので）。

| プロバイダ | キャッシュ読み込みトークンは入力に含まれるか | 合計入力の求め方 |
|---|---|---|
| **OpenAI** | **含まれる（内数）**。`prompt_tokens_details.cached_tokens` は `prompt_tokens` の内訳 | 非キャッシュ入力 = `prompt_tokens - cached_tokens` |
| **Anthropic** | **含まれない（外数）**。`input_tokens` は最後のキャッシュ区切り以降のみ | `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` |
| **Gemini** | `cachedContentTokenCount` は `promptTokenCount` の内訳（内数） | 非キャッシュ入力 = `promptTokenCount - cachedContentTokenCount` |

Anthropic 公式の明記:

> The `input_tokens` field represents only the tokens that come after the last cache breakpoint in your request - not all the input tokens you sent.
> `total_input_tokens = cache_read_input_tokens + cache_creation_input_tokens + input_tokens`

**実装ルール**: プロバイダごとのパーサで**「非キャッシュ入力」「キャッシュ読み」「キャッシュ書き」を分離した正規化済みの形**に変換し、
それ以降は共通の型で扱う。内数/外数の差はパーサの中に閉じ込める（各所で `- cached` を書くと必ずどこかで漏れる）。

---

## 2. OpenAI

### Responses API

```json
"usage": {
  "input_tokens": 24,
  "input_tokens_details": { "cached_tokens": 0 },
  "output_tokens": 58,
  "output_tokens_details": { "reasoning_tokens": 40 },
  "total_tokens": 82
}
```

### Chat Completions API

同じ内容が別名で入る。**名前が違うだけで意味は同じ**なので、パーサで吸収する。

```json
"usage": {
  "prompt_tokens": 2006,
  "completion_tokens": 300,
  "total_tokens": 2306,
  "prompt_tokens_details": { "cached_tokens": 1920, "cache_write_tokens": 0 }
}
```

| 意味 | Responses API | Chat Completions API |
|---|---|---|
| 入力（キャッシュ込みの合計） | `input_tokens` | `prompt_tokens` |
| うちキャッシュ読み | `input_tokens_details.cached_tokens` | `prompt_tokens_details.cached_tokens` |
| うちキャッシュ書き | `input_tokens_details.cache_write_tokens` | `prompt_tokens_details.cache_write_tokens` |
| 出力（reasoning 込みの合計） | `output_tokens` | `completion_tokens` |
| うち reasoning | `output_tokens_details.reasoning_tokens` | `completion_tokens_details.reasoning_tokens` |

**注意点**

- `cache_write_tokens` は **GPT-5.6 以降のモデルでのみ**返る。古いモデルでは存在しない前提でパースする（キー欠損で落とさない）。
- キャッシュは **1,024 トークン以上のプレフィックス**でのみ効く。それ未満は `cached_tokens` が 0 になる（バグではない）。
- **reasoning トークンは `output_tokens` の内数**で、出力として課金される。別途足すと二重計上。
- Batch API を使う場合、割引後の単価が適用される。**同じモデルでも実行モードで単価が違う**ので、
  単価表のキーに実行モード（`sync` / `batch`）を含める。

---

## 3. Anthropic (Claude)

```json
"usage": {
  "input_tokens": 24,
  "cache_creation_input_tokens": 1200,
  "cache_read_input_tokens": 800,
  "cache_creation": {
    "ephemeral_5m_input_tokens": 1200,
    "ephemeral_1h_input_tokens": 0
  },
  "output_tokens": 58,
  "server_tool_use": { "web_search_requests": 1, "web_fetch_requests": 0 }
}
```

| フィールド | 意味 |
|---|---|
| `input_tokens` | 最後のキャッシュ区切り以降の入力のみ（**キャッシュ分を含まない**） |
| `cache_creation_input_tokens` | 今回キャッシュに書き込んだ入力 |
| `cache_read_input_tokens` | キャッシュから読んだ入力 |
| `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens` | **TTL 別の内訳。5分と1時間で単価が違うので、合算せず別 metric として持つ** |
| `output_tokens` | 出力 |
| `server_tool_use.web_search_requests` / `web_fetch_requests` | **トークンとは別に回数課金**されるサーバツール。`metric = web_search_request` として計上する |

**単価の倍率（公式に明記されている構造。基準単価そのものは料金ページで確認）**

| 種別 | 入力単価に対する倍率 |
|---|---|
| 5分キャッシュ書き込み | **1.25×** |
| 1時間キャッシュ書き込み | **2×** |
| キャッシュ読み込み | **0.1×** |

倍率が公表されているからといって**コードに `* 1.25` と書かない**。単価表に metric ごとの単価として展開し、
イベントは「metric × 数量」だけを持つ。こうしないと倍率が変わったときにコード修正が要る。

**thinking（拡張思考）**: 思考トークンは `output_tokens` に含まれて出力として課金される。別立てしない。

---

## 4. Google Gemini

`usageMetadata` から取る。

| フィールド | 意味 |
|---|---|
| `promptTokenCount` | 入力（キャッシュ分を含む合計） |
| `cachedContentTokenCount` | うちキャッシュ済みコンテキスト分 |
| `candidatesTokenCount` | 出力 |
| `thoughtsTokenCount` | 思考トークン。**出力として課金される**（"response pricing is the sum of output tokens and thinking tokens"） |
| `toolUsePromptTokenCount` | ツール利用時のプロンプト分 |
| `totalTokenCount` | 全体合計 |
| `promptTokensDetails` / `candidatesTokensDetails` | モダリティ別内訳（テキスト/画像/音声で単価が違うモデルで必要） |

> ⚠️ **`thoughtsTokenCount` が `candidatesTokenCount` に含まれるかは、モデル世代で挙動が報告上ぶれている。**
> 実装時に必ず**実レスポンスで検算**すること: `promptTokenCount + candidatesTokenCount + thoughtsTokenCount` が
> `totalTokenCount` と一致すれば外数、`promptTokenCount + candidatesTokenCount` で一致すれば内数。
> この検算をテストに落としておくと、モデル更新時に気づける。

**マルチモーダル入力**（画像・音声・動画をプロンプトに入れる場合）は `promptTokensDetails` の
モダリティ別内訳を使う。テキストと同単価とは限らない。

---

## 5. LangChain / LangGraph 経由

本リポジトリの backend-py はここが主戦場になる。**プロバイダ差を LangChain が正規化してくれる**ので、
自前パーサを書くより堅い。

### 個別レスポンスから

```python
response = model.invoke("...")
response.usage_metadata
# {
#   'input_tokens': 8, 'output_tokens': 21, 'total_tokens': 29,
#   'input_token_details': {'cache_read': 0, 'cache_creation': 0},
#   'output_token_details': {'reasoning': 0, 'audio': 0},
# }
```

**`usage_metadata` の `input_tokens` は正規化後の合計**（キャッシュ分を含む）。
プロバイダ生の値が必要なら `response.response_metadata` に元のオブジェクトが入っているので、
**`jsonb` にはこちらを保存する**（`SKILL.md` の原則 1）。

### 複数呼び出しをまとめて（エージェント向け）

```python
from langchain_core.callbacks import get_usage_metadata_callback

with get_usage_metadata_callback() as cb:
    result = graph.invoke(...)
    cb.usage_metadata   # モデル名をキーにした集計 dict
```

エージェントは 1 リクエストで複数モデルを何度も呼ぶ。このコンテキストマネージャは
**モデル名ごとに集計して返す**ので、`trace_id` と組み合わせて「ユーザーの 1 操作 = いくら」が出せる。

**ただし集計値だけを保存しない。** 内訳（どのノードが何回呼んだか）が消えると、
「エージェントがループして高い」の調査ができなくなる。`on_llm_end` で個々のイベントも記録し、
集計はロールアップ側で作る。

---

## 6. Vercel AI SDK 経由

Edge Functions や Next.js の Route Handler で使う場合。

**usage の形は SDK のメジャーバージョンで変わっている**ので、必ず入れているバージョンの型定義を確認すること。

| バージョン | 形 |
|---|---|
| v5 系 | `{ inputTokens, outputTokens, totalTokens, reasoningTokens?, cachedInputTokens? }` |
| v7 系 | 詳細が入れ子に移動: `inputTokenDetails: { noCacheTokens, cacheReadTokens, cacheWriteTokens }`, `outputTokenDetails: { textTokens, reasoningTokens }`, および生の値が `raw` |

```ts
const result = streamText({ model, messages })
// ストリーミングでも onFinish で確定 usage が取れる
```

`raw`（プロバイダ生の usage）があるバージョンでは、それを `jsonb` に保存する。

---

## 7. ストリーミングの罠

**ストリーミングは usage の取りこぼしが最も起きる場所**。3 つ罠がある。

### 罠 1: そもそも usage が返らない設定

OpenAI の Chat Completions はストリーミング時、**明示的に要求しないと usage が返らない**:

```jsonc
{ "stream": true, "stream_options": { "include_usage": true } }
```

こうすると**最終チャンクにだけ** usage が入る（それ以外のチャンクは `usage: null`、
最終チャンクの `choices` は空配列）。この仕様を知らずに「最初のチャンクに無いから取れない」と判断しがち。

### 罠 2: 中断すると usage が来ない

ユーザーがブラウザを閉じる・タイムアウトする・クライアントが切断すると、
**最終チャンクが届かず usage が取れない**。しかし**生成された分は課金されている**。

対処:

- イベントを `status = 'pending'` で**呼び出し開始時に先に作る**（`trace_id` と主体だけ埋める）
- 完了時に usage を埋めて `status = 'settled'` に更新
- 中断時は `status = 'unsettled'` として残す。**消さない**
- `unsettled` はトークナイザによる推定値で埋めるか、未確定として集計から除外し**件数を監視する**。
  ここが増えていたら計測が壊れているサイン

「取れなかったから 0 として記録」は最悪の選択。**原価がタダに見える**。

### 罠 3: プロバイダごとに usage の届き方が違う

| プロバイダ | ストリーミング時の usage |
|---|---|
| OpenAI Chat Completions | `stream_options.include_usage` が必要。最終チャンクのみ |
| OpenAI Responses API | 完了イベント（`response.completed`）の `response.usage` |
| Anthropic Messages | `message_start` に入力側、`message_delta` に出力側が乗る → **両方を合算する必要がある** |
| Gemini | 最終チャンクの `usageMetadata` |
| LangChain | `stream_usage=True` 相当の設定でチャンクに `usage_metadata` が乗る |
| Vercel AI SDK | `onFinish` コールバックの `usage` |

---

## 8. 非トークン課金（画像・音声・動画）

**トークンの概念がない**モダリティは、`metric` を変えるだけで同じ仕組みに載る。

| 種別 | 記録する数量 | 取得元 |
|---|---|---|
| 画像生成（枚数課金） | 生成枚数 × サイズ/品質 | リクエストパラメータ（`n`, `size`, `quality`）。**レスポンスに usage が無いことが多いので、リクエスト側から作る** |
| 画像生成（トークン課金のモデル） | 入力/出力トークン | レスポンスの usage |
| TTS | 入力文字数 | リクエストのテキスト長 |
| STT | 音声の秒数 | 入力ファイルの長さ |
| 動画生成 / GPU 推論（fal 等） | 実行秒数・解像度 | レスポンスのメタデータ、または実行時間の計測 |

**重要**: レスポンスに usage が無いモダリティでは、**リクエスト側のパラメータが一次情報**になる。
「usage が返ってこないから計測しない」は誤り。数量が確定できる場所で記録する。

fal.ai を使う場合は `.claude/skills/fal/SKILL.md` と併読すること（同期 subscribe / キュー submit で
数量の確定タイミングが変わる。Webhook で結果を受ける構成では、**Webhook 側で数量を確定させる**）。

---

## 9. 新しいプロバイダを足すときの手順

1. **公式ドキュメントで usage オブジェクトのフィールド名を確認**する（推測しない。`.claude/rules/research.md`）
2. 内数か外数か（§1）を確認し、**正規化パーサ**を書く
3. ストリーミング時の届き方（§7）を確認する
4. 公式の料金ページで metric ごとの単価を確認し、**単価表に登録**する（コードに書かない）
5. 実レスポンスを 1 件取って、**パーサの出力と合計値が整合するかのテスト**を書く（§4 の検算パターン）
6. `data-model.md` の `provider` / `model` の命名規則に合わせて登録する

---

## 出典

- [OpenAI: Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [OpenAI: Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)
- [OpenAI: Chat Completions streaming events](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)
- [Anthropic: Messages API](https://platform.claude.com/docs/en/api/messages)
- [Anthropic: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Google: generateContent / UsageMetadata](https://ai.google.dev/api/generate-content)
- [Google: Thinking](https://ai.google.dev/gemini-api/docs/thinking)
- [LangChain: Models（トークン使用量の追跡）](https://docs.langchain.com/oss/python/langchain/models)
- [Vercel AI SDK: streamText / LanguageModelUsage](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
