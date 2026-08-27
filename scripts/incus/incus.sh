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
#   - ホストに必要なのは incus クライアントのみ（macOS は colima も）。
#     **Nix / devenv / Docker をホストに入れない**のがこの仕組みの目的。
#   - コンテナ側は cloud-init.yaml が Docker + Nix + devenv + direnv までを用意し、
#     そこから先の開発ツールは devenv.nix が持つ。
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
# インスタンス名。既定はリポジトリのディレクトリ名。
# 同じリポジトリを複数の箱で並列に動かしたいときは INCUS_INSTANCE で分ける。
INCUS_INSTANCE="${INCUS_INSTANCE:-$(basename "$REPO_ROOT" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-' '-' | sed 's/-*$//')}"
INCUS_IMAGE="${INCUS_IMAGE:-images:debian/13/cloud}"
INCUS_CPU="${INCUS_CPU:-8}"
INCUS_MEMORY="${INCUS_MEMORY:-16GiB}"
APP_PATH="/home/dev/app"

# colima の VM 設定（macOS で自動起動するとき用）
COLIMA_PROFILE="${COLIMA_PROFILE:-incus}"
COLIMA_CPU="${COLIMA_CPU:-8}"
COLIMA_MEMORY="${COLIMA_MEMORY:-16}"
COLIMA_DISK="${COLIMA_DISK:-100}"

# ホスト側の作業ツリーと**共有しない**パス（コンテナ内のローカル FS に逃がす）。
# 理由は 2 つ:
#   1. 速度 — virtiofs 越しの node_modules / .venv は致命的に遅い
#   2. 正しさ — プラットフォーム依存バイナリ（darwin 版と linux 版）が混ざるのを防ぐ
# いずれも .gitignore 済みで再生成可能なパスに限定している。
INCUS_LOCAL_PATHS_DEFAULT="frontend/node_modules drizzle/node_modules backend-py/.venv .devenv .direnv"
INCUS_LOCAL_PATHS="${INCUS_LOCAL_PATHS:-$INCUS_LOCAL_PATHS_DEFAULT}"

# devenv が公開するポート（status の表示と --publish の対象）
PORTS="3000 1420 8081 4040 6006 54321 54323 54324"

# ── 前提条件 ─────────────────────────────────────────────────────────────────
is_macos() { [ "$(uname -s)" = "Darwin" ]; }

ensure_client() {
  have incus || die "incus クライアントが見つかりません。macOS は 'brew install incus'、Linux は各ディストリの手順で入れてください。"
}

# Incus サーバに到達できるか。macOS では colima の VM がサーバを持つ。
ensure_server() {
  if incus info >/dev/null 2>&1; then
    return 0
  fi

  if ! is_macos; then
    die "Incus サーバに到達できません。'incus admin init' が済んでいるか、incusd が動いているか確認してください。"
  fi

  # Incus サーバは Linux 専用なので、macOS では Linux VM が 1 枚要る。
  have colima || die "Incus サーバに到達できません。macOS では VM が要ります: 'brew install colima' の後に再実行してください。"

  log "Incus サーバが見つからないので colima を起動します（profile=$COLIMA_PROFILE）"
  colima start --profile "$COLIMA_PROFILE" \
    --runtime incus \
    --network-address \
    --cpu "$COLIMA_CPU" --memory "$COLIMA_MEMORY" --disk "$COLIMA_DISK"

  incus info >/dev/null 2>&1 || die "colima は起動しましたが incus サーバに到達できません。'colima status --profile $COLIMA_PROFILE' を確認してください。"
  ok "Incus サーバに接続しました"
}

# リポジトリのパスが Incus サーバ側（macOS なら VM の中）から見えるか。
# colima は既定で /Users/$USER しか VM に見せないため、その外にあると
# **エラーにならず空ディレクトリがマウントされる**。ここで先に落とす。
ensure_repo_visible_to_server() {
  if ! is_macos; then
    return 0
  fi
  if colima ssh --profile "$COLIMA_PROFILE" -- test -e "$REPO_ROOT/devenv.nix" >/dev/null 2>&1; then
    ok "リポジトリは VM から見えています: $REPO_ROOT"
    return 0
  fi
  die "リポジトリ ($REPO_ROOT) が colima の VM から見えません。
   colima は既定で /Users/\$USER の下だけを VM に共有します。
   リポジトリをホームディレクトリ配下へ移すか、'colima start --mount' で共有範囲を広げてください。
   （ここで止めないと、空のディレクトリがマウントされて原因の分かりにくい失敗になります）"
}

instance_exists() { incus info "$INCUS_INSTANCE" >/dev/null 2>&1; }
instance_running() { [ "$(incus list "$INCUS_INSTANCE" -f csv -c s 2>/dev/null || true)" = "RUNNING" ]; }

# ── 作成 ─────────────────────────────────────────────────────────────────────
create_instance() {
  log "インスタンスを作成します: $INCUS_INSTANCE ($INCUS_IMAGE)"
  # security.nesting は Nix の build sandbox と Docker の**両方**が要求する。
  # mknod / setxattr の intercept は Docker のイメージ展開で要ることがある。
  incus launch "$INCUS_IMAGE" "$INCUS_INSTANCE" \
    -c security.nesting=true \
    -c security.syscalls.intercept.mknod=true \
    -c security.syscalls.intercept.setxattr=true \
    -c limits.cpu="$INCUS_CPU" \
    -c limits.memory="$INCUS_MEMORY" \
    -c cloud-init.user-data="$(cat "$SCRIPT_DIR/cloud-init.yaml")" \
    -c user.devenv-repo="$REPO_ROOT"

  log "cloud-init の完了を待ちます（初回は Nix と devenv の取得で数分かかります）"
  incus exec "$INCUS_INSTANCE" -- cloud-init status --wait >/dev/null 2>&1 || true
  incus exec "$INCUS_INSTANCE" -- test -f /var/lib/devenv-container-provisioned \
    || die "プロビジョニングが完了していません。'incus exec $INCUS_INSTANCE -- cloud-init status --long' で原因を確認してください。"
  ok "プロビジョニング完了"
}

# ── 作業ツリーの bind mount ─────────────────────────────────────────────────
attach_workspace() {
  if incus config device get "$INCUS_INSTANCE" app source >/dev/null 2>&1; then
    return 0
  fi
  log "ホストの作業ツリーを $APP_PATH へマウントします"
  # shift=true は idmapped mount。未対応のバックエンドでは失敗するので raw.idmap に退避する。
  if ! incus config device add "$INCUS_INSTANCE" app disk \
        source="$REPO_ROOT" path="$APP_PATH" shift=true >/dev/null 2>&1; then
    warn "shift=true が使えないため raw.idmap にフォールバックします（コンテナの再起動が要ります）"
    incus config device add "$INCUS_INSTANCE" app disk source="$REPO_ROOT" path="$APP_PATH"
    incus config set "$INCUS_INSTANCE" raw.idmap "both $(id -u) 1000"
    incus restart "$INCUS_INSTANCE"
  fi
  ok "マウント: $REPO_ROOT → $APP_PATH"
}

# node_modules / .venv / .devenv 等をコンテナ側のローカル FS に逃がす。
attach_local_volumes() {
  local pool
  pool="$(incus profile device get default root pool 2>/dev/null || echo default)"

  for rel in $INCUS_LOCAL_PATHS; do
    local dev_name vol_name
    dev_name="local-$(printf '%s' "$rel" | tr -c 'a-zA-Z0-9' '-' | sed 's/-*$//')"
    vol_name="${INCUS_INSTANCE}-${dev_name}"

    if incus config device get "$INCUS_INSTANCE" "$dev_name" source >/dev/null 2>&1; then
      continue
    fi

    incus storage volume show "$pool" "$vol_name" >/dev/null 2>&1 \
      || incus storage volume create "$pool" "$vol_name" >/dev/null

    # マウントポイントを先に作る（bind mount 先が存在しないと失敗しうる）
    incus exec "$INCUS_INSTANCE" -- mkdir -p "$APP_PATH/$rel" >/dev/null 2>&1 || true
    incus config device add "$INCUS_INSTANCE" "$dev_name" disk \
      pool="$pool" source="$vol_name" path="$APP_PATH/$rel" >/dev/null
    incus exec "$INCUS_INSTANCE" -- chown dev:dev "$APP_PATH/$rel"
    ok "コンテナ側ローカル FS: $rel"
  done
}

# ── シークレット（値は表示しない。キー名のみ扱う） ───────────────────────────
inject_doppler_token() {
  local token="${DOPPLER_TOKEN:-}"
  [ -n "$token" ] || return 0
  log "DOPPLER_TOKEN をコンテナへ引き渡します（値は表示しません）"
  printf 'export DOPPLER_TOKEN=%q\n' "$token" \
    | incus file push - "$INCUS_INSTANCE/home/dev/.bashrc.d/doppler.sh" --uid 1000 --gid 1000 --mode 600
  ok "DOPPLER_TOKEN を設定しました"
}

# ── direnv の信頼（初回の 'direnv allow' を代行する） ────────────────────────
# direnv は .envrc を初回だけ手動で信頼する必要がある。ホスト側で allow 済みでも
# コンテナ内の direnv には引き継がれないので、ここで済ませておく。
trust_direnv() {
  incus exec "$INCUS_INSTANCE" -- sudo -u dev --login bash -lc \
    "cd $APP_PATH && direnv allow" >/dev/null 2>&1 \
    && ok "direnv allow 済み" \
    || warn "direnv allow に失敗しました。箱に入って手動で実行してください。"
}

# ── ポート公開（既定は行わない。並列運用時に localhost が衝突するため） ──────
publish_ports() {
  local ip; ip="$(instance_ip)"
  for port in $PORTS; do
    local dev_name="pub-$port"
    incus config device get "$INCUS_INSTANCE" "$dev_name" listen >/dev/null 2>&1 && continue
    incus config device add "$INCUS_INSTANCE" "$dev_name" proxy \
      listen="tcp:127.0.0.1:$port" connect="tcp:127.0.0.1:$port" bind=host nat=true >/dev/null
    ok "127.0.0.1:$port → $INCUS_INSTANCE:$port"
  done
}

instance_ip() {
  incus list "$INCUS_INSTANCE" -f csv -c 4 2>/dev/null | head -1 | awk '{print $1}'
}

# ── サブコマンド ─────────────────────────────────────────────────────────────
cmd_up() {
  local publish=0
  for arg in "$@"; do
    case "$arg" in
      --publish) publish=1 ;;
      *) die "不明なオプション: $arg" ;;
    esac
  done

  ensure_client
  ensure_server
  ensure_repo_visible_to_server

  if ! instance_exists; then
    create_instance
  elif ! instance_running; then
    log "インスタンスを起動します: $INCUS_INSTANCE"
    incus start "$INCUS_INSTANCE"
  fi

  attach_workspace
  attach_local_volumes
  inject_doppler_token
  trust_direnv
  [ "$publish" -eq 1 ] && publish_ports

  cmd_status
  cat <<EOS

次の一手:
  ./scripts/incus/incus.sh shell     # 箱に入る（cd するだけで direnv が devenv を有効化）
  # 箱の中で:
  #   direnv allow      … 初回のみ
  #   supabase-start    … Supabase (Docker)
  #   devenv up         … backend + Storybook
EOS
}

cmd_shell() {
  ensure_client
  instance_exists || die "インスタンス '$INCUS_INSTANCE' がありません。先に './scripts/incus/incus.sh up' を実行してください。"
  instance_running || incus start "$INCUS_INSTANCE"
  exec incus exec "$INCUS_INSTANCE" -- sudo -u dev --login
}

cmd_exec() {
  ensure_client
  instance_running || die "インスタンス '$INCUS_INSTANCE' が起動していません。"
  exec incus exec "$INCUS_INSTANCE" -- sudo -u dev --login bash -lc "cd $APP_PATH && $*"
}

cmd_status() {
  ensure_client
  if ! instance_exists; then
    warn "インスタンス '$INCUS_INSTANCE' はまだありません"
    return 0
  fi
  local ip; ip="$(instance_ip)"
  printf '\n'
  incus list "$INCUS_INSTANCE"
  if [ -n "$ip" ]; then
    cat <<EOS
アクセス先（コンテナ IP 経由。--publish していれば localhost でも届きます）:
  web          http://$ip:3000
  storybook    http://$ip:6006
  backend      http://$ip:4040/healthcheck
  metro        http://$ip:8081
  supabase api http://$ip:54321
  supabase st. http://$ip:54323
EOS
  else
    warn "IP がまだ割り当てられていません（起動直後の可能性があります）"
  fi
}

cmd_stop() {
  ensure_client
  instance_exists || return 0
  incus stop "$INCUS_INSTANCE"
  ok "停止しました: $INCUS_INSTANCE"
}

cmd_destroy() {
  ensure_client
  instance_exists || { warn "インスタンス '$INCUS_INSTANCE' はありません"; return 0; }
  printf '本当に破棄しますか？ 作業ツリー (%s) はホスト側にあるので失われません [y/N]: ' "$REPO_ROOT"
  read -r answer
  case "$answer" in
    y|Y) ;;
    *) die "中止しました" ;;
  esac
  incus delete --force "$INCUS_INSTANCE"
  ok "破棄しました: $INCUS_INSTANCE"
}

cmd_doctor() {
  ensure_client; ok "incus クライアント: $(command -v incus)"
  ensure_server
  ensure_repo_visible_to_server
  ok "前提条件はすべて満たしています（インスタンス名: $INCUS_INSTANCE）"
}

usage() {
  sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

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
