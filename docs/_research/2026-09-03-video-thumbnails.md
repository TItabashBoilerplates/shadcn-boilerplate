# 動画サムネイルの生成をどこでやるか（Edge Functions か backend-py コンテナか）

調査日: 2026-09-03

## 課題

「動画を扱うならサムネイルを必須にする」というポリシーを追加するにあたり、**生成をどこで実行するか**を
一次情報で確定する必要があった。既定のバックエンドは Edge Functions（`.claude/rules/supabase-first.md`）
なので、まずそこで実現できるかを確認し、できないなら `backend-py`（Vercel の Docker コンテナ）に
エスカレーションする根拠を残す。

## 一次情報

| 事実 | 出典 |
|---|---|
| Edge Functions: Maximum Memory **256MB** / Maximum CPU Time **2s per request** / Wall clock **150s (Free)・400s (Paid)** | [Supabase: Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) |
| Edge Functions: Maximum Function Size **20MB（CLI バンドル後）** | 同上 |
| Edge Functions: 「Node Libraries that require multithreading are not supported. Examples: `libvips`, `sharp`」 | 同上 |
| Storage: 6MB を超えるファイルは resumable upload（TUS）を推奨。`createSignedUploadUrl` の token を `x-signature` で使う署名付きアップロードもある | [Supabase: Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) |
| Storage の Image Transformation は**画像**の変換 API（動画のフレーム抽出は提供されていない） | [Supabase: Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) |
| Vercel: コンテナイメージには「Vercel Functions と同じ limits と Active CPU の料金モデルが適用される」 | [Vercel: Container Images](https://vercel.com/docs/functions/container-images) |
| Vercel: 無トラフィック **5 分（production）/ 30 秒（preview）** でスケールイン。`SIGTERM` + **30 秒** の grace | 同上 |
| Vercel Functions: request/response body の最大 **4.5MB**（超過は `413 FUNCTION_PAYLOAD_TOO_LARGE`） | [Vercel: Functions Limits](https://vercel.com/docs/functions/limitations) |
| Vercel Functions: max duration は Hobby 300s / Pro・Ent 既定 300s・最大 800s・拡張 1800s（beta）。memory は既定 2GB・最大 4GB (2 vCPU) | 同上 |
| `pkgs.ffmpeg-headless`（nixpkgs, 8.0.1）が devenv から使える | devenv MCP `search_packages` |

## 決定

- **サムネイル生成は `backend-py`（Vercel の Docker コンテナ）+ ffmpeg / ffprobe**。
  Edge Functions は 256MB / CPU 2s / bundle 20MB / ネイティブのマルチスレッド非対応のため、
  ffmpeg も ffmpeg.wasm も成立しない。`supabase-first.md` のエスカレーション条件
  （長時間処理 / 複雑な実装 / ネイティブ依存）に該当する。
- **動画本体は client → Storage 直行**（6MB 超は TUS）。backend-py の HTTP ボディには載せない（4.5MB 上限）。
- **生成はリクエスト内で完結させる**（スケールイン + SIGTERM 30 秒のため、レスポンス後のバックグラウンド
  処理は完了が保証されない）。失敗は `thumbnail_status = 'failed'` を残して再試行可能にする。
- **ffmpeg は `Dockerfile.vercel` の final stage と `devenv.nix` の `packages` の両方**に入れる
  （片方だけだとローカルと本番が drift する）。イメージ肥大が問題になったら blessed 名
  （`Containerfile.vercel`）で別サービスに切り出す。
- ポリシーは **`.claude/rules/video-thumbnails.md`**（`paths:` 付き）に置き、
  `AGENTS.md` の索引・`skills-first.md` のトリガ表・`supabase-first.md` の Storage Policy・
  `edge-functions.md`（やらないこと）から参照する。

## 見送ったもの

- **Mux / Cloudflare Stream 等の動画プラットフォーム**: サムネイル 1 枚のために依存とコストを増やす
  必要は無い。トランスコード / HLS / 字幕 / DRM が要件に入った時点で再検討し、採用するなら
  `PROJECT.md` の `services.*` に記録する（`minimal-implementation.md` §1 / §4）。
- **クライアント生成サムネイルを正本にする案**: 端末のコーデック差（HEVC / AV1）と失敗・改ざんで
  「サムネイルの無い行」が生まれる。楽観的プレビューまでに留める。
- **雛形の時点で ffmpeg を Dockerfile に入れておく案**: 動画を扱わないプロジェクトのイメージが
  重くなるだけなので、必要になった時点で足す手順をルールに書く形にした。
