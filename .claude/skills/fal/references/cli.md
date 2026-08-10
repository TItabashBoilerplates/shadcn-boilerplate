# `fal` CLI リファレンス

対象バージョン: **fal 1.79.1**（`uvx fal`）。本ファイルの記述は **CLI のソース（`fal/cli/*.py`）と実機の
`--help` 出力で確認済み**。バージョンが上がったら `fal --help` で差分を確認すること。

> **必ず devenv の `fal` script 経由で叩く**（`uvx fal` を直接叩かない）。
> script が実行環境に応じて認証モード（ローカル=OAuth / CI・sandbox=Doppler のキー）を解決する。
> 詳細は `SKILL.md` §3。

---

## 1. コマンド一覧（`fal --help` 実測）

| コマンド | 用途 | 誰が使うか |
|---|---|---|
| **`api`** | **ホスト済みモデルを呼ぶ（= コンテンツ生成）** | **これが主役**。§2 |
| `auth` | `login` / `logout` / `whoami` | 開発者（ローカル） |
| `keys` (`key`) | API キーの作成・一覧・削除（`--scope {API,ADMIN}`） | 開発者 |
| `profile` (`profiles`) | 複数アカウント / キーの切り替え（`~/.fal`） | 開発者 |
| `doctor` | バージョン・環境・解決された資格情報の確認 | トラブル時 |
| `files` (`file`) | **fal serverless の永続ストレージ**操作（§4 の注意） | 自前アプリ運用 |
| `apps` (`app`) / `deploy` / `run` / `runners` (`machine`) / `environments` (`envs`) / `secrets` / `queue` / `create` | **自前の fal アプリ**をホストする側の操作 | 自前モデルを載せるとき |
| `account` (`accounts` / `team` / `teams`) | アカウント・チーム切り替え | 組織運用 |
| `completion` | シェル補完スクリプト生成 | 任意 |

**既製モデルを使うだけなら覚えるのは `api` / `auth` / `keys` / `profile` の 4 つ**。
`deploy` / `run` / `apps` / `runners` / `environments` / `secrets` / `queue` は
**自分で書いた Python 関数を fal 上でホストする**ためのもので、既製モデル利用とは無関係。

---

## 2. `fal api` — コンテンツ生成の実行

```
Usage: fal api [-h] model_id [params ...]
```

```bash
# text-to-image（本リポジトリの既定モデル）
fal api openai/gpt-image-2 prompt="a red fox in snow, cinematic"

# 画像編集（参照画像は URL で渡す）
fal api openai/gpt-image-2/edit \
  prompt="make the sky dramatic" \
  image_urls[0]="https://example.com/base.png"
```

### 動作（`fal/cli/api.py`）

1. `model_id` が **`/stream` で終わる**なら **ストリーム実行**、それ以外は **キュー実行**（`submit`）
2. キュー実行では `Queued（順番待ちの位置）→ In Progress（ログ付き）→ Done` が **live 表示**され、
   最後に **結果 JSON が pretty print** される
3. **Ctrl-C でリクエストを cancel** する（ローカルで止めるだけでなくサーバ側もキャンセル）
4. `--debug` を付けるとレスポンスの **ヘッダと raw JSON** を表示する

### パラメータ記法（httpie 由来のネスト JSON）

| 書き方 | 生成される JSON |
|---|---|
| `prompt="a cat"` | `{"prompt": "a cat"}` |
| `image_size[width]=1024 image_size[height]=768` | `{"image_size": {"width": "1024", "height": "768"}}` |
| `image_urls[0]=URL1 image_urls[1]=URL2` | `{"image_urls": ["URL1", "URL2"]}` |
| `loras[0][path]=x loras[0][scale]=0.8` | `{"loras": [{"path": "x", "scale": "0.8"}]}` |

### ⚠️ 値は**すべて文字列**として送られる（実測で確認）

`fal api` のパーサは httpie からの移植だが、**`=` と `:=` の区切りが捨てられる実装**になっており、
httpie の `:=`（raw JSON）**は効かない**。`num_images:=3` は `{"num_images": "3"}` になる。

| 影響 | 対処 |
|---|---|
| 数値・真偽値パラメータが文字列で届く | 多くの endpoint は pydantic が寛容に型変換するので通る。**バリデーションエラーになったらそれが原因** |
| 配列に**数値**を入れたい / 完全な JSON 制御が要る | CLI をやめて `fal_client`（アプリコード）か HTTP で叩く |

**CLI は「モデルの挙動をすぐ試す・スキーマの当たりを取る」ための道具**であり、
プロダクションの生成経路にはしない（アプリコードは `fal_client`。`SKILL.md` §2 / §4）。

---

## 3. 入出力の扱い

### 入力に画像・音声・動画を渡す

fal のモデルは **URL（または data URI）で入力を受け取る**。ローカルファイルのパスは渡せない。

| 状況 | やり方 |
|---|---|
| すでに公開 URL がある | そのまま `image_url=` / `image_urls[0]=` に渡す |
| ローカルファイルしかない（アプリコード） | `fal_client.upload_file(path) -> str`（アップロードして access URL を返す。fal-client 1.0.0 で確認）。`upload` / `upload_image` / `*_async` 版もある |
| Supabase に置いてある非公開ファイル | **Private バケット + `createSignedUrl` で期限付き URL を作って渡す**（`.claude/rules/supabase-first.md`） |

### 出力

結果 JSON は **生成物の URL** を返す（`images[].url` など）。**fal の URL を永続 URL として DB に保存しない**
— 生成物を保持するなら自分の Supabase Storage（Private バケット）へコピーし、
パスは `users/{user_id}/generations/{id}.png` の RESTful 階層にする（`SKILL.md` §5）。

CLI で手元に落とすだけなら:

```bash
fal api openai/gpt-image-2 prompt="..." | tee /tmp/out.json
curl -sSL "$(jq -r '.images[0].url' /tmp/out.json)" -o /tmp/out.png
```

---

## 4. `fal files` の注意（モデル入力用のアップロードではない）

`fal files` は `FalFileSystem`（fal serverless の REST）を叩く操作で、**自前の fal アプリが読む永続
ストレージ**用。**既製モデルに入力画像を渡すための CDN アップロードとは別物**なので混同しない。
モデル入力用は §3 のとおり `fal_client.upload_file` か公開 URL を使う。

---

## 5. 認証まわり（`SKILL.md` §3 の実行コマンド）

```bash
fal auth whoami                  # 今どの principal で動いているか ← 挙動が変なときは最初にこれ
fal auth login                   # ローカル: ブラウザで GitHub / Google / SSO
fal auth login --no-browser      # ブラウザを開けない環境では URL 表示のみ
fal keys create --scope API      # アプリ実行用（モデル呼び出しだけ）
fal keys create --scope ADMIN    # deploy 等の管理操作用（ランタイムへ配らない）
fal profile set <name>           # 複数アカウント / キーの切り替え
fal doctor                       # 解決された資格情報・環境の確認
```
