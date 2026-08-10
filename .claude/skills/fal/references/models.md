# モデル選定ガイド（どのモデルで処理するかの判断）

fal には **2026-08-10 時点で 1,430 モデル**が載っており、**週単位で入れ替わる**。
このファイルの役割は「モデル名を暗記させること」ではなく、
**①いま何が使えるかを自分で調べる手順**と、**②ユーザーの意図からモデルを選ぶ判断軸**、
そして **③このリポジトリで固定した既定**を渡すこと。

---

## 0. 絶対ルール

1. **モデル ID と入力スキーマを推測で書かない**（`.claude/rules/research.md`）。
   §1 のいずれかの一次情報で必ず確認してから実装する。
2. **画像生成の既定は `openai/gpt-image-2`**（編集は `openai/gpt-image-2/edit`）。§3。
   別モデルを選ぶのは §3 の「既定から外す条件」に当たるときだけで、**外すなら理由を一言添える**。
3. **モデルを 1 つ採用したら、その場で使用量・単価の記録まで実装する**
   （`.claude/skills/ai-usage-metering/`）。fal は**トークンではなく枚数・秒数・解像度**で
   課金されるモデルが多く、後から遡って集計できない。§5。

---

## 1. いま使えるモデルを調べる（3 つの一次情報）

### (a) カタログ API — 一覧・検索（**認証不要の公開 JSON**）

```bash
# キーワード検索
curl -sS "https://fal.ai/api/models?keywords=gpt-image" | jq '.items[] | {id, category, title}'

# カテゴリで絞る（page は 1 始まり。1 ページ 40 件、.pages に総ページ数）
curl -sS "https://fal.ai/api/models?categories=text-to-video&page=1" \
  | jq '.total, (.items[] | {id, title, shortDescription})'
```

| クエリ | 意味 |
|---|---|
| `keywords=` | フリーテキスト検索 |
| `categories=` | カテゴリ絞り込み（**`category=` は効かない**。複数指定は繰り返し） |
| `page=` | **1 始まり**（`page=0` は空配列が返る） |

items の主なフィールド: `id`（**これが endpoint id**）/ `category` / `title` / `tags` /
`shortDescription` / `modelUrl` / `licenseType`（`commercial` 等）/ `date`（公開日）/
**`pricingInfoOverride`（単価の説明文）** / `streamUrl`。

> 既定の並びは概ね人気順。**「いま何が主流か」を知りたいときは各カテゴリの page=1 を見る**のが早い。

### (b) モデルページの API タブ — **入力/出力スキーマの正本**

```
https://fal.ai/models/<model id>/api      例: https://fal.ai/models/openai/gpt-image-2/api
```

パラメータ名・enum・デフォルト・必須/任意はここが正本。**実装前に必ず開く**。

### (c) `fal api` で実際に叩く — 挙動確認

```bash
fal api openai/gpt-image-2 prompt="smoke test"
```

CLI の使い方・制約（値が文字列になる等）は `references/cli.md`。

---

## 2. ユーザーの意図 → カテゴリの対応

fal のカテゴリ（2026-08-10 時点の全 26 種・件数）。**まずここでカテゴリを確定**してから §1 で絞る。

| ユーザーの言い方 | カテゴリ（件数） |
|---|---|
| 「画像を作って」「イラスト」「ロゴ案」「バナー」 | `text-to-image` (195) |
| 「この画像を直して」「背景を消して」「服だけ変えて」「高解像度に」 | `image-to-image` (387) |
| 「動画を作って」（素材なし） | `text-to-video` (128) |
| 「この画像を動かして」「写真から動画」 | `image-to-video` (196) |
| 「動画を編集」「アップスケール」「リップシンク」「モーション転送」 | `video-to-video` (190) |
| 「喋らせて」「ナレーション」「読み上げ」 | `text-to-speech` (34) / `text-to-audio` (46) |
| 「BGM」「効果音」「音楽」 | `text-to-audio` (46) |
| 「文字起こし」「字幕」 | `speech-to-text` (10) / `audio-to-text` (2) |
| 「声を変える」「声質変換」 | `audio-to-audio` (43) / `speech-to-speech` (2) |
| 「画像の中身を説明して」「NSFW 判定」「動画の内容を要約」 | `vision` (34) / `image-to-text` (1) / `video-to-text` (3) |
| 「LLM を fal 経由で」 | `llm` (8) / `json` (6) / `text-to-json` (3) |
| 「3D モデルを作って」 | `image-to-3d` (37) / `text-to-3d` (11) / `3d-to-3d` (12) |
| 「自社の絵柄を覚えさせたい」「LoRA」 | `training` (53) |
| 「音声に合わせて動かす」（アバター・歌唱） | `audio-to-video` (19) / `video-to-audio` (6) |

> **「生成」と「編集」を取り違えないこと**が一番多い誤りで、参照画像があるなら `text-to-image` ではなく
> `image-to-image`（= `/edit` 系 endpoint）が正解。この判定を最初に行う。

---

## 3. 既定モデル（このリポジトリの決定）

### 画像は `openai/gpt-image-2` を使う

| 用途 | endpoint id |
|---|---|
| **テキストから画像生成** | **`openai/gpt-image-2`** |
| **既存画像の編集 / インペイント / アウトペイント** | **`openai/gpt-image-2/edit`** |

指示が無ければ**これを選べば間違いない**（ユーザー方針）。細かい typography や
ブランド一貫性の要求に強く、`/edit` は `mask_url` でインペイント領域を指定できる。

#### 入力スキーマ（`https://fal.ai/models/openai/gpt-image-2/api` で確認）

**`openai/gpt-image-2`（text-to-image）**

| パラメータ | 型 | 既定 | 備考 |
|---|---|---|---|
| `prompt` | string | **必須** | |
| `image_size` | enum or `{width,height}` | `landscape_4_3` | `square_hd` / `square` / `portrait_4_3` / `portrait_16_9` / `landscape_4_3` / `landscape_16_9` / `auto` |
| `quality` | enum | `high` | `auto` / `low` / `medium` / `high`。**コストに直結**（既定が `high`） |
| `num_images` | integer | `1` | |
| `output_format` | enum | `png` | `jpeg` / `png` / `webp` |
| `sync_mode` | boolean | — | |

**`openai/gpt-image-2/edit`（image-to-image）** — 上記に加えて:

| パラメータ | 型 | 既定 | 備考 |
|---|---|---|---|
| `image_urls` | list<string> | **必須** | **最大 16 枚** |
| `mask_url` | string | — | 編集領域の指定（インペイント） |
| `image_size` | 同上 | `auto` | t2i 版と既定が違う |

出力は `images: [{ url, content_type, file_name, file_size, width, height }]`。

```bash
fal api openai/gpt-image-2 \
  prompt="product photo of a ceramic mug on a linen cloth, soft window light" \
  image_size=square_hd output_format=webp
```

#### 既定から外してよい条件（外すときは理由を添える）

| 条件 | 候補（2026-08-10 の人気順から） |
|---|---|
| **大量生成・プレビュー用途で速度と単価が最優先** | `fal-ai/flux/schnell` |
| **自社の絵柄・キャラクターを LoRA で学習させたい**（gpt-image-2 は学習不可） | 学習: `fal-ai/flux-lora-fast-training` → 推論: `fal-ai/flux/dev` 系 |
| ライセンス・モデル重みの都合で OSS 系が要る | `fal-ai/flux/dev`（`licenseType` をカタログ API で確認） |
| 背景除去・アップスケールなど**単機能の後処理** | `fal-ai/birefnet/v2`（背景除去）等。汎用画像モデルにやらせない |

> `quality=high` が既定なので、**サムネイルやドラフト用途では `quality=medium|low` を明示**して
> コストを下げる判断も選定の一部。

### 画像以外に既定は置かない

動画・音声・3D は**要件で最適解が大きく変わる**（尺・音声の有無・解像度・単価が桁で違う）ため、
固定の既定を置かない。§4 の判断軸で選び、**採用理由を 1 行で説明する**。

---

## 4. カテゴリ別の判断軸と出発点（2026-08-10 スナップショット）

> ⚠️ **下表のモデル名は「調査の出発点」であって正解表ではない**。実装前に §1 で最新を確認すること。
> 数か月経っていたら、まずカテゴリの page=1 を引き直す。

### 動画

**先に決める**: ①素材があるか（`text-to-video` / `image-to-video` / reference-to-video）
②**音声が要るか**（native audio 対応か）③尺（多くは数秒〜30 秒）④pro か fast か（品質 vs 単価）。

| | 出発点 |
|---|---|
| text-to-video | `bytedance/seedance-2.0/text-to-video`（native audio）/ `fal-ai/kling-video/v3/pro/text-to-video` / 低コスト帯 `bytedance/seedance-2.0/fast/text-to-video`・`fal-ai/veo3.1/fast` |
| image-to-video | `fal-ai/kling-video/v3/pro/image-to-video` / `bytedance/seedance-2.0/image-to-video` |
| 複数の参照素材から | `bytedance/seedance-2.0/reference-to-video` |
| 動画の後処理 | アップスケール `fal-ai/topaz/upscale/video` / リップシンク `fal-ai/sync-lipsync/v3` / 結合 `fal-ai/ffmpeg-api/merge-videos` |

**動画は数十秒〜数分かかる** → Edge Function で同期的に待たない。`submit` + `webhook_url` にする
（`SKILL.md` §2 / §4.3）。

### 音声

| 用途 | 出発点 | 判断軸 |
|---|---|---|
| 読み上げ / ナレーション | `fal-ai/minimax/speech-02-hd`、`fal-ai/elevenlabs/tts/turbo-v2.5`、`fal-ai/gemini-3.1-flash-tts` | 品質(HD) vs 速度(turbo)、対応言語、声の指定方法 |
| 声のクローン | `fal-ai/minimax/voice-clone` | **本人同意と法務**を先に確認する |
| 効果音 / 音楽 | `fal-ai/elevenlabs/sound-effects/v2`、`fal-ai/elevenlabs/music`、`fal-ai/stable-audio-25/text-to-audio` | 尺・商用利用可否 |
| 文字起こし | `fal-ai/wizper`（Whisper v3 系）、`fal-ai/elevenlabs/speech-to-text/scribe-v2` | 言語・話者分離・速度 |

### 画像の後処理・解析

背景除去 `fal-ai/birefnet/v2` / NSFW 判定 `fal-ai/imageutils/nsfw` /
画像理解 `fal-ai/moondream3-preview/query`・`openrouter/router/vision` /
動画理解 `fal-ai/video-understanding`。

### LLM

fal 経由の LLM は `openrouter/router`（OpenAI 互換の
`openrouter/router/openai/v1/chat/completions` もある）。
ただし**本リポジトリの LLM オーケストレーションは backend-py + LangChain が既定**
（`.claude/skills/langchain/`）。**fal を LLM ゲートウェイとして新規採用するならユーザーに確認**する。

### 3D / 学習

3D: `fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`、`fal-ai/trellis-2`、`tripo3d/h3.1/image-to-3d`。
LoRA 学習: `fal-ai/flux-lora-fast-training`（ポートレート特化は `fal-ai/flux-lora-portrait-trainer`）。
**学習は「データの権利」と「成果物の保管先」を先に決めてから**着手する。

---

## 5. コストと使用量記録（省略不可）

- カタログ API の **`pricingInfoOverride`** に単価の説明が入っている。採用前に必ず読む。
  例: `openai/gpt-image-2` は画像トークン課金（入力/キャッシュ/出力で単価が別）で、
  **`quality` パラメータがコストを大きく動かす**（既定 `high`）。
- fal は**枚数・秒数・解像度・トークン**とモデルごとに課金軸が違い、**レスポンスに usage が無いこともある**。
  その場合は**リクエストのパラメータ側（枚数・尺・解像度）から数量を確定させて記録**する。
- `.claude/skills/ai-usage-metering/` の原則に従う: **確定した USD 金額をイベントに持つ / 生の usage を残す /
  単価はコードに書かず `effective_from` 付きの単価表 / `request_id` に一意制約を張って二重計上を DB で弾く**。
  **モデルを 1 つ足したら、その場で単価表に登録するまでが実装**。

---

## 6. 選定を報告するときのフォーマット

モデルを選んだら、実装報告に **1 行で**次を書く（後から見て再判断できるようにするため）:

> 「〈カテゴリ〉なので `<model id>` を選定。理由: 〈品質/速度/単価/編集可否/ライセンス〉。単価: 〈pricingInfo の要点〉」

判断が割れる要件（**動画の尺と品質帯、音声のクローン、LoRA 学習データの権利**、既定モデルから外す判断）は
推測で進めず**ユーザーに確認**する（`.claude/rules/research.md`）。
