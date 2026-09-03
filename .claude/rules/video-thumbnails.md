---
paths: frontend/**, drizzle/schema/**, supabase/**, backend-py/**
---

# 動画サムネイルポリシー（動画を扱うなら、サムネイルは指示を待たず最初から実装する）

**CRITICAL / NON-NEGOTIABLE**: **アプリが動画を扱う（アップロードさせる / 保存する / 一覧に出す /
再生させる）なら、その動画のサムネイル画像を「生成・保存・表示」までセットで実装する。**
サムネイルの無い動画レコードを作ってはならないし、サムネイルの無い状態で動画を一覧・再生画面に
並べてもならない。

そして **サムネイルの生成は `backend-py`（Vercel の Docker コンテナ）+ ffmpeg で行う。
Edge Functions では実装してはならない**（§2 のとおり、そもそも実現できない）。

| 役割 | どこでやるか |
|---|---|
| 動画のアップロード | **クライアント → Supabase Storage へ直接**（6MB 超は resumable / TUS） |
| サムネイル生成（フレーム抽出・メタ取得） | **`backend-py`（Vercel container）+ ffmpeg / ffprobe** |
| サムネイルの保存 | Supabase Storage（動画と同じ private バケット既定） |
| サムネイルの表示 | **`SupabaseImage`**（＝ Storage の変換 API 経由。`.claude/rules/storage-images.md`） |

---

## 0. なぜ必須か

**サムネイルが無い動画一覧は、そのままでは「黒い箱の羅列」になる。** 埋めようとして `<video>` を
並べると、今度は次のことが起きる:

- **ファーストビューで動画本体を取りに行く**。1 本あたり数百 KB〜数 MB が、再生されないまま
  Storage の egress になる（画像 1 枚の数十〜数百倍）。
- **LCP が壊れる**。モバイル回線ほど致命的で、`preload="metadata"` でもコンテナ先頭は必ず取りに行く。
- **端末側でデコーダが並列に起動する**（同時再生数の上限に当たると、以降の動画が無音の黒画面になる）。

しかも**サムネイルは後から足せば済む機能ではない**。生成をあとから追加しても、**すでにアップロード
された過去の動画にはサムネイルが無い**ままなので、結局バックフィルのバッチを別に書くことになる
（`.claude/rules/design-research.md` §0 の「後から直せないもの」と同じ性質）。だから
**最初の 1 本目の動画を保存する時点で経路ごと用意する**。

Storage の Image Transformation は**画像専用**であり、**動画からフレームを取り出す機能は無い**
（`.claude/rules/storage-images.md` §1 の制限値は入力が画像であることが前提）。
つまり「Supabase 側が勝手にやってくれる」ことは無く、**自分で生成するしかない**。

---

## 1. 適用判定（動画に触れる前に確認する）

| # | 判定 | ページ |
|---|---|---|
| 1 | ユーザーが動画をアップロードできるか | **本ルール全部が適用** |
| 2 | 動画（自前 Storage）を一覧・カード・フィードに出すか | §6（表示） |
| 3 | 動画を保存するテーブル・列を新設するか | §5（DB 設計。後から直せない） |
| 4 | 録画・生成された動画を保存するか（LiveKit の録画 / fal の動画生成） | **適用**（生成元が何であれ Storage に置くなら同じ） |

**適用外**:

- **外部プラットフォームの埋め込み**（YouTube / Vimeo 等）。この場合は**先方が提供する
  サムネイル URL / oEmbed のメタデータ**を使う（自前で ffmpeg を回さない。
  `.claude/rules/minimal-implementation.md` §1）。ただし「サムネイルを必ず出す」という
  §6 の表示要件は同じく適用される。
- **リアルタイムのストリーム**（LiveKit の通話中の映像）。ただし**録画をファイルとして保存するなら
  §1-4 に該当し、本ルールの対象**になる。

---

## 2. なぜ Edge Functions で実装できないか（ファクト）

`.claude/rules/supabase-first.md` の判断順（supabase-js → Edge Functions → backend-py）に従うと、
バックエンド処理の既定は Edge Functions である。**動画のフレーム抽出はその例外**で、
以下の理由から Edge Functions では成立しない。

| 制約（Supabase 公式） | 値 | 動画処理にどう効くか |
|---|---|---|
| Maximum Memory | **256MB** | 動画のデコードバッファに足りない |
| Maximum CPU Time | **2s / request**（async I/O は含まない） | フレーム抽出は純粋な CPU 処理。2 秒で終わらない |
| Maximum Duration (wall clock) | Free **150s** / Paid **400s** | 長尺の取得 + 変換が入ると足りない |
| Maximum Function Size | **20MB（バンドル後）** | ffmpeg のバイナリ / wasm を同梱できない |
| マルチスレッド前提のネイティブライブラリ | **非対応**（公式が `libvips` / `sharp` を名指し） | 同じ理由でメディア処理系のネイティブ依存が使えない |

ランタイムは Deno のサンドボックスであり、**任意のネイティブバイナリ（ffmpeg）を置いて実行する
手段が無い**。ffmpeg.wasm を持ち込もうとしても、上の 20MB / 256MB / CPU 2s のいずれにも当たる。

したがって動画処理は **`supabase-first.md` のエスカレーション条件（長時間処理 / 複雑な実装 /
Python 固有ライブラリ・ネイティブ依存）に明確に該当**し、**`backend-py` が正しい置き場所**になる。
本リポジトリの `backend-py` は **Vercel の Docker コンテナ（`services` + `runtime: "container"`）**
として動くので、**Dockerfile に ffmpeg を入れられる**（§4）。

> Edge Functions を**まったく使わない**という意味ではない。「動画がアップロードされたことを検知して
> backend-py に投げるだけ」の薄い中継なら Edge Functions でよい。**やってはいけないのは、
> Edge Functions の中でフレームを抽出しようとすること**。

---

## 3. 既定のフロー（これ以外を選ぶなら理由を書く）

```
[client] ──① 動画を Storage へ直接アップロード（>6MB は TUS resumable / 署名付きアップロード URL）
   │           ※ backend-py 経由で動画本体を送らない（Vercel の request body 上限 4.5MB）
   │
   ├──② videos 行を作成（thumbnail_status = 'pending'）
   │
   └──③ POST /videos/{id}/thumbnail  ──▶ [backend-py container]
                                            ├─ 呼び出し元の JWT を検証し、行の所有者か確認
                                            ├─ 署名 URL で動画を取得（作業ファイルは一時領域）
                                            ├─ ffprobe: duration / width / height
                                            ├─ ffmpeg : 代表フレームを 1 枚 JPEG/WebP で抽出
                                            ├─ Storage へサムネイルを upload
                                            └─ 行を update（thumbnail_path / status='ready' / メタ）
                                                    │
[client] ◀── ④ 完了を反映（ポーリング or Realtime）──┘

[表示] thumbnail_path → SupabaseImage（transform 経由。storage-images.md）
```

**要点**:

1. **動画本体を backend-py の HTTP ボディに載せない。** Vercel Functions（コンテナ含む）の
   request / response body は **4.5MB 上限**で、超えると `413 FUNCTION_PAYLOAD_TOO_LARGE`。
   アップロードは必ず Storage 直行にする。
2. **③ は「生成が終わってから 200 を返す」同期処理にする。** コンテナは**無トラフィック 5 分
   （preview は 30 秒）で 0 にスケールインし、`SIGTERM` + 30 秒で落ちる**ので、
   「レスポンスを返してからバックグラウンドスレッドで処理する」設計は完了が保証されない。
3. **③ は冪等にする。** 同じ動画に対して 2 回叩かれても、結果が 1 つに収束すること
   （`thumbnail_status` を見て早期 return する / 同じパスへ upsert する）。失敗したら
   `thumbnail_status = 'failed'` を書いて**再試行できる状態で終わる**（握りつぶさない。
   `.claude/rules/error-handling.md`）。
4. **トリガの選択肢**（どれでもよいが、選んだ理由を残す）:
   - クライアントがアップロード完了後に ③ を呼ぶ（**既定**。認可が素直で、進捗も出しやすい）
   - Database Webhook / Edge Function が ③ を呼ぶ（クライアントを信用したくない場合。
     **Edge Function は中継だけ**。§2）

---

## 4. backend-py 側の実装ルール

### 4.1 ffmpeg をイメージに入れる（ローカルと本番を drift させない）

**本番（Vercel コンテナ）** — `backend-py/Dockerfile.vercel` の **final stage** に追加する
（builder ではなく final。実行時に要るのは ffmpeg バイナリ本体）:

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*
```

**ローカル（devenv）** — `devenv.nix` の `packages` に `pkgs.ffmpeg-headless` を足す。
Dockerfile 冒頭の「devenv とローカル/本番の環境を揃えるための工夫」の整合表にも 1 行足すこと
（**片方だけ入れると「ローカルでは通るのに本番で `FileNotFoundError: ffmpeg`」になる**）。

**イメージが重くなるのが問題になったら、サービスを分ける。** `Dockerfile.vercel` 冒頭の
割り当て表のとおり blessed 名は 4 つあり、`Containerfile.vercel` を使って `media` サービスを
切れば、`uv sync --package <app>` の絞り込みと合わせて **ffmpeg が api イメージに入らない**
（手順は `backend-py/README.md`、配置の制約は `.claude/skills/vercel-deploy/references/services-container.md`）。

### 4.2 実行（信頼できない入力を扱う前提で書く）

```python
import json
import subprocess  # noqa: S404 - 引数は配列で渡す。shell は使わない
from pathlib import Path

FFMPEG_TIMEOUT_SEC = 60


def probe(src: Path) -> dict[str, object]:
    """ffprobe で duration / width / height を取る（表示側のレイアウト固定に必要）。"""
    result = subprocess.run(  # noqa: S603
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-show_entries", "format=duration",
            "-of", "json",
            str(src),
        ],
        capture_output=True, text=True, check=True, timeout=FFMPEG_TIMEOUT_SEC,
    )
    return json.loads(result.stdout)


def extract_thumbnail(src: Path, dest: Path, *, at_sec: float = 1.0) -> None:
    """代表フレームを 1 枚だけ書き出す。"""
    subprocess.run(  # noqa: S603
        [
            "ffmpeg", "-nostdin", "-loglevel", "error", "-y",
            "-ss", str(at_sec),          # -i より前に置く（入力側 seek = 速い）
            "-i", str(src),
            "-frames:v", "1",            # 1 枚だけ。動画全体をエンコードしない
            "-vf", "scale='min(1280,iw)':-2",
            str(dest),
        ],
        check=True, timeout=FFMPEG_TIMEOUT_SEC,
    )
```

**守ること**:

- **`shell=True` を使わない。引数は必ず配列**（ファイル名・パスはユーザー由来）。
- **`timeout` を必ず付ける。** 壊れた動画で ffmpeg が張り付くと、コンテナの実行時間上限
  （Vercel Functions と同じ: 既定 **300s**、Pro の最大 **800s**、拡張 1800s は beta）まで
  食い潰して 504 になる。
- **`-ss` は `-i` の前**（入力側 seek）。後ろに置くと先頭から全フレームをデコードする。
- **フレーム位置は先頭 0 秒にしない**（黒フレーム・フェードインで真っ黒になる）。既定は 1 秒程度、
  あるいは `-vf thumbnail` で代表フレームを選ばせる。動画が 1 秒未満のときにフォールバックすること。
- **一時ファイルは `tempfile` で作り、`finally` で必ず消す。** コンテナのファイルシステムは
  揮発かつインスタンス共有で、スケールインで消える。**永続化の当てにしない**。
- **入力サイズに上限を設ける**（バケット側の `file_size_limit` と、ダウンロード時のサイズ確認）。
  上限を超えるものは受け付けず、理由を返す。
- 例外は握りつぶさず、`logger.exception` の上でドメイン例外に変換して boundary で処理する
  （`.claude/rules/error-handling.md` / `.claude/rules/backend-py.md`）。

### 4.3 認可

- **エンドポイントは JWT 必須**。**body で渡された user_id を信用しない**（`.claude/rules/auth.md` §4 と同じ考え方）。
- 対象行の所有者（またはテナント）が呼び出し元と一致することを確認してから処理する。
- `service_role` を使うのは「本人のセッションでは書けない場所へ書く」場合だけに限定する。

---

## 5. DB 設計（後から直せないので最初に決める）

```ts
// drizzle/schema/videos.ts（列名は一例。サービスの語彙に合わせる）
export const videoThumbnailStatus = pgEnum('video_thumbnail_status', [
  'pending', 'ready', 'failed',
])

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...所有者・テナント列
  bucket: text('bucket').notNull(),
  path: text('path').notNull(),                     // 動画本体（URL ではなく bucket + path）
  thumbnailPath: text('thumbnail_path'),            // ready のときだけ入る
  thumbnailStatus: videoThumbnailStatus('thumbnail_status').notNull().default('pending'),
  durationMs: integer('duration_ms'),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

| 論点 | 決めること |
|---|---|
| **URL を保存しない** | 動画もサムネイルも **`bucket` + `path`**（`.claude/rules/storage-images.md` §5） |
| **状態列を必ず持つ** | `pending` / `ready` / `failed`。**null かどうかで状態を表さない**（再試行の可否が判別できなくなる） |
| **`width` / `height` / `duration_ms`** | 表示前にアスペクト比を確定できないと**レイアウトシフト（CLS）**が出る。生成時に一緒に保存する |
| **RLS** | 動画テーブルにも Storage のポリシーにも必要（`.claude/skills/rls/`）。サムネイルは動画と**同じ権限**で見えること |
| **ページング** | 動画一覧は増える一覧。`.claude/rules/list-pagination.md` がそのまま適用（tiebreaker / index） |
| **Storage** | private バケット既定。`config.toml`（`mode: product` 以降）で `file_size_limit` と `allowed_mime_types` を設定する |

---

## 6. フロントエンド（Web / Mobile）の必須事項

1. **一覧・カード・フィードに `<video>` を並べない。** 出すのは**サムネイル画像だけ**にして、
   タップ / クリックで再生に入る。
2. **サムネイルは `SupabaseImage` で表示する**（`.claude/rules/storage-images.md`。無変換配信禁止。
   private バケットならサーバー側で transform 付き署名 URL）。
3. **再生要素にはサムネイルを渡す。**
   - Web: `<video poster={thumbnailUrl} preload="none" playsInline …>`。
     自動再生するなら `muted` + `playsInline` は必須（そうでないとモバイルで再生されない）。
   - Mobile: 再生開始までサムネイル画像を表示し、再生ボタンのタップ標的は **44px 以上**
     （`.claude/rules/mobile-uiux.md`）。
4. **`width` / `height`（またはアスペクト比）を必ず指定**して、読み込み前後で高さを変えない。
5. **5 状態をすべて用意する**（欠けたら未完成）:

| 状態 | UI |
|---|---|
| `pending`（生成中） | スケルトン + 「サムネイルを生成中」。動画本体を先読みしない |
| `ready` | サムネイル表示 |
| `failed` | プレースホルダー + **再生成の導線**。黒い箱のまま放置しない |
| 空（動画が 0 件） | 空状態 + 次のアクション |
| エラー（取得失敗） | 再試行導線（`.claude/rules/error-handling.md`） |

6. **文言はすべて next-intl**（`en` / `ja` 両方。`.claude/rules/i18n.md`）。
7. UI は Storybook で上の 5 状態を網羅する（`.claude/rules/ui-testing.md`）。

---

## 7. クライアント側で作ったサムネイルの扱い

`<video>` + `canvas`（Web）や `expo-video-thumbnails`（Mobile）で端末側からフレームを取ることは
できるが、**それを正本にしてはならない**。

- 端末・OS ごとにデコードできるコーデックが違う（HEVC / AV1 で失敗する端末がある）
- 失敗・キャンセル・改ざんが可能で、**サムネイルが無い行が生まれる**
- サイズ・向き（EXIF / rotate メタ）・色空間が端末ごとにばらつく

**許容されるのは「アップロード直後の楽観的プレビュー」まで**。DB に保存し、他のユーザーに配信する
サムネイルは**サーバー生成のもの**にする。ユーザーに任意フレームや独自画像を選ばせる UI を作る場合も、
**選択結果はサーバー側で再生成・再エンコードしてから保存**する。

---

## 8. マネージドサービスへ寄せる判断

トランスコード（HLS / DASH）・複数解像度・字幕・DRM・視聴分析まで要件に入ってきたら、
**自前 ffmpeg の適用範囲を超えている**。Mux / Cloudflare Stream 等の動画プラットフォームは
アップロード時にサムネイルを自動生成するので、そちらのほうが総量が小さい
（`.claude/rules/minimal-implementation.md` §1 / §4）。

ただし**サービスの追加は勝手に決めない**。`PROJECT.md` の `services.*` に無いものを持ち込む前に
**ユーザーに確認**し、採用したら `PROJECT.md` に記録する。
「サムネイル 1 枚が要るだけ」なら、既存の `backend-py` + ffmpeg が最小実装である。

---

## 9. 禁止パターン

```tsx
// ❌ 一覧に動画本体を並べる（サムネイル代わりに <video> を置く）
{videos.map((v) => <video key={v.id} src={v.url} preload="metadata" />)}

// ❌ poster 無しで再生要素を置く（読み込むまで黒い箱）
<video src={signedUrl} controls />

// ❌ サムネイルを無変換の URL で表示する（storage-images.md 違反）
<img src={supabase.storage.from('videos').getPublicUrl(thumbPath).data.publicUrl} />

// ❌ 完全な URL を DB に保存する
```

```python
# ❌ Edge Functions でフレーム抽出しようとする（256MB / CPU 2s / bundle 20MB で不可能）
# ❌ 動画本体を backend-py の HTTP ボディで受ける（4.5MB 上限で 413）
# ❌ timeout の無い subprocess / shell=True でコマンド文字列を組み立てる
subprocess.run(f"ffmpeg -i {user_path} out.jpg", shell=True)

# ❌ レスポンスを返してからバックグラウンドで生成する（スケールインで消える）
# ❌ 生成に失敗したのに 200 を返し、pending のまま放置する（永久に黒い箱）
# ❌ 一時ファイルを消さない / コンテナのファイルシステムに永続化を期待する
```

```
❌ サムネイル生成の実装を「あとで足す」として、先に動画のアップロードだけリリースする
   → 過去分のバックフィルが別途必要になる（最初から入れれば要らない作業）
```

---

## 10. チェックリスト（動画を扱う実装をしたら必ず）

| # | 確認 |
|---|---|
| 1 | 動画を保存する経路すべてで、サムネイル生成がセットになっているか |
| 2 | 生成は `backend-py`（コンテナ + ffmpeg）か。Edge Functions でやろうとしていないか |
| 3 | 動画のアップロードは Storage 直行か（backend の body に載せていないか。6MB 超は resumable か） |
| 4 | エンドポイントは JWT 検証 + 所有者確認をしているか。body の id を信用していないか |
| 5 | 生成は冪等で、失敗時に `failed` を残して再試行できるか |
| 6 | `subprocess` に `timeout` があり、`shell=True` を使っていないか。一時ファイルを消しているか |
| 7 | DB に `thumbnail_path` / `thumbnail_status` / `duration_ms` / `width` / `height` があるか（URL 保存でないか） |
| 8 | サムネイル表示は `SupabaseImage`（transform 経由）か |
| 9 | 一覧に `<video>` を並べていないか。再生要素に poster / サムネイルがあるか |
| 10 | 5 状態（pending / ready / failed / 空 / エラー）が UI に揃っているか |
| 11 | ffmpeg が **Dockerfile.vercel（final stage）と devenv.nix の両方**に入っているか |
| 12 | 文言が en / ja 両方あるか。UI に Storybook、生成ロジックに単体テストがあるか |

---

## 11. テスト

| 対象 | 要求 |
|---|---|
| usecase / gateway（生成の分岐・冪等性・失敗時の状態遷移） | **単体テスト必須（TDD）**。ffmpeg 呼び出しは 1 か所（薄いラッパ）に閉じ、そこを差し替える |
| ffmpeg ラッパ | **小さな実ファイルで 1 本は実際に通す**（コマンド引数の間違いはモックでは絶対に見つからない） |
| フロントの UI | **Storybook で 5 状態**（`.claude/rules/ui-testing.md`） |
| E2E | アップロード → `pending` 表示 → サムネイル表示までを 1 本のフローとして通す（`.claude/skills/maestro/`） |

**「サムネイルの URL が返った」で終わらせない。** 画面にサムネイルが出るところまでが 1 本のフロー。

---

## 12. 強制事項

このポリシーは**交渉の余地なし**。

- **動画を扱うのにサムネイルの生成・表示が無い実装はレビューで却下**する。
- **Edge Functions でフレーム抽出しようとする実装も却下**する（§2 のとおり実現できない）。
- 「開発者から指示が無かった」は理由にならない。**指示を待たずに最初から入れる**。
- 動画プラットフォーム（Mux 等）の採用、トランスコード・HLS・字幕・DRM が要件に入る場合は、
  **推測で進めずユーザーに確認**する（`PROJECT.md` の `services.*` に記録する）。

## 参考

- [Supabase: Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) — Memory 256MB / CPU 2s / wall clock 150s(Free)・400s(Paid) / bundle 20MB / `libvips`・`sharp` のようなマルチスレッド前提ライブラリは非対応
- [Supabase: Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) — 6MB 超は TUS。`createSignedUploadUrl` による署名付きアップロード
- [Vercel: Container Images](https://vercel.com/docs/functions/container-images) — Vercel Functions と同じ制限が適用 / `PORT` / スケールイン（production 5 分・preview 30 秒）+ `SIGTERM` 30 秒
- [Vercel: Functions Limits](https://vercel.com/docs/functions/limitations) — request/response body **4.5MB** / max duration 300s 既定・800s（Pro 最大）/ memory 2GB 既定・4GB 最大
- [FFmpeg: ffmpeg documentation](https://ffmpeg.org/ffmpeg.html) — `-ss`（入力側 seek）/ `-frames:v`
- [FFmpeg: thumbnail filter](https://ffmpeg.org/ffmpeg-filters.html#thumbnail) — 代表フレームの選択
- `.claude/rules/storage-images.md`（サムネイルは画像なので全面的に適用） / `.claude/rules/supabase-first.md`（判断順とエスカレーション） / `.claude/rules/list-pagination.md` / `.claude/rules/error-handling.md`
- `.claude/skills/vercel-deploy/references/services-container.md`（コンテナサービスの配置・名前・ビルドコンテキスト）
