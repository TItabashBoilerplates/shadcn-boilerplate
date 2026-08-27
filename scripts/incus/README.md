# Incus 開発コンテナ

ホストに Nix / Docker を入れずに、この リポジトリの開発環境を Incus のコンテナへ隔離する。
**ソースはホスト側の clone が正本**で、それを箱へ bind mount する。

> **環境を作るのは devenv のまま。** ここにあるのは Incus のインスタンスを作って
> 作業ツリーをマウントするだけのスクリプトで、Node / Python / Bun / Supabase CLI 等は
> 従来どおり `devenv.nix` が持つ。**別の環境マネージャ（Devbox 等）は導入していない。**

設計の背景・判断根拠は [`docs/designs/incus-devenv-isolation.md`](../../docs/designs/incus-devenv-isolation.md)。

> ⚠️ **v1 は未実測**。初回は `doctor` → `up` の順で流し、`docs/designs/…` §8 のチェックを埋めること。

## 前提（ホストに入れるのはこれだけ）

```bash
brew install incus     # クライアント。Incus サーバは Linux 専用なので macOS はこれだけ
brew install colima    # macOS のみ。Incus サーバを載せる Linux VM
```

Linux ホストなら `colima` は不要（`incusd` を直接動かす）。

## 使い方

```bash
./scripts/incus/incus.sh doctor    # 前提の診断だけ
./scripts/incus/incus.sh up        # 箱の作成〜マウントまで（冪等）
./scripts/incus/incus.sh shell     # 箱に入る。cd 済みで direnv が発火する

# 箱の中で（いつもどおり）
supabase-start
devenv up
```

```bash
./scripts/incus/incus.sh status    # IP と各サービスの URL
./scripts/incus/incus.sh exec ci-check
./scripts/incus/incus.sh stop
./scripts/incus/incus.sh destroy   # 作業ツリーはホスト側なので失われない
```

## 並列にプロジェクトを持つ

インスタンス名は既定でリポジトリのディレクトリ名。同じリポジトリで複数の箱を持つなら:

```bash
INCUS_INSTANCE=shadcn-feature-a ./scripts/incus/incus.sh up
```

**各インスタンスが独立した IP を持つのでポート衝突が起きない。**
`--publish` を付けると `127.0.0.1:3000` 等へ転送するが、複数の箱で使うと衝突するので既定では行わない。

## 環境変数

| 変数 | 既定 | 用途 |
|---|---|---|
| `INCUS_INSTANCE` | リポジトリのディレクトリ名 | インスタンス名 |
| `INCUS_IMAGE` | `images:debian/13/cloud` | ベースイメージ |
| `INCUS_CPU` / `INCUS_MEMORY` | `8` / `16GiB` | リソース上限 |
| `INCUS_LOCAL_PATHS` | `frontend/node_modules drizzle/node_modules backend-py/.venv .devenv .direnv` | ホストと共有せず箱側の FS に置くパス |
| `COLIMA_PROFILE` / `COLIMA_CPU` / `COLIMA_MEMORY` / `COLIMA_DISK` | `incus` / `8` / `16` / `100` | macOS の VM 設定 |
| `DOPPLER_TOKEN` | （未設定なら渡さない） | 箱へ引き渡すシークレット。**本番スコープのトークンは渡さない** |

## できないこと

- **iOS ビルド**（`build-mobile-ios` / `mobile-release-ios --local`）。Xcode は macOS 専用なのでホストに残る
- ホスト側の編集に対する **HMR は要検証**。virtiofs 越しに inotify が届かない既知の制約がある
  （[設計 §5.2](../../docs/designs/incus-devenv-isolation.md)）
