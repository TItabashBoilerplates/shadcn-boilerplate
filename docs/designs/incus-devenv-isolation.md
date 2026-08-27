# 設計: Incus による devenv 開発環境の隔離

- 日付: 2026-08-27
- ステータス: **実装 v1 / Linux(native) で部分実測済み**（§8。cloud-init のネットワーク依存部分と macOS/orb は未実測）
- 調査の裏付け: [`docs/_research/2026-08-27-incus-devenv-isolation.md`](../_research/2026-08-27-incus-devenv-isolation.md)
- 実装: [`scripts/incus/incus.sh`](../../scripts/incus/incus.sh) / [`scripts/incus/cloud-init.yaml`](../../scripts/incus/cloud-init.yaml)

---

## 1. 目的と、決まっている形

**ホストには Nix も Docker も入れない。リポジトリを clone して、同梱のスクリプトを叩けば開発環境が立ち上がる。**

```bash
git clone https://github.com/TItabashBoilerplates/shadcn-boilerplate
cd shadcn-boilerplate
./scripts/incus/incus.sh up      # ← これだけで箱が立ち上がる
./scripts/incus/incus.sh shell   # ← 入れば devenv が有効
```

- **ソースの正本はホスト側の clone**。編集はホストのエディタで普段どおり行う
- 箱の中にあるのは **Nix / devenv / Docker(Supabase) / bun / uv / deno** といった実行環境だけ
- **1 プロジェクト = 1 インスタンス**。主目的は「プロジェクトを並列に持てること」
- 箱を壊しても `destroy` → `up` で作り直せる。**作業ツリーはホスト側にあるので失われない**

### 確定した前提（2026-08-27 ユーザー回答）

| 論点 | 決定 |
|---|---|
| 母艦の OS | **macOS**（Incus サーバは Linux 専用なので Linux VM が 1 枚要る。**既に入っている OrbStack を再利用する**のが既定で、Colima は代替） |
| 隔離の主目的 | **プロジェクトの並列化**。VM インスタンスではなくコンテナで十分 |
| ソースコードの置き場所 | **ホストに clone し、作業ツリーを箱へ bind mount する** |
| 起動方法 | **リポジトリ同梱のスクリプト 1 本**。ホスト側に devenv を要求しない |

> **ホスト側のエントリポイントを devenv script にしてはならない。** `devenv.nix` の scripts は
> devenv shell の中でしか PATH に載らず、「ホストに Nix を入れない」という目的と矛盾する。
> したがって `scripts/incus/incus.sh` は**素の bash** で書き、`scripts/infra/lib.sh` も source しない
> （あちらは devenv shell 内で動く前提）。

---

## 2. 構成 — macOS で VM が要る理由と、その VM の選択肢

**VM が要るのは `incusd`（Incus サーバ）が Linux 専用だから**であって、Docker のためではない。
Docker は Incus コンテナの**中**に入るので、ホスト側の Docker(Desktop / OrbStack / Colima)とは無関係。

したがって **VM は既に持っているものを再利用できる**。スクリプトは 3 つのドライバを自動判定する。

| ドライバ | 前提 | Incus サーバの置き場 | mac からの到達 |
|---|---|---|---|
| **`orb`（推奨: OrbStack を既に使っているなら）** | `orb` コマンドがある | OrbStack の Linux machine（既定名 `incus`）の中の incusd | proxy device → OrbStack の自動転送 → **`localhost:<port>`** |
| `colima` | colima がある | `colima --runtime incus` の VM | `--network-address` により**コンテナ IP へ直接** |
| `native` | ホストが Linux | ホストの incusd | コンテナ IP へ直接 |

```
┌─ macOS ────────────────────────────────────────────────────────┐
│  ~/dev/shadcn-boilerplate/     ← git clone（ソースの正本）        │
│    └ scripts/incus/incus.sh    ← これを叩く                      │
│  Xcode / iOS ビルドはここに残る                                   │
│                                                                │
│  ┌─ Linux VM（OrbStack machine もしくは colima）──────────────┐ │
│  │  incusd                                                    │ │
│  │  ┌─ Incus container "shadcn-boilerplate" ────────────────┐ │ │
│  │  │  security.nesting=true                                │ │ │
│  │  │  Nix + devenv + direnv                                │ │ │
│  │  │  dockerd → Supabase ローカルスタック                    │ │ │
│  │  │  /home/dev/app  ←── bind mount ── ホストの作業ツリー     │ │ │
│  │  │    ただし node_modules / .venv / .devenv は箱側の FS   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

`security.nesting=true` は **Nix と Docker の両方**が要求する（Nix は build sandbox の user namespace、
Docker は子 namespace）。片方だけの都合ではないので、外せない設定として扱う。

### OrbStack を使う場合の固有事項

- **macOS のホームは machine 内の `/mnt/mac` に見える**（パスが同一ではない）。
  スクリプトは `$HOME` 配下のパスを `/mnt/mac/...` へ変換してから disk device の source にする
- **ポートは 2 段**になる: Incus コンテナ → proxy device → machine → OrbStack の自動転送 → mac の `localhost`。
  そのため **orb ドライバでは `--publish` を既定で有効**にする
- **入れ子は 3 段**（OrbStack の VM → Incus コンテナ → Docker）。ここは PoC で必ず確認する（§8）
- 先行事例: [mensfeld/code-on-incus](https://github.com/mensfeld/code-on-incus) が
  macOS + OrbStack + Incus system container の構成で AI エージェントを隔離しており、
  同じポート 2 段構成を明記している

## 3. コマンド

| コマンド | 内容 |
|---|---|
| `incus.sh up` | Colima →インスタンス作成 → cloud-init 待ち → 作業ツリーの mount → `direnv allow` まで。冪等 |
| `incus.sh up --publish` | 加えて `127.0.0.1:<port>` を proxy device で箱へ転送する（**並列運用時は衝突するので既定では行わない**） |
| `incus.sh shell` | 箱の `dev` ユーザーのログインシェル。`~/app` に cd 済みで direnv が発火する |
| `incus.sh exec <cmd>` | 箱の中でコマンドを 1 発実行（`incus.sh exec ci-check` のように使う） |
| `incus.sh status` | 状態・IP・各サービスの URL |
| `incus.sh stop` / `destroy` | 停止 / 破棄（破棄しても作業ツリーは残る） |
| `incus.sh doctor` | 前提条件の診断のみ |

環境変数で上書きできるもの: `INCUS_DRIVER`（`orb` / `colima` / `native`）/ `INCUS_INSTANCE`（同一リポジトリを
複数の箱で回すとき）/ `INCUS_IMAGE` / `INCUS_CPU` / `INCUS_MEMORY` / `INCUS_LOCAL_PATHS` / `ORB_MACHINE` / `COLIMA_*`。

---

## 4. 責務の分担（二重管理をしない）

| 層 | 持つもの | ファイル |
|---|---|---|
| ホスト | incus クライアント（+ macOS は colima）のみ | — |
| インスタンス設定 | nesting / syscall intercept / CPU / メモリ / mount | `scripts/incus/incus.sh` |
| 箱の土台 | Docker・Nix・devenv・direnv・`dev` ユーザー | `scripts/incus/cloud-init.yaml` |
| 開発ツール | Node / Python / Deno / Bun / uv / Supabase CLI / 各種 CLI | **`devenv.nix`（既存のまま）** |

**cloud-init に開発ツールを書かない。** そこは devenv.nix の担当であり、書くと二重管理になる。
ベース OS に Debian を選んでいるのも同じ理由で、NixOS にすると「NixOS の構成管理」と
「devenv.nix」の二重管理になる。

---

## 5. ファイル共有の設計

### 5.1 共有するもの / しないもの

作業ツリー全体を `/home/dev/app` へ bind mount したうえで、**以下だけは箱の中のローカル FS へ逃がす**
（Incus のストレージボリュームを重ねる）:

```
frontend/node_modules   drizzle/node_modules   backend-py/.venv   .devenv   .direnv
```

理由は 2 つ。**速度**（virtiofs 越しの `node_modules` は致命的に遅い）と、**正しさ**
（darwin 版と linux 版のネイティブバイナリが同じディレクトリで混ざるのを防ぐ）。
いずれも `.gitignore` 済みで再生成可能なパスに限定してある。

`uid` のずれは `shift=true`（idmapped mount）で解消し、使えない環境では `raw.idmap both <uid> 1000`
へフォールバックする（未設定だと全ファイルが overflow uid で見え、何も読めない）。

### 5.2 既知のリスク: ホスト側の編集が箱に通知されない

**macOS では virtiofs / 9p 越しにホスト側の変更の inotify が guest へ届かない**
（Docker Desktop / Podman / Colima / Lima 共通の既知の制約。調査 §4.5）。
実害は **ホットリロードが動かないこと**で、このリポジトリは監視プロセスが 4 つある
（web 3000 / desktop 1420 / Metro 8081 / Storybook 6006）。

**この形を採る以上、ここは避けられないので正面から扱う。**

1. **まず実測する。** Colima の構成（`vz` + virtiofs、Lima の `mountInotify`）で実際に
   イベントが飛ぶかはバージョン依存であり、飛ばないと決めつけない
2. 飛ばなかった場合の対策は**ポーリング監視**。Vite / webpack / chokidar 系は
   `CHOKIDAR_USEPOLLING=1`、Metro は別途設定が要る。CPU を食い反応が数秒遅れるため、
   **箱の中で有効化する env として `devenv.nix` 側に入れるか、incus.sh が注入するかを決める**
3. それでも実用に耐えない場合の退避策は、作業ツリーの双方向同期（Mutagen 等）を
   `incus.sh` に内蔵すること。**依存が 1 つ増えるので、2 が駄目だと分かってから採る**

---

## 6. ネットワーク

| ドライバ | 到達方法 |
|---|---|
| `orb` | proxy device で machine 側に出し、OrbStack の自動転送で **mac の `localhost:<port>`** に届く。`up` が既定で公開する |
| `colima` | `--network-address` により**コンテナ IP へ直接**。ポート衝突が原理的に起きないので既定では公開しない |
| `native` | コンテナ IP へ直接 |

対象ポート: web 3000 / desktop 1420 / Metro 8081 / backend 4040 / Storybook 6006 / Supabase 54321・54323・54324。

> **並列運用時の注意**: `orb` は `localhost` を共有するため、2 個目以降の箱は同じポートを取り合う。
> 現状は「同時に走らせるのは 1 つ」か「`--no-publish` にして machine 内から使う」しかない。
> ポートのオフセット割り当ては PoC 後に検討する（§9）。

`env/*/.env.local` の `127.0.0.1:54322` は、**Supabase を同じ箱の中で動かす限り変更不要**。

## 7. できないこと

| 項目 | 可否 |
|---|---|
| **iOS ビルド / TestFlight**（`build-mobile-ios` / `mobile-release-ios --local`） | **不可**。Xcode は macOS 専用。**ホストに残す** |
| Android ビルド（`-P android`） | 可。ただし実機 USB / エミュレータは追加設計が要る |
| Expo 実機（Expo Go → Metro 8081） | 端末から箱の IP に到達できるかを実測する（§8） |
| Web の Maestro E2E | 可（Chromium を箱に入れる） |

---

## 8. 実測結果（2026-08-27, Linux / native ドライバ）

Incus 6.0.0 / kernel 6.18 / Ubuntu 24.04（dir ストレージプール）で `incus.sh` を実際に流した。
**この環境はコンテナからの外向き通信がプロキシ経由に限定されているため、cloud-init の
apt / Nix 取得は検証できていない**（下表の「未実測」）。それ以外は実物で確認した。

### 確認できたこと

| # | 項目 | 結果 |
|---|---|---|
| 1 | `images:debian/13/cloud` の取得と起動 | ✅ |
| 2 | `security.nesting=true` で **user namespace を作れる**（`unshare -Ur`）= Nix の build sandbox の前提 | ✅ |
| 3 | コンテナ内で **systemd が PID 1 として動く**（`systemctl is-system-running` = running）= cloud-init の前提 | ✅ |
| 4 | `cloud-init.yaml` が **cloud-init 本体のスキーマ検証を通る** | ✅ |
| 5 | ローカルボリューム 5 本（node_modules × 2 / .venv / .devenv / .direnv）の作成と、作業ツリー内へのマウント | ✅ |
| 6 | `exec` が解決した開発ユーザーとして `$APP_PATH` で動き、書き込める | ✅ |
| 7 | `status` の IP / URL 表示 | ✅ |

### 実測で見つかった不具合（修正済み）

| # | 症状 | 修正 |
|---|---|---|
| A | **cloud イメージには uid 1000 の既定ユーザーが既にいる**（Debian は `debian`）。`dev` を uid 1000 で作る cloud-init は `UID 1000 is not unique` で必ず失敗する | uid 1000 の既存ユーザーを再利用し、いなければ作る形に変更。スクリプト側も `getent passwd 1000` で**ユーザー名とホームを実行時に解決**する（Ubuntu なら `ubuntu`）。ユーザー名に依存しないよう profile は `/etc/profile.d/` へ |
| B | **`shift=true` が使えない環境がある** — `Required idmapping abilities not available` で失敗 | フォールバック経路が実際に必要であることを確認。想定どおり `raw.idmap` へ退避する |
| C | **idmap 無しで mount すると全ファイルが `65534:65534`（overflow uid）に見え、読めるが書けない**。しかもコンテナは正常に起動するため、後から謎の EACCES として出る | `verify_workspace_access()` を追加。マウント直後に**所有 uid と実際の書き込みを検査**し、65534 なら原因を名指しして停止する（実測で検知できることを確認） |
| D | **`raw.idmap` でホストの uid 0 を写すとコンテナ自体が起動しなくなる**（rootfs が `Permission denied`。root で実行した場合に踏む） | root 実行を検出して事前に停止。さらに restart に失敗したら **raw.idmap と device を戻してからエラーにする**（壊れたまま放置しない） |

### 未実測（環境の制約で確認できていないもの）

| # | 項目 | 備考 |
|---|---|---|
| 1 | cloud-init の apt / **Nix インストール / devenv 導入**の完走 | コンテナからの外向き通信がプロキシ限定のため。**macOS で最初に流すときの最有力の失敗点** |
| 2 | 箱の中での `direnv allow` → `devenv shell` → `supabase-start` → `ci-check` | 同上 |
| 3 | **orb ドライバ全般**（OrbStack machine 内の incusd、`/mnt/mac` へのパス変換、3 段の入れ子での Docker） | macOS が要る |
| 4 | **ホスト側の編集で HMR が反応するか**（§5.2） | macOS が要る。共有ファイルシステムの inotify 問題 |
| 5 | `docker info` の Storage Driver が `vfs` でないこと | 上記 1 が通ってから |

## 9. 次の段階（PoC が通ってから）

1. **golden image 化** — `incus publish` でプロビジョニング済みイメージを作り、2 個目以降の箱を秒で作る
2. **snapshot 運用** — マイグレーション前に `incus snapshot create`
3. **README への追記** — Setup に「Incus 経由」の節を足す（現行の Setup はホストに Nix を入れる手順）
4. **Doppler の資格情報** — 現状は `DOPPLER_TOKEN` があれば箱へ引き渡す実装。
   **本番スコープのトークンは箱に入れない**（`.claude/rules/mcp-doppler.md`）

---

## 10. 参考

- 一次情報と出典: [`docs/_research/2026-08-27-incus-devenv-isolation.md`](../_research/2026-08-27-incus-devenv-isolation.md)
- 関連ルール: `.claude/rules/mcp-doppler.md`（シークレット）/ `.claude/rules/minimal-implementation.md`（依存を増やす判断）
