#!/usr/bin/env bash
# Incus 開発コンテナのライフサイクル管理。
#
#   ./scripts/incus/incus.sh up        # 起動（無ければ作る）。ここまでで開発環境が立ち上がる
#   ./scripts/incus/incus.sh shell     # コンテナ内のシェルに入る（direnv 経由で devenv が有効）
#   ./scripts/incus/incus.sh status    # 状態 / IP / URL を表示
#   ./scripts/incus/incus.sh exec ...  # コンテナ内で任意コマンドを実行
#   ./scripts/incus/incus.sh stop      # 停止（中身は残る）
#   ./scripts/incus/incus.sh destroy   # 破棄（作業ツリーはホスト側にあるので失われない）
#   ./scripts/incus/incus.sh doctor    # 前提条件の診断だけ行う
#
# 設計上の前提（docs/designs/incus-devenv-isolation.md）:
#   - **リポジトリはホストに clone されている**。このスクリプトはその clone の中から実行され、
#     作業ツリーそのものをコンテナへ bind mount する（ソースの正本は常にホスト側）。
#   - **環境を作るのは devenv**。このスクリプトは Incus のインスタンスを用意するだけで、
#     Node / Python / Bun / Supabase CLI 等は devenv.nix が持つ。
#   - macOS で VM が要るのは **incusd（Incus サーバ）が Linux 専用だから**であって、
#     Docker のためではない（Docker は Incus コンテナの中に入る）。
#
# ドライバ（Incus サーバをどこで動かすか）は自動判定する:
#   native … ホストが Linux で incusd が動いている
#   orb    … macOS + OrbStack の Linux machine の中で incusd を動かす
#   colima … macOS + colima --runtime incus
#
# scripts/infra/lib.sh は source しない（あちらは devenv shell 内で動く前提のため）。
# このスクリプトは素の macOS / Linux のシェルで動く必要がある。
set -euo pipefail

# ── ログ ─────────────────────────────────────────────────────────────────────
log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── 設定（環境変数で上書き可） ───────────────────────────────────────────────
INCUS_INSTANCE="${INCUS_INSTANCE:-$(basename "$REPO_ROOT" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-' '-' | sed 's/-*$//')}"
INCUS_IMAGE="${INCUS_IMAGE:-images:debian/13/cloud}"
INCUS_CPU="${INCUS_CPU:-8}"
INCUS_MEMORY="${INCUS_MEMORY:-16GiB}"
APP_PATH="/home/dev/app"

# ドライバ。空なら自動判定。native | orb | colima
INCUS_DRIVER="${INCUS_DRIVER:-}"

# OrbStack: incusd を載せる Linux machine の名前
ORB_MACHINE="${ORB_MACHINE:-incus}"
ORB_DISTRO="${ORB_DISTRO:-ubuntu}"

# colima の VM 設定
COLIMA_PROFILE="${COLIMA_PROFILE:-incus}"
COLIMA_CPU="${COLIMA_CPU:-8}"
COLIMA_MEMORY="${COLIMA_MEMORY:-16}"
COLIMA_DISK="${COLIMA_DISK:-100}"

# ホスト側の作業ツリーと**共有しない**パス（コンテナ内のローカル FS へ逃がす）。
#   1. 速度 — 共有ファイルシステム越しの node_modules / .venv は致命的に遅い
#   2. 正しさ — darwin 版と linux 版のネイティブバイナリが混ざるのを防ぐ
# いずれも .gitignore 済みで再生成可能なパスに限定している。
INCUS_LOCAL_PATHS="${INCUS_LOCAL_PATHS:-frontend/node_modules drizzle/node_modules backend-py/.venv .devenv .direnv}"

# devenv が公開するポート
PORTS="3000 1420 8081 4040 6006 54321 54323 54324"

is_macos() { [ "$(uname -s)" = "Darwin" ]; }

# ── ドライバ抽象化 ───────────────────────────────────────────────────────────
# incus クライアントをどこで実行するか。OrbStack では machine の中で実行する。
INCUS() {
  case "$INCUS_DRIVER" in
    orb) orb -m "$ORB_MACHINE" -u root incus "$@" ;;
    *)   incus "$@" ;;
  esac
}

# incusd から見えるリポジトリのパス（ドライバごとに異なる）。
server_repo_path() {
  case "$INCUS_DRIVER" in
    # OrbStack は macOS のホームを machine 内の /mnt/mac にマウントする
    orb)
      case "$REPO_ROOT" in
        "$HOME"/*) printf '/mnt/mac%s' "${REPO_ROOT#"$HOME"}" ;;
        *) die "リポジトリ ($REPO_ROOT) が macOS のホーム配下にありません。OrbStack が machine へ見せるのは ~ 配下（machine 内の /mnt/mac）だけです。" ;;
      esac
      ;;
    # colima は /Users/$USER をそのままのパスで VM に見せる
    *) printf '%s' "$REPO_ROOT" ;;
  esac
}

detect_driver() {
  [ -n "$INCUS_DRIVER" ] && return 0

  # 1. ホスト（または既に設定済みのリモート）で incus が使えるならそれを使う
  if have incus && incus info >/dev/null 2>&1; then
    INCUS_DRIVER="native"; return 0
  fi
  if ! is_macos; then
    INCUS_DRIVER="native"; return 0
  fi
  # 2. macOS: OrbStack があればそれを使う（既に入っている VM を再利用できる）
  if have orb; then
    INCUS_DRIVER="orb"; return 0
  fi
  # 3. なければ colima
  if have colima; then
    INCUS_DRIVER="colima"; return 0
  fi
  die "Incus サーバを載せる先がありません。macOS では 'brew install orbstack' か 'brew install colima' のどちらかが要ります（incusd は Linux 専用のため）。"
}

# ── サーバの用意 ─────────────────────────────────────────────────────────────
ensure_server_native() {
  have incus || die "incus クライアントが見つかりません。"
  incus info >/dev/null 2>&1 || die "Incus サーバに到達できません。'incus admin init' が済んでいるか、incusd が動いているか確認してください。"
}

ensure_server_orb() {
  have orb || die "orb コマンドが見つかりません（OrbStack を起動してください）。"

  if ! orb list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx "$ORB_MACHINE"; then
    log "OrbStack の Linux machine を作成します: $ORB_MACHINE ($ORB_DISTRO)"
    orb create "$ORB_DISTRO" "$ORB_MACHINE"
  fi

  if ! orb -m "$ORB_MACHINE" -u root incus info >/dev/null 2>&1; then
    log "machine '$ORB_MACHINE' に incus を導入します（初回のみ）"
    orb -m "$ORB_MACHINE" -u root bash -lc '
      set -e
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -qq
      apt-get install -y -qq incus incus-client
      systemctl enable --now incus || true
      incus admin init --minimal
    '
  fi
  orb -m "$ORB_MACHINE" -u root incus info >/dev/null 2>&1 \
    || die "machine '$ORB_MACHINE' の中で incusd に到達できません。'orb -m $ORB_MACHINE -u root systemctl status incus' を確認してください。"
  ok "Incus サーバ: OrbStack machine '$ORB_MACHINE'"
}

ensure_server_colima() {
  have incus || die "incus クライアントが見つかりません（brew install incus）。"
  if incus info >/dev/null 2>&1; then
    ok "Incus サーバに接続済み"
    return 0
  fi
  have colima || die "colima が見つかりません（brew install colima）。"
  log "colima を起動します（profile=$COLIMA_PROFILE）"
  colima start --profile "$COLIMA_PROFILE" \
    --runtime incus --network-address \
    --cpu "$COLIMA_CPU" --memory "$COLIMA_MEMORY" --disk "$COLIMA_DISK"
  incus info >/dev/null 2>&1 || die "colima は起動しましたが incus サーバに到達できません。"
  ok "Incus サーバ: colima ($COLIMA_PROFILE)"
}

ensure_server() {
  detect_driver
  case "$INCUS_DRIVER" in
    native) ensure_server_native ;;
    orb)    ensure_server_orb ;;
    colima) ensure_server_colima ;;
    *) die "不明なドライバ: $INCUS_DRIVER" ;;
  esac
}

# リポジトリが incusd 側から見えるか。見えないまま mount すると
# **エラーにならず空ディレクトリがマウントされる**ので、ここで先に落とす。
ensure_repo_visible() {
  local path; path="$(server_repo_path)"
  case "$INCUS_DRIVER" in
    native) return 0 ;;
    orb)
      orb -m "$ORB_MACHINE" -u root test -e "$path/devenv.nix" \
        || die "リポジトリが machine から見えません: $path"
      ;;
    colima)
      colima ssh --profile "$COLIMA_PROFILE" -- test -e "$path/devenv.nix" >/dev/null 2>&1 \
        || die "リポジトリ ($path) が colima の VM から見えません。colima は既定で /Users/\$USER の下だけを共有します。"
      ;;
  esac
  ok "リポジトリが Incus サーバ側から見えています: $path"
}

instance_exists()  { INCUS info "$INCUS_INSTANCE" >/dev/null 2>&1; }
instance_running() { [ "$(INCUS list "$INCUS_INSTANCE" -f csv -c s 2>/dev/null || true)" = "RUNNING" ]; }
instance_ip()      { INCUS list "$INCUS_INSTANCE" -f csv -c 4 2>/dev/null | head -1 | awk '{print $1}'; }

# ── 作成 ─────────────────────────────────────────────────────────────────────
create_instance() {
  log "インスタンスを作成します: $INCUS_INSTANCE ($INCUS_IMAGE)"
  # security.nesting は Nix の build sandbox と Docker の**両方**が要求する。
  INCUS launch "$INCUS_IMAGE" "$INCUS_INSTANCE" \
    -c security.nesting=true \
    -c security.syscalls.intercept.mknod=true \
    -c security.syscalls.intercept.setxattr=true \
    -c limits.cpu="$INCUS_CPU" \
    -c limits.memory="$INCUS_MEMORY" \
    -c cloud-init.user-data="$(cat "$SCRIPT_DIR/cloud-init.yaml")" \
    -c user.devenv-repo="$REPO_ROOT"

  log "cloud-init の完了を待ちます（初回は Nix と devenv の取得で数分かかります）"
  INCUS exec "$INCUS_INSTANCE" -- cloud-init status --wait >/dev/null 2>&1 || true
  INCUS exec "$INCUS_INSTANCE" -- test -f /var/lib/devenv-container-provisioned \
    || die "プロビジョニングが完了していません。'$0 exec-raw cloud-init status --long' で原因を確認してください。"
  ok "プロビジョニング完了"
}

# ── 作業ツリーの bind mount ─────────────────────────────────────────────────
attach_workspace() {
  INCUS config device get "$INCUS_INSTANCE" app source >/dev/null 2>&1 && return 0

  local src; src="$(server_repo_path)"
  log "ホストの作業ツリーを $APP_PATH へマウントします ($src)"
  # shift=true は idmapped mount。未対応のバックエンドでは失敗するので raw.idmap に退避。
  if ! INCUS config device add "$INCUS_INSTANCE" app disk \
        source="$src" path="$APP_PATH" shift=true >/dev/null 2>&1; then
    warn "shift=true が使えないため raw.idmap にフォールバックします（再起動が要ります）"
    INCUS config device add "$INCUS_INSTANCE" app disk source="$src" path="$APP_PATH"
    INCUS config set "$INCUS_INSTANCE" raw.idmap "both $(id -u) 1000"
    INCUS restart "$INCUS_INSTANCE"
  fi
  ok "マウント: $src → $APP_PATH"
}

attach_local_volumes() {
  local pool
  pool="$(INCUS profile device get default root pool 2>/dev/null || echo default)"

  for rel in $INCUS_LOCAL_PATHS; do
    local dev_name vol_name
    dev_name="local-$(printf '%s' "$rel" | tr -c 'a-zA-Z0-9' '-' | sed 's/-*$//')"
    vol_name="${INCUS_INSTANCE}-${dev_name}"

    INCUS config device get "$INCUS_INSTANCE" "$dev_name" source >/dev/null 2>&1 && continue

    INCUS storage volume show "$pool" "$vol_name" >/dev/null 2>&1 \
      || INCUS storage volume create "$pool" "$vol_name" >/dev/null

    INCUS exec "$INCUS_INSTANCE" -- mkdir -p "$APP_PATH/$rel" >/dev/null 2>&1 || true
    INCUS config device add "$INCUS_INSTANCE" "$dev_name" disk \
      pool="$pool" source="$vol_name" path="$APP_PATH/$rel" >/dev/null
    INCUS exec "$INCUS_INSTANCE" -- chown dev:dev "$APP_PATH/$rel"
    ok "コンテナ側ローカル FS: $rel"
  done
}

# ── direnv の信頼（初回の 'direnv allow' を代行） ────────────────────────────
trust_direnv() {
  INCUS exec "$INCUS_INSTANCE" -- sudo -u dev --login bash -lc \
    "cd $APP_PATH && direnv allow" >/dev/null 2>&1 \
    && ok "direnv allow 済み" \
    || warn "direnv allow に失敗しました。箱に入って手動で実行してください。"
}

# ── シークレット（値は表示しない。キー名のみ扱う） ───────────────────────────
inject_doppler_token() {
  [ -n "${DOPPLER_TOKEN:-}" ] || return 0
  log "DOPPLER_TOKEN をコンテナへ引き渡します（値は表示しません）"
  printf 'export DOPPLER_TOKEN=%q\n' "$DOPPLER_TOKEN" \
    | INCUS file push - "$INCUS_INSTANCE/home/dev/.bashrc.d/doppler.sh" --uid 1000 --gid 1000 --mode 600
  ok "DOPPLER_TOKEN を設定しました"
}

# ── ポート公開 ───────────────────────────────────────────────────────────────
# colima: --network-address でコンテナ IP に直接届くので既定では不要。
# orb   : 「Incus コンテナ → proxy device → machine → OrbStack の自動転送 → mac の localhost」
#         と 2 段になるため、mac から見るには proxy device が要る。
publish_ports() {
  for port in $PORTS; do
    local dev_name="pub-$port"
    INCUS config device get "$INCUS_INSTANCE" "$dev_name" listen >/dev/null 2>&1 && continue
    INCUS config device add "$INCUS_INSTANCE" "$dev_name" proxy \
      listen="tcp:0.0.0.0:$port" connect="tcp:127.0.0.1:$port" bind=host nat=true >/dev/null
    ok "公開: $port"
  done
}

# ── サブコマンド ─────────────────────────────────────────────────────────────
cmd_up() {
  local publish=""
  for arg in "$@"; do
    case "$arg" in
      --publish)    publish=1 ;;
      --no-publish) publish=0 ;;
      *) die "不明なオプション: $arg" ;;
    esac
  done

  ensure_server
  ensure_repo_visible

  # OrbStack は IP 直結ができないので既定で公開する。
  [ -z "$publish" ] && { [ "$INCUS_DRIVER" = "orb" ] && publish=1 || publish=0; }

  if ! instance_exists; then
    create_instance
  elif ! instance_running; then
    log "インスタンスを起動します: $INCUS_INSTANCE"
    INCUS start "$INCUS_INSTANCE"
  fi

  attach_workspace
  attach_local_volumes
  inject_doppler_token
  trust_direnv
  [ "$publish" = "1" ] && publish_ports

  cmd_status
  cat <<EOS

次の一手:
  ./scripts/incus/incus.sh shell     # 箱に入る（cd するだけで direnv が devenv を有効化）
  # 箱の中で:
  #   supabase-start    … Supabase (Docker)
  #   devenv up         … backend + Storybook
EOS
}

cmd_shell() {
  ensure_server
  instance_exists || die "インスタンス '$INCUS_INSTANCE' がありません。先に './scripts/incus/incus.sh up' を実行してください。"
  instance_running || INCUS start "$INCUS_INSTANCE"
  case "$INCUS_DRIVER" in
    orb) exec orb -m "$ORB_MACHINE" -u root incus exec "$INCUS_INSTANCE" -- sudo -u dev --login ;;
    *)   exec incus exec "$INCUS_INSTANCE" -- sudo -u dev --login ;;
  esac
}

cmd_exec() {
  ensure_server
  instance_running || die "インスタンス '$INCUS_INSTANCE' が起動していません。"
  INCUS exec "$INCUS_INSTANCE" -- sudo -u dev --login bash -lc "cd $APP_PATH && $*"
}

cmd_status() {
  ensure_server
  if ! instance_exists; then
    warn "インスタンス '$INCUS_INSTANCE' はまだありません"
    return 0
  fi
  printf '\nドライバ: %s\n' "$INCUS_DRIVER"
  INCUS list "$INCUS_INSTANCE"

  local host ip
  ip="$(instance_ip)"
  case "$INCUS_DRIVER" in
    orb)    host="localhost" ;;   # proxy device → OrbStack の自動転送
    *)      host="${ip:-localhost}" ;;
  esac
  cat <<EOS
アクセス先:
  web          http://$host:3000
  storybook    http://$host:6006
  backend      http://$host:4040/healthcheck
  metro        http://$host:8081
  supabase api http://$host:54321
  supabase st. http://$host:54323
EOS
}

cmd_stop() {
  ensure_server
  instance_exists || return 0
  INCUS stop "$INCUS_INSTANCE"
  ok "停止しました: $INCUS_INSTANCE"
}

cmd_destroy() {
  ensure_server
  instance_exists || { warn "インスタンス '$INCUS_INSTANCE' はありません"; return 0; }
  printf '本当に破棄しますか？ 作業ツリー (%s) はホスト側にあるので失われません [y/N]: ' "$REPO_ROOT"
  read -r answer
  case "$answer" in y|Y) ;; *) die "中止しました" ;; esac
  INCUS delete --force "$INCUS_INSTANCE"
  ok "破棄しました: $INCUS_INSTANCE"
}

cmd_doctor() {
  ensure_server
  ok "ドライバ: $INCUS_DRIVER"
  ensure_repo_visible
  ok "前提条件を満たしています（インスタンス名: $INCUS_INSTANCE）"
}

usage() { sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

main() {
  local cmd="${1:-up}"; shift || true
  case "$cmd" in
    up)      cmd_up "$@" ;;
    shell)   cmd_shell ;;
    exec)    cmd_exec "$@" ;;
    status)  cmd_status ;;
    stop)    cmd_stop ;;
    destroy) cmd_destroy ;;
    doctor)  cmd_doctor ;;
    -h|--help|help) usage ;;
    *) usage; die "不明なサブコマンド: $cmd" ;;
  esac
}

main "$@"
