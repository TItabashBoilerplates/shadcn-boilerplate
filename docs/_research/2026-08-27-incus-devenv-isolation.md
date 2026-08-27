# 調査: Incus で devenv 開発環境を隔離する

- 日付: 2026-08-27
- 目的: 本リポジトリの devenv 開発環境（Nix + Docker/Supabase + Bun/uv/Deno）を Incus のインスタンス内に
  閉じ込めて、母艦（開発者の PC）を汚さずに開発できるようにする方法を、一次情報で確認する。
- 結論の要約: **実現できる。ただし「母艦が macOS なら Linux VM が 1 枚必ず要る」「コンテナには
  `security.nesting=true` が必須（Nix の build sandbox と Docker の両方が user namespace を要求する）」
  の 2 点が構成を決定づける。**

---

## 1. Incus サーバは Linux 専用（macOS はクライアントのみ）

公式の [How to install Incus](https://linuxcontainers.org/incus/docs/main/installing/) は、macOS / Windows 向けの
配布物について **"The builds for other operating systems include only the client, not the server."** と明記している。
Homebrew の [`incus` formula](https://formulae.brew.sh/formula/incus) も client のみ。

→ **母艦が macOS の場合、`incusd`（サーバ）を動かすための Linux VM が必ず 1 枚要る。**
本リポジトリの README は `brew install direnv` / `sudo launchctl kickstart -k system/org.nixos.nix-daemon` を
案内しており、主たる開発機は macOS である前提で書かれている。

### macOS で Incus サーバを動かす手段

| 手段 | 内容 | 備考 |
|---|---|---|
| **Colima の incus runtime** | `colima start --runtime incus`（Lima ベースの Linux VM に incusd を構成） | [colima.run/docs/runtimes](https://colima.run/docs/runtimes/) が公式手順。`brew install incus` の client がそのまま繋がる |
| Lima / UTM で素の Linux VM | 自分で VM を作り incus を apt install | 手順は増えるが構成を完全に握れる |
| リモートの Linux マシン | `incus remote add` で SSH 越しに使う | 母艦のリソースを食わない。ファイル共有は別途 |

Colima は **v0.10.0 以降 `--network-address` を付けると Incus インスタンスの IP に macOS から直接到達できる**
（[colima README](https://github.com/abiosoft/colima)）。これが効くと proxy device を張らずに
`http://<container-ip>:3000` で開発サーバに届く。

**注意**: Colima のドキュメントは **Incus の VM インスタンス（コンテナではない）は m3 以降の Apple Silicon でのみ
サポート**としている（ネスト仮想化が要るため）。macOS では「Incus の *コンテナ* インスタンス」を使うのが現実的。

---

## 2. `security.nesting=true` が必要な理由は 2 つある

公式 [FAQ](https://linuxcontainers.org/incus/docs/main/faq/):

> To run Docker inside an Incus container, set the `security.nesting` property of the container to `true`.

理由①: **Docker**。Incus のコンテナは既定で unprivileged であり、子 namespace を作れない。Docker はそれを必要とする。

理由②: **Nix**。NixOS Wiki の Incus ページは `incus launch images:nixos/unstable nixos -c security.nesting=true` を
示し、**"security.nesting=true is needed for nix to work correctly"** としている。nix-daemon が build sandbox のために
`/nix/store` の remount と user namespace の作成を行うため。

→ 本リポジトリは **Nix（devenv）と Docker（Supabase CLI）の両方**を使うので、どちらの理由でも nesting は必須。

### 併せて要ることがある設定

```
security.nesting=true
security.syscalls.intercept.mknod=true      # ブロック/キャラクタデバイス作成
security.syscalls.intercept.setxattr=true   # 拡張属性
```

FAQ はさらに **「コンテナはカーネルモジュールをロードできないので、Docker の構成によってはホスト側で
追加モジュールを読ませる必要がある」**、**「`/.dockerenv` を作っておくと Docker が nesting 関連のエラーを
うまく扱える」** と述べている。

---

## 3. Docker のストレージドライバ（ZFS バックエンドの罠）

かつては Incus/LXD の ZFS プールの上で Docker の `overlay2` が動かず、`fuse-overlayfs` や `vfs` への退避が必要だった。
**ZFS 2.2 が overlayfs をサポートしたことで解消**しており、`incus storage volume set <pool> container/<name> zfs.delegate=true`
を設定すれば内側の Docker は `overlay2` で動く（[Incus フォーラム](https://discuss.linuxcontainers.org/t/it-appears-docker-now-works-fine-on-incus-containers-with-zfs-storage/23332)、
機能自体は LXD 5.17 由来）。

→ **ストレージバックエンドの選択で Docker の動き方が変わる。** dir / btrfs / zfs のどれにするかは事前に決める。
Colima の incus runtime が何を使うかは実機で `incus storage list` を見て確認すること（推測で決めない）。

---

## 4. ホストのディレクトリ共有と idmap

FAQ より:

> Without proper configuration, "all files will show up as the overflow UID/GID (`65536:65536`) and access to anything
> that's not world-readable will fail."

対処は 3 つ: **`shift=true`（idmapped mounts）** / **`raw.idmap`** / **再帰的な POSIX ACL**。

[`raw.idmap`](https://linuxcontainers.org/incus/docs/main/userns-idmap/) の書式:

```
both 1000 1000        # ホストの uid/gid 1000 を、コンテナ内の 1000 に写す
uid 50-60 500-510
gid 100000-110000 10000-20000
```

- 反映には**コンテナの再起動**が要る
- ホスト側の `/etc/subuid` / `/etc/subgid` にエントリが要る場合がある
- privileged コンテナにすればこの問題は消えるが、隔離を捨てることになるので**採らない**

**macOS の場合はこれが二段になる**（mac のファイル → Lima の virtiofs → Incus の disk device → idmap）。
性能・権限の両面でリスクが高い。

---

## 4.5 macOS 特有: virtiofs / 9p はホスト側の変更を guest に通知しない

**mac 側でファイルを編集しても、VM / コンテナ内のプロセスに inotify イベントが届かない。**
Docker Desktop / Podman / Colima / Lima すべてで報告されている既知の制約で、
実害は **ホットリロード（HMR）が動かないこと**。

- [podman#22343](https://github.com/containers/podman/issues/22343): 「ホストがファイルを変更・削除しても
  guest は inotify を受け取れず、コンテナ内の file watch が効かない。実害はコードのホットリロードが
  正しく動かないこと」。colima / lima でも同様と明記されている
- [crc-org/vfkit#126](https://github.com/crc-org/vfkit/issues/126): virtiofs 共有ディレクトリで
  ホスト側変更時に inotify が飛ばない
- [lima#615](https://github.com/lima-vm/lima/issues/615) / [lima#1913](https://github.com/lima-vm/lima/pull/1913):
  Lima は `mountInotify` で部分対応を試みているが、**ファイル削除は扱えない**
- FUSE / virtiofs 自体の inotify 対応は [LWN: Inotify support in FUSE and virtiofs](https://lwn.net/Articles/874000/)
  の段階の話であり、完全対応を前提にできない

→ **本リポジトリは監視プロセスが 4 つある**（Next.js 3000 / Vite 1420 / Metro 8081 / Storybook 6006）ため、
ここが壊れると開発体験が成立しない。**macOS では「mac 側にファイルを置いて箱から見る」構成を既定にしない。**

### 併せて確認した Colima のマウント制約

- Colima が VM に見せるのは既定で **`/Users/$USER` だけ**。その外のパスを bind mount しても
  **エラーにならず空になる**（[Colima troubleshooting](https://deepwiki.com/abiosoft/colima/9-troubleshooting)）
- macOS 13+ では `--vm-type vz --mount-type virtiofs` が使える

### virtiofs 上の idmapped mount（`shift=true`）

FUSE / virtiofs の idmapped mount 対応は **比較的新しいカーネル機能**で、
filesystem daemon が `FUSE_ALLOW_IDMAP` 等で能力をネゴシエートし、`default_permissions` で
マウントされている等の条件が要る（[LWN: fuse: basic support for idmapped mounts](https://lwn.net/Articles/985803/)）。
**Colima が使う構成で `shift=true` が通るかは実機で確認するまで前提にしない。**

---

## 5. ポートの到達手段（proxy device）

```
incus config device add <instance> <device> proxy \
  listen=tcp:<host_addr>:<port> connect=tcp:<container_addr>:<port> bind=host nat=true
```

- `nat=true` は別コネクションで中継せず NAT で最適化する
- コンテナ側は静的 IP か、ワイルドカード（`0.0.0.0` / `[::]`）で DHCP 由来の IP を拾わせる

（[Proxy device リファレンス](https://linuxcontainers.org/incus/docs/main/reference/devices_proxy/)）

macOS + Colima `--network-address` ならコンテナ IP に直接届くため、proxy device は不要になる可能性が高い。

---

## 6. Incus 6.3+ は OCI イメージを直接実行できる（が、今回は使わない）

`incus remote add docker https://docker.io --protocol=oci` を登録すると `incus launch docker:<image>` で
Docker イメージを Incus のインスタンスとして直接動かせる（Incus 6.3 以降。
[Incus 6.3 リリース記事](https://linuxcontainers.org/incus/news/2024_07_12_05_07.html)）。

→ **本件では採用しない。** Supabase のローカルスタックは `supabase` CLI が docker compose 相当を直接叩いて
コンテナ群を管理するため、個々のイメージを Incus 側で起動しても CLI の管理下に入らない。
**内側に Docker を入れる（nested）のが正しい。**

---

## 7. NixOS イメージも存在する

`images:nixos/unstable` などが images.linuxcontainers.org にあり、コンテナ / VM の両方で起動できる
（[NixOS Wiki: Incus](https://wiki.nixos.org/wiki/Incus)）。

ただし本リポジトリの開発環境は **devenv（= Nix の上のレイヤ）が完結して面倒を見る**設計なので、
ベース OS を NixOS にする必然性はない。むしろ NixOS を選ぶと「NixOS の構成管理」と「devenv.nix」の
二重管理になる。ベースは Debian 等の普通のディストリで、その上に Nix を入れるほうが本リポジトリの前提に合う。

---

## 8. 本リポジトリ側の前提（コンテナ内で満たすべきもの）

| 項目 | 値・根拠 |
|---|---|
| Nix + devenv + direnv | `.envrc` は `eval "$(devenv direnvrc)"` / `use devenv` |
| Docker | Supabase ローカルスタック（`supabase-start`）。`devenv.nix` は Supabase を devenv の管理外としており、`supabase:start` task が CLI を叩く |
| ポート | web 3000 / desktop 1420 / mobile Metro 8081 / backend 4040 / Storybook 6006（`--host 0.0.0.0` 済み）/ Supabase 54321-54324 |
| DB 接続 | `env/*/.env.local` が `127.0.0.1:54322` を指す（= Supabase と同じインスタンス内に居れば変更不要） |
| シークレット | Doppler。`devenv shell` 進入時に注入される |
| macOS 依存 | iOS ビルド（`build-mobile-ios` / `mobile-release-ios --local`）は Xcode 必須で **Linux コンテナでは不可** |
| Android | `-P android` profile（JDK 17 + SDK + NDK、数 GB）。Linux コンテナ内でビルド自体は可能だが、実機 USB / エミュレータは別途検討が要る |

---

## 出典

- [Incus: How to install Incus](https://linuxcontainers.org/incus/docs/main/installing/)（server は Linux のみ）
- [Incus: FAQ](https://linuxcontainers.org/incus/docs/main/faq/)（nesting / kernel module / idmap の overflow uid）
- [Incus: Idmaps for user namespace](https://linuxcontainers.org/incus/docs/main/userns-idmap/)（`raw.idmap` 書式）
- [Incus: Type proxy](https://linuxcontainers.org/incus/docs/main/reference/devices_proxy/)
- [Incus 6.3 release notes](https://linuxcontainers.org/incus/news/2024_07_12_05_07.html)（OCI 対応）
- [Colima: Runtimes](https://colima.run/docs/runtimes/) / [Colima README](https://github.com/abiosoft/colima)（`--runtime incus`、`--network-address`、VM は m3+）
- [NixOS Wiki: Incus](https://wiki.nixos.org/wiki/Incus)（nix には nesting が要る）
- [Incus forum: Docker on zfs storage](https://discuss.linuxcontainers.org/t/it-appears-docker-now-works-fine-on-incus-containers-with-zfs-storage/23332)（ZFS 2.2 + `zfs.delegate`）
- [Homebrew: incus](https://formulae.brew.sh/formula/incus)
