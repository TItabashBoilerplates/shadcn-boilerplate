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

### 4.4 ソースコードの置き場所（重要な分岐）

| 方式 | 内容 | 評価 |
|---|---|---|
| **① コンテナ内に clone（推奨）** | `git clone` をコンテナ内で行い、編集は VS Code Remote-SSH / Cursor / JetBrains Gateway で繋ぐ | idmap の問題が起きない。I/O が最速。**macOS では virtiofs を挟まないぶん差が大きい** |
| ② 母艦から bind mount | `incus config device add devbox src disk source=... path=/home/dev/app shift=true` | 母艦のエディタをそのまま使える。ただし **macOS では virtiofs + idmap の二段**になり、権限と速度の両方でリスク |

**①を既定にする。** 「母艦にコードを置きたい」という要件があるなら②だが、その場合は `raw.idmap both 1000 1000`
または `shift=true` を必ず設定する（未設定だと全ファイルが overflow uid で見える。調査 §4）。

なお **`node_modules` / `.venv` / `.devenv` / `/nix` は絶対に共有しない**（プラットフォーム依存のバイナリが混ざる）。

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

## 8. ユーザーに確認したい点（ここが決まらないと構成が決まらない）

1. **母艦の OS は macOS か Linux か。** → 構成案 A / B の分岐。macOS なら層が 1 つ増えることを許容できるか
2. **主目的は §1 の A / B / C のどれか。** → C ならコンテナではなく VM インスタンスを選ぶべき
3. **ソースコードは箱の中に置いてよいか**（= 編集は Remote-SSH 等になる）。母艦に置きたい場合は
   idmap と virtiofs のコストを受け入れる必要がある
4. **モバイル（Expo）を箱の中で開発したいか。** 実機の Expo Go / Metro 接続と Android 実機 USB は
   2 層構成だと追加設計が要るため、「モバイルだけ母艦」で妥協するかを先に決めたい

---

## 9. 参考

- 調査と一次情報の出典: [`docs/_research/2026-08-27-incus-devenv-isolation.md`](../_research/2026-08-27-incus-devenv-isolation.md)
- 関連ルール: `.claude/rules/commands.md`（コマンドは devenv 経由）/ `.claude/rules/mcp-doppler.md`（シークレット）/
  `.claude/rules/minimal-implementation.md`（層を増やす判断）
