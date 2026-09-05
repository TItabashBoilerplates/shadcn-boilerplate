---
name: tauri
description: 本リポジトリで Tauri v2 のデスクトップアプリ（frontend/apps/desktop）を実装・変更・ビルド・配布するときのガイダンス。Rust コマンド（IPC）の定義、capabilities / permissions によるセキュリティモデル、CSP、tauri.conf.json、Vite との配線、モノレポでの UI 共有方針、Linux ビルドに必要なシステム依存（devenv の desktop profile）、Next.js を載せられない理由を扱う。「デスクトップアプリ」「Tauri」「ネイティブアプリにしたい」「Electron」「exe / dmg / AppImage を作りたい」「Rust から値を取りたい」「invoke」「ウィンドウサイズ」「自動更新」といった話題が出たら、ユーザーが Tauri の名前を出していなくても必ず最初に起動すること。公式の Agent Skill が存在しないため、このスキルが唯一の拠り所になる。
---

# Tauri v2（本リポジトリのデスクトップアプリ）

**対象**: `frontend/apps/desktop/`（Vite + React + Tauri 2）

**公式 Skill は存在しない**（tauri-apps は Agent Skill を配布していない）ため、
本スキルは**公式ドキュメント（v2.tauri.app）を一次情報として**書いている。
API・設定キー・前提条件は記憶で書かず、必ず公式または `src-tauri/gen/schemas/` の
生成スキーマで裏を取ること（`.claude/rules/research.md`）。

---

## 0. 最初に読む: なぜ Next.js（apps/web）を再利用しないのか

**Tauri は Node.js サーバーを持たない。** したがって Next.js は **SSG（`output: 'export'`）
でしか載らない**（公式の Next.js ガイドも「only Static Site Generation (SSG) can be used」と明記）。

`apps/web` は次に依存しており、いずれも静的書き出しできない:

- Server Components / Server Actions
- `next-intl` のサーバー側ロケール解決
- **Supabase SSR のサーバー側 `getUser()` による認可**（`.claude/rules/auth.md`）

したがって本リポジトリは **`apps/desktop` を Vite + React の別アプリ**にし、
**UI とドメインロジックは `@workspace/*` で共有**する構成を採っている。
「web をそのまま Tauri で包む」提案は却下される。

| 共有するもの | 置き場所 |
|---|---|
| UI コンポーネント（shadcn/ui） | `@workspace/ui` |
| デザイントークン | `@workspace/tokens` |
| Supabase クライアント | `@workspace/client-supabase` |
| 認証のバリデーション・エラー整形 | `@workspace/auth` |
| サーバーステート | `@workspace/query` |

**デスクトップ専用に UI やクラス文字列を複製しない**（`.claude/rules/clean-code.md`）。

---

## 1. ディレクトリ構成

```
frontend/apps/desktop/
├── index.html              # Vite のエントリ
├── vite.config.ts          # port 1420 固定（tauri.conf.json の devUrl と一致させる）
├── postcss.config.mjs      # @workspace/ui の設定を再 export
├── src/                    # FSD レイヤー
│   ├── main.tsx
│   ├── app/styles/globals.css   # @workspace/ui/styles/globals.css を import するだけ
│   ├── views/…
│   └── shared/lib/…
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/
    └── src/
        ├── main.rs         # デスクトップのエントリ（lib の run() を呼ぶだけ）
        └── lib.rs          # 実体。モバイル対応の共通エントリでもある
```

**`src-tauri/target/` と `src-tauri/gen/` は gitignore 済み**（生成物）。

---

## 2. Rust コマンド（フロント ↔ Rust の IPC）

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn platform_label() -> String {
    std::env::consts::OS.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![platform_label])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```ts
import { invoke } from '@tauri-apps/api/core'
const os = await invoke<string>('platform_label')
```

### 必ず守る点（公式仕様。推測で書かない）

| 項目 | 仕様 |
|---|---|
| **コマンド名は一意** | 重複するとビルド時に落ちる |
| **`lib.rs` 内のコマンドに `pub` を付けない** | グルーコード生成の制約。別モジュール（`commands.rs`）に置く場合は**逆に `pub` が必要**で、`generate_handler![commands::foo]` と書く（フロント側の名前は `foo` のまま） |
| **引数は既定で camelCase** | Rust の `invoke_message` → JS は `{ invokeMessage: ... }`。snake_case で渡したいなら `#[tauri::command(rename_all = "snake_case")]` |
| **エラーは `Result` で返す** | `Result<T, E>` の `E` は `serde::Serialize` が必要（`thiserror` + 手書き `Serialize` が定石）。**`unwrap()` でパニックさせない**（`.claude/rules/error-handling.md`） |
| **重い処理は `async fn`** | 同期コマンドは**メインスレッドを止めて UI が固まる** |
| **`async fn` で借用型を使えない** | `&str` や `State<'_, T>` は不可。`String` にするか `Result<T, ()>` で包む |

### フロント側は「Tauri の中か」を必ず判定する

`@tauri-apps/api` は **Tauri の WebView の中でしか動かない**。トップレベルで import すると
`vite dev` をブラウザで開いた瞬間に落ちる。

```ts
export async function getPlatformLabel(): Promise<string | null> {
  if (!('__TAURI_INTERNALS__' in window)) return null   // ブラウザで開かれている
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('platform_label')
}
```

---

## 3. セキュリティ: capabilities / permissions（v1 の allowlist ではない）

Tauri v2 は **capability = 「どのウィンドウに、どの permission を与えるか」** という単位で
権限を設計する。ファイルは `src-tauri/capabilities/*.json`（このディレクトリ配下は既定で有効）。

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

- `$schema` を書くとエディタ補完と検証が効く（**書くこと**）。
- **境界はウィンドウの `label`**（`title` ではない）。ラベルを変えると capability の対象が外れる。
- プラグイン API は `fs:default` / `global-shortcut:allow-register` のように
  **`<plugin>:<permission>`** の形で明示的に許可する。**必要なものだけを足す**。
- プラットフォーム限定なら `"platforms": ["linux", "macOS", "windows"]`。
- **capability が守るのは「フロントが乗っ取られたときの被害」**であって、
  **Rust 側の危険なコードや緩すぎる scope は守らない**（公式が明記）。
- **リモート URL からの API アクセスは既定で無効。**安易に有効化しない。

### CSP は `tauri.conf.json` の `app.security.csp` に書く

```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ipc: http://ipc.localhost"
}
```

`ipc:` / `http://ipc.localhost` は **IPC に必要**なので消さない。
外部 API（Supabase 等）を叩くなら `connect-src` にオリジンを足す
（`apps/web` の `next.config.ts` と同じ考え方で、**環境変数から組み立てて実態と一致させる**）。

---

## 4. `tauri.conf.json` の要点

| キー | 注意 |
|---|---|
| `identifier` | **逆ドメイン形式で一意にする**。バンドル ID になるので後から変えるとインストール済みアプリと別物になる |
| `build.devUrl` | **`vite.config.ts` の port と一致**（本リポジトリは 1420 固定）。ズレると `tauri dev` が真っ白になる |
| `build.frontendDist` | Vite の出力（`../dist`） |
| `build.beforeDevCommand` / `beforeBuildCommand` | `bun run dev` / `bun run build`。**モノレポでは cwd が `src-tauri` の親になる**点に注意 |
| `app.windows[].label` | capability の境界。既定は `main` |
| `bundle.icon` | **アイコンが無いとバンドルに失敗する**。`bunx tauri icon <元画像>` で全サイズを生成できる |

---

## 5. ビルドとローカル実行

```bash
# フロントだけ（ブラウザで UI を確認する。Rust 不要・devenv 既定の shell で動く）
dev-desktop                         # devenv script（Vite を 1420 で起動）

# ネイティブウィンドウを出す / 配布物を作る
desktop-run                         # 既定は **本番バックエンド**に向けて起動
desktop-run --env local             # ローカル Supabase / backend
desktop-run --build                 # .app / .dmg / .msi / .AppImage（**署名なし**。配布は §6.5）
```

**`nr tauri:dev` を素の shell から直接叩かないこと。** 2 つの前提が同時に要り、
`desktop-run`（`scripts/desktop/run.sh`）がまとめて面倒を見る:

| 前提 | 欠けたときの症状 |
|---|---|
| **Rust** … opt-in profile `-P desktop` にしか無い | `cargo: command not found` |
| **バックエンドの向き先** … `NEXT_PUBLIC_*` は Vite が**ビルド時に焼き込む** | 起動はするが **localhost を見る .app** ができる（`-P production` 等の env profile が Doppler から入れる） |

### Linux は WebKitGTK が要る（`-P desktop` が必要な理由）

**Rust があればビルドできる、ではない。** Linux の Tauri は WebKitGTK にリンクするため、
無いと `cargo check` の時点で

```
HINT: you may need to install a package such as glib-2.0, glib-2.0-dev or glib-2.0-devel.
```

で落ちる。本リポジトリは **devenv の opt-in profile `desktop`** に
`webkitgtk_4_1` / `gtk3` / `libsoup_3` / `glib-networking` / `pkg-config` / `openssl` /
`librsvg` を入れてある（closure が数 GB になるため既定の shell には入れない。
`android` profile と同じ方針）。

**macOS / Windows では `-P desktop` は不要**（Xcode Command Line Tools / MSVC + WebView2 という
OS 側の前提だけで足りる）。公式の前提条件は下表のとおり:

| OS | 必要なもの |
|---|---|
| Linux (Debian) | `libwebkit2gtk-4.1-dev` `build-essential` `libssl-dev` `libayatana-appindicator3-dev` `librsvg2-dev` |
| Linux (Fedora) | `webkit2gtk4.1-devel` `openssl-devel` + Development Tools |
| Linux (Arch) | `webkit2gtk-4.1` `base-devel` `openssl` `libappindicator-gtk3` |
| macOS | Xcode（iOS もやるなら Command Line Tools だけでは不足） |
| Windows | Microsoft C++ Build Tools（Desktop development with C++）+ WebView2（Win10 1803+ は同梱） |

---

## 6. よくある壊れ方

| 症状 | 原因 |
|---|---|
| `tauri dev` で真っ白 | `devUrl` と Vite の port 不一致 / Vite がまだ立っていない |
| ブラウザで開くと即エラー | `@tauri-apps/api` をトップレベル import している（§2 の判定を入れる） |
| `cargo check` が glib で落ちる | Linux のシステム依存が無い（`-P desktop`） |
| バンドルだけ失敗する | `bundle.icon` のアイコンが無い / サイズ不足 |
| 本番だけ CSP でリソースが読めない | `app.security.csp` に外部オリジンを足していない |
| `invoke` が "command not found" | `generate_handler!` への登録漏れ / `lib.rs` のコマンドに `pub` を付けた |
| 引数が `undefined` になる | camelCase / snake_case の取り違え（§2） |
| UI が固まる | 重い処理を同期コマンドで書いている（`async fn` にする） |

---

## 6.5. 配布と自動更新（**まず `desktop-release` スキルを起動する**）

**手順の正本は `docs/desktop/release-runbook.md`、判断の正本は
`.claude/skills/desktop-release/`。** 配布・更新の話が出たらそちらを先に読む。
ここでは Tauri 側の設定がどう絡むかだけ書く。

```
tauri.conf.json          … productName / identifier / version / plugins.updater（endpoint + 公開鍵）
tauri.release.conf.json  … createUpdaterArtifacts: true（**CI 専用 overlay**。--config で重ねる）
tauri.macos.conf.json    … bundle.targets = ["app", "dmg"]
tauri.windows.conf.json  … bundle.targets = ["nsis"] / installMode = currentUser
capabilities/default.json… updater:default / process:default
src/lib.rs               … tauri_plugin_updater / tauri_plugin_process の .plugin() 登録
```

- リリースは **GitHub Actions `desktop-release.yml`**（`tauri.conf.json` の版を上げて main へ
  マージすると自動で走る。手動起動は `desktop-release` script）。macOS は Apple Silicon の DMG
  （Developer ID 署名 + 公証 + staple を `tauri build` が自動実行）、Windows は NSIS x64。
  配布先は Supabase Storage の public バケット `releases`、Web の入口は `/download`。
- **`createUpdaterArtifacts` を base の `tauri.conf.json` に書かない。** 書くと秘密鍵の無い
  ローカル `desktop-run --build` が落ちる。CI だけ overlay を重ねる。
- **JSON Merge Patch では配列が丸ごと置換される** — `tauri.macos.conf.json` /
  `tauri.windows.conf.json` の `bundle.targets` が各 OS の確定値になる。
- 署名 env（`APPLE_CERTIFICATE` 等）が無くても **`tauri build` は未署名のまま成功する**。
  CI は guard step で止めている（外さない）。
- **`plugins.updater.endpoints` と `pubkey` は永続。** 配布済みアプリはその URL しか見ず、
  焼き込んだ公開鍵でしか検証しない。生成・配線は `desktop-updater-keygen`
  （Doppler `all/all` に秘密鍵 → GitHub Repository secret → `tauri.conf.json` に公開鍵）。
- **sidecar（`externalBin`）を足すなら macOS の entitlements**: hardened runtime（署名時に必須・
  Tauri 既定で有効）下で bun compile のバイナリ等を動かすには `bundle.macOS.entitlements` に
  JIT 系の plist を配線する。Tauri はその plist を**メインバイナリと sidecar の両方**に適用して
  署名する（sidecar だけに別の plist を渡す仕組みは無い）。**開発ビルドでは hardened runtime が
  無いので再現せず、署名済みビルドでだけ起動に失敗する。**
- 配線は `src/shared/config/desktop.policy.test.ts` が検査している（消さない）。

---

## 7. このリポジトリのルールとの関係

| ルール | 効き方 |
|---|---|
| `.claude/rules/minimal-implementation.md` | プラットフォーム情報程度のために `@tauri-apps/plugin-os` を足さない（Rust コマンド 3 行で済む）。逆に**自動更新・ファイル選択・通知は自作せず公式プラグイン**を使う |
| `.claude/rules/clean-code.md` | UI は `@workspace/ui`。デスクトップ用にコンポーネントを複製しない |
| `.claude/rules/error-handling.md` | Rust 側は `Result` で返す。`unwrap()` でパニックさせない。JS 側も握りつぶさない |
| `.claude/rules/i18n.md` | デスクトップの文言も i18n 必須（このアプリは未導入なので、文言は接続コンポーネント 1 か所に集める） |
| `.claude/skills/desktop-release/` | **配布・署名・自動更新はこちらが正本**（鍵と endpoint は永続 = 間違えると取り返しがつかない） |
| `.claude/rules/ui-testing.md` | UI は Storybook（`@workspace/ui` 側でカバー）。Tauri 固有の IPC は単体テスト |
| `.claude/skills/monorepo/` | `packages/` への切り出し境界。`design-system.md` が Web/Native/Desktop の共有範囲の正本 |

---

## 参考（一次情報）

- [Tauri v2 Docs](https://v2.tauri.app/)
- [Prerequisites](https://v2.tauri.app/start/prerequisites/) — OS ごとの前提パッケージ
- [Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/) — `#[tauri::command]` / 引数の命名規則 / async の制約
- [Capabilities](https://v2.tauri.app/security/capabilities/) — permission / scope / ウィンドウ境界
- [Next.js フロントエンド](https://v2.tauri.app/start/frontend/nextjs/) — **SSG のみ**という制約の根拠
- [Configuration リファレンス](https://v2.tauri.app/reference/config/)
- [Updater plugin](https://v2.tauri.app/plugin/updater/) — 静的 JSON マニフェスト / `createUpdaterArtifacts` / 署名鍵
- [Code signing (macOS)](https://v2.tauri.app/distribute/sign/macos/) — `APPLE_*` env / notarytool / entitlements
