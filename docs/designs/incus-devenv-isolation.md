# 設計案: Incus による devenv 開発環境の隔離

- 日付: 2026-08-27
- ステータス: **提案（未確定）** — §8 の 4 点はユーザー判断が要る
- 調査の裏付け: [`docs/_research/2026-08-27-incus-devenv-isolation.md`](../_research/2026-08-27-incus-devenv-isolation.md)

---

## 1. 何を解決したいのか（前提の確認）

「開発環境を隔離したい」には少なくとも 3 つの動機があり、**どれが主目的かで最適解が変わる**。

| 動機 | 効いてくる要件 |
|---|---|
| **A. 母艦を汚したくない**（Nix / Docker / SDK を PC 本体に入れたくない） | 使い捨てとやり直しの容易さ。隔離の強度は二の次 |
| **B. プロジェクトごとに独立した環境を並列に持ちたい** | インスタンスの複製・スナップショット・ポート衝突回避 |
| **C. 信用しきれないコード / AI エージェントに好き勝手させても壊れない箱が欲しい** | **隔離の強度が最優先。後述のとおり `security.nesting=true` は隔離を弱めるので、この動機なら VM を選ぶべき** |

本設計は **A + B を主目的**として書き、C を重視する場合の差分を §6 に置く。

---

## 2. 全体像

母艦の OS によって「層の数」が変わる。ここが最初の分岐点。

```
【Linux 母艦（構成案 A）】                 【macOS 母艦（構成案 B）】
┌────────────────────────┐              ┌──────────────────────────────┐
│ Linux ホスト            │              │ macOS（Xcode / iOS はここに残す）│
│  incusd                │              │  incus クライアント（brew）      │
│  ┌──────────────────┐  │              │  ┌────────────────────────┐  │
│  │ Incus container   │  │              │  │ Lima VM (colima incus)  │  │
│  │  nix + devenv     │  │              │  │  incusd                 │  │
│  │  dockerd          │  │              │  │  ┌──────────────────┐   │  │
│  │   └ Supabase 群   │  │              │  │  │ Incus container   │   │  │
│  │  bun/uv/deno      │  │              │  │  │  nix + devenv     │   │  │
│  └──────────────────┘  │              │  │  │  dockerd → Supabase│  │  │
└────────────────────────┘              │  │  └──────────────────┘   │  │
                                        │  └────────────────────────┘  │
                                        └──────────────────────────────┘
```

**1 プロジェクト = 1 Incus インスタンス**とし、その中で `devenv up` までが完結する状態を目標にする。

---

## 3. 構成案の比較

| | **A. Linux 母艦 + native Incus** | **B. macOS + Colima(incus)** | **C. Incus の VM インスタンス** |
|---|---|---|---|
| 前提 | Linux デスクトップ / 常設 Linux マシン | macOS（現在の README の前提） | Linux 母艦、または macOS なら **M3 以降**（ネスト仮想化） |
| 層 | 1 層 | 2 層（VM → コンテナ） | 1〜2 層（VM が本物の VM） |
| Docker(Supabase) | `security.nesting=true` で動く | 同左 | **素直に動く**（nesting 不要） |
| Nix build sandbox | nesting 必須 | 同左 | 不要 |
| 隔離の強度 | 中（カーネル共有 + nesting で緩和） | 中（外側が VM なので実質は強い） | **強** |
| メモリ / 起動 | 軽い・秒で起動 | 軽い（VM 1 枚ぶんの固定費） | 重い（GB 単位を占有） |
| ファイル I/O | 速い | virtiofs を挟むぶん遅い | 中 |
| **推奨** | ◎ 本命 | ○ macOS ならこれ | △ 動機 C のときだけ |

> **正直な指摘**: 隔離だけが目的で母艦が macOS なら、「Lima VM を 1 枚立てて、その中で直接 devenv を動かす」
> ほうが層が 1 つ少なく簡単である。**Incus を挟む価値は「複数プロジェクトを並列に持てる」「snapshot で
> 巻き戻せる」「golden image から数秒で新しい箱を作れる」という B の動機にある。**
> A のみが目的なら Incus は過剰かもしれない（`.claude/rules/minimal-implementation.md`）。

---

## 4. コンテナの中身（構成案 A / B 共通）

### 4.1 ベース OS

**Debian 13（`images:debian/13/cloud`）を推奨。** NixOS イメージも使えるが、本リポジトリは
devenv.nix が環境の正本なので、ベースを NixOS にすると「NixOS の構成管理」と「devenv.nix」の
二重管理になる。Debian なら Docker / Supabase CLI 周りの前提が最も素直。

`/cloud` バリアントを選ぶのは **cloud-init で初期構築を無人化するため**（§4.5）。

### 4.2 必須のインスタンス設定

```bash
incus launch images:debian/13/cloud devbox \
  -c security.nesting=true \
  -c security.syscalls.intercept.mknod=true \
  -c security.syscalls.intercept.setxattr=true \
  -c limits.cpu=8 -c limits.memory=16GiB
```

- `security.nesting` は **Nix の build sandbox と Docker の両方**が要求する（調査 §2）
- リソース上限は Supabase（Postgres + 各サービス）+ Next.js + Metro + Storybook が同居する前提で決める

### 4.3 中に入れるもの（順序が重要）

1. `docker.io` / `docker-compose-plugin`（Supabase CLI が使う）
2. Nix（Determinate installer、multi-user）
3. `devenv` / `direnv`（`nix profile install nixpkgs#devenv`）
4. 非 root の開発ユーザー（uid 1000）と、そのシェルへの `direnv hook`

Docker のストレージドライバは、外側のストレージプールに依存する（調査 §3）。
**ZFS プールなら `zfs.delegate=true` を設定して `overlay2` を使わせる**。実機で `docker info` の
`Storage Driver` を必ず確認する（ここを確認せずに `vfs` のまま運用すると Supabase の起動が極端に遅くなる）。

### 4.4 ソースコードの置き場所（macOS では最大の論点）

**論点は「どこで書くか」ではなく「ファイルの実体がどこにあるか」。** どの方式でも、
ツールチェイン（Nix / bun / uv / Docker）は Incus の中にあり、エディタは mac のものを使える。
違うのは**ファイルの実体が mac 側にあるか、箱の中にあるか**の一点だけで、
macOS ではこの境界を跨いだ瞬間に**ファイル監視（inotify）が効かなくなる**。

#### 決定的な事実: virtiofs / 9p はホスト側の変更を guest に通知しない

mac 上のファイルを Lima VM 経由で見せる仕組み（virtiofs / 9p）では、
**ホスト側でファイルを書き換えても guest 内のプロセスに inotify イベントが届かない**。
Podman / Docker Desktop / Colima / Lima すべてで報告されている既知の制約で、
実害は **「ホットリロードが動かない」**（[podman#22343](https://github.com/containers/podman/issues/22343)、
[vfkit#126](https://github.com/crc-org/vfkit/issues/126)、[lima#615](https://github.com/lima-vm/lima/issues/615)）。
Lima には実験的な `mountInotify` があるが、ファイル削除は扱えないなど部分的な対応にとどまる。

→ **mac のエディタで保存 → 箱の中の Next.js / Vite / Metro が気づかない**、という状態になる。
本リポジトリは web(3000) / desktop(1420) / mobile Metro(8081) / Storybook(6006) と
監視するプロセスが 4 つあるため、ここが壊れると開発体験が成立しない。

#### 3 つの選択肢

| 方式 | ファイルの実体 | HMR | 評価 |
|---|---|---|---|
| **① 箱の中に clone + Remote-SSH（推奨）** | 箱の中（ext4/btrfs） | **効く** | 編集は VS Code / Cursor / JetBrains Gateway で mac から。git 操作も箱の中。体感はローカルとほぼ同じ |
| ② ホストに clone + 双方向同期（Mutagen / Unison） | 両方に実体 | **効く**（箱側はローカル FS なので） | mac 側にもファイルが残る。同期ツールという依存と、同期遅延・衝突の運用が増える |
| ③ ホストに clone + bind mount（virtiofs） | mac 側のみ | **効かない**（ポーリング必須） | `CHOKIDAR_USEPOLLING` 等でポーリングに落とせば動くが、CPU を常時食い、大きなツリーでは反応が数秒遅れる。Metro は特に苦しい |

**①を推奨する。** 「ホストに clone したい」という要望は②で満たせるが、Incus とは別に同期ツールを
1 つ増やすことになる（`.claude/rules/minimal-implementation.md` の観点では依存が 1 つ増える）。

③を採る場合の追加要件:
- `raw.idmap both <uid> 1000` または `shift=true`（未設定だと全ファイルが overflow uid で見える）。
  ただし **virtiofs 上の idmapped mount は比較的新しいカーネル / FUSE の機能**であり、
  Colima が使う構成で通るかは実機確認が必須（推測で設計に入れない）
- `node_modules` / `.venv` / `.devenv` / `.direnv` / `/nix` は**共有から除外し、箱の中のローカル FS に置く**
  （プラットフォーム依存バイナリが混ざる。速度も段違い）
- Colima は既定で `/Users/$USER` しか VM に見せない。その外にあるパスは**無言で空になる**

> なお **「プロジェクトを並列に持ちたい」**という主目的からすると、どの方式でも
> **箱ごとに独立した作業ツリーが要る**（同じツリーを複数の箱から同時にビルドさせることはできない）。
> その意味でも①が構成として素直。

### 4.5 再現性 — golden image と snapshot

Incus を使う最大の実利がここ。

```bash
# 1. 上記 4.3 まで済んだ状態を止めてイメージ化
incus stop devbox && incus publish devbox --alias devbox-base

# 2. 以降、新しいプロジェクト用の箱は数秒で作れる
incus launch devbox-base proj-x -c security.nesting=true ...

# 3. 危ない操作の前に巻き戻し点を作る
incus snapshot create proj-x before-migration
incus snapshot restore proj-x before-migration
```

初期構築（apt / Nix / devenv）は **cloud-init（`cloud-init.user-data`）に書いて `incus profile` に載せる**と、
「手順書」ではなく「設定」として Git に残せる。`scripts/incus/` に置く案は §7。

### 4.6 ネットワーク（ポート到達）

| 母艦 | 方法 |
|---|---|
| Linux | コンテナは `incusbr0` 上の IP を持つので **そのまま `http://<ip>:3000`**。localhost で受けたいなら proxy device |
| macOS + Colima | **`colima start --runtime incus --network-address`** でインスタンス IP に mac から直接到達できる |
| どちらでも | `incus config device add devbox web proxy listen=tcp:127.0.0.1:3000 connect=tcp:127.0.0.1:3000 bind=host nat=true` |

対象ポート: **3000**(web) / **1420**(desktop) / **8081**(Metro) / **4040**(backend) / **6006**(Storybook) /
**54321-54324**(Supabase, Studio と Mailpit を含む)。

- Storybook は既に `--host 0.0.0.0` なので外から届く。**Next.js / Vite / FastAPI は bind アドレスの確認が要る**
  （`127.0.0.1` にしか bind していないと、proxy device では届いても直接 IP では届かない）
- `env/*/.env.local` の `127.0.0.1:54322` は **Supabase を同じインスタンス内で動かす限り変更不要**。
  この一点だけでも「Supabase を別コンテナに分ける」案より nested docker が有利
- **Expo / Metro を実機で使うなら**、端末から Metro に到達できる必要がある。macOS の 2 層構成では
  ここが最も面倒になる（§8 の確認事項）

---

## 5. 隔離の範囲 — できないこと

| 項目 | 可否 |
|---|---|
| **iOS ビルド / TestFlight（`build-mobile-ios`, `mobile-release-ios --local`）** | **不可**。Xcode は macOS 専用。**母艦に残す** |
| Android ビルド（`-P android`） | 可（JDK/SDK/NDK は Linux で動く）。ただし実機 USB / エミュレータは追加設計が要る |
| Maestro E2E（Web） | 可（Chromium をコンテナに入れる） |
| Maestro E2E（Mobile 実機） | 母艦側 or 別途 |
| `vercel-deploy` / `store-*` 等の CLI 群 | 可（Doppler の資格情報がコンテナ内で解決できれば） |

→ **「開発は箱の中、iOS 関連だけ母艦」という二重生活になる**ことは、採用前に合意しておく必要がある。

---

## 6. 動機 C（信用しないコードを閉じ込めたい）の場合の差分

- `security.nesting=true` は **user namespace の作成をコンテナに許す設定**であり、隔離を弱める方向に働く。
  「AI エージェントに任意コマンドを実行させる箱」として使うなら、この前提は正しく認識しておく必要がある
- その場合は **Incus の VM インスタンス（構成案 C）**を使う。Docker も Nix も nesting なしで素直に動く
- macOS + Colima の 2 層構成は、外側が VM なので**実質的にはこの要件をかなり満たしている**
- どちらにせよ **Doppler の本番シークレットを箱に入れない**（`.claude/rules/mcp-doppler.md` のフェーズ制）。
  箱に渡すのは dev スコープの service token に限定する

---

## 7. 実装するとしたらの段取り（コードを書く前の合意事項）

### Phase 1 — PoC（1 インスタンス手作業）
1. Incus サーバを用意（Linux は apt、macOS は `colima start --runtime incus --network-address`）
2. `incus launch` + nesting 設定でコンテナを作る
3. Docker → Nix → devenv → direnv を手で入れ、リポジトリを clone
4. **`direnv allow` → `devenv up` → `supabase-start` → `ci-check` / `unit-test` が通ること**を確認
5. 母艦のブラウザから 3000 / 6006 / 54323 に到達することを確認

### Phase 2 — 設定として固定
6. Phase 1 の手順を **cloud-init + `incus profile`** に落とす（`scripts/incus/profile.yaml`）
7. `incus publish` で golden image を作る
8. `scripts/incus/up.sh` 等の薄いラッパを用意し、**`devenv.nix` の scripts に `incus-*` として登録**
   （`.claude/rules/commands.md`: 日常コマンドは devenv 経由に揃える）
9. README の Setup に「Incus 経由のセットアップ」を追記

### Phase 3 — 運用
10. snapshot 運用（マイグレーション前など）
11. Doppler 資格情報の受け渡し方式を確定（`doppler login` の対話 vs dev スコープの service token）

> **Phase 1 を通すまでコードは書かない。** 本リポジトリのルール上、実測していない手順を
> スクリプト化して README に載せるのは禁止に近い（`.claude/rules/design-research.md`）。

---

## 8. 確定した前提（2026-08-27 ユーザー回答）

| 論点 | 回答 | 設計への反映 |
|---|---|---|
| 母艦の OS | **macOS** | **構成案 B**（Colima の incus runtime で Linux VM → その中に Incus コンテナ）。iOS ビルドは母艦に残る |
| 隔離の主目的 | **プロジェクトを並列に持ちたい** | Incus を挟む価値が最も出るケース。**golden image + snapshot + 1 プロジェクト 1 インスタンス**を設計の中心に置く。VM インスタンス（案 C）は不要 |
| ソースコードの置き場所 | **要検討**（「clone はホスト、環境は Incus 内」を想定していた） | §4.4 のとおり、macOS では virtiofs 越しに inotify が飛ばず **HMR が壊れる**。①箱の中に clone + Remote-SSH（推奨）／②ホストに clone + 双方向同期／③bind mount + ポーリング の 3 択で、**①を推奨** |

### 残っている確認事項

1. **§4.4 の ① / ② / ③ のどれを採るか。** ①なら追加依存ゼロ。②は Mutagen 等が 1 つ増える。
   ③は HMR をポーリングに落とす覚悟が要る
2. **モバイル（Expo）を箱の中で開発するか。** 実機の Expo Go は Metro(8081) に到達する必要があり、
   macOS の 2 層構成では追加設計が要る。「モバイルだけ母艦」で妥協するかを先に決めたい
3. Doppler の資格情報を箱にどう渡すか（`doppler login` の対話 vs dev スコープの service token）。
   **本番スコープのトークンは箱に入れない**（`.claude/rules/mcp-doppler.md`）

## 9. 参考

- 調査と一次情報の出典: [`docs/_research/2026-08-27-incus-devenv-isolation.md`](../_research/2026-08-27-incus-devenv-isolation.md)
- 関連ルール: `.claude/rules/commands.md`（コマンドは devenv 経由）/ `.claude/rules/mcp-doppler.md`（シークレット）/
  `.claude/rules/minimal-implementation.md`（層を増やす判断）
