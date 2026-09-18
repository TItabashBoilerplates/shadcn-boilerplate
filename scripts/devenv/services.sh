#!/usr/bin/env bash
# devenv のプロセス（backend / storybook）を、devenv 2.2.2 のバグを踏んでも確実に止める。
#
#   services.sh stop     # devenv のプロセス + Supabase を停止（止め切れなければ非ゼロで落ちる）
#   services.sh reap     # 到達不能になったデーモンだけ止める（dev-* の起動前に呼ぶ）
#   services.sh status   # 何が動いているかを表示するだけ（何も止めない）
#
# なぜ専用 script が必要か:
#   devenv 2.2.2 の `devenv tasks run` は終了時に、**稼働中のデーモンのものであっても**
#   <runtime>/processes/native-manager.pid と native.sock を削除する。
#   ci-check / supabase-start / app:migrate-dev のように中で `devenv tasks run` を使う
#   コマンドを 1 回実行するだけで、動いているデーモンが devenv から見えなくなる。
#   その状態の `devenv processes down` は "No process manager is running" で終了し、
#   **親を失ったデーモンと子（uvicorn / storybook）は生き残る**。次の `devenv up -d` は
#   それを見つけられずに別のデーモンを立てるので、storybook が何個も増えていく。
#   → ファイルが消えていても、プロセスそのものを見つけて止める必要がある。
#
#   上流は devenv 2.3.0 で修正済み。ただし 2.3.x には別の不具合
#   （#3184: シェルに入るたびに git-hooks が全ファイルに走る）があり、今は上げられない。
#   **2.3 以降へ上げたらこの script の掃除部分は不要になる**（stop の入口としては残してよい）。
#
# 触る範囲:
#   このプロジェクトの runtime ディレクトリ（.devenv/run のリンク先）を cmdline に含む
#   デーモンだけ。別プロジェクト / 別 runtime のデーモンは status で報告するだけで触らない。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${DEVENV_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

TERM_WAIT_SECONDS="${DEVENV_STOP_WAIT_SECONDS:-10}"

# .devenv/run はこのプロジェクトの runtime（/tmp/devenv-<hash>）への symlink。
runtime_dir() {
  local link="$REPO_ROOT/.devenv/run"
  if [ -L "$link" ]; then
    readlink "$link"
  else
    printf '%s' "${DEVENV_RUNTIME:-}"
  fi
}

# devenv がデーモンを見つけるための 2 ファイル。両方揃っていないと `processes down` は届かない。
manager_files_present() {
  local runtime="$1"
  [ -n "$runtime" ] || return 1
  [ -e "$runtime/processes/native-manager.pid" ] && [ -S "$runtime/processes/native.sock" ]
}

# デーモンの実体は `... daemon-processes <runtime>/processes/daemon-config.json`。
# ⚠️ 自分自身と祖先は必ず除外する。`pgrep -f` はパターン文字列を含むだけの
#    「この script を起動したシェル」にも当たるので、除外しないと自分を kill する。
self_and_ancestors() {
  local pid=$$ guard=0
  while [ -n "$pid" ] && [ "$pid" -gt 1 ] && [ "$guard" -lt 32 ]; do
    printf '%s\n' "$pid"
    pid="$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ' || true)"
    guard=$((guard + 1))
  done
}

daemon_pids() {
  local excluded; excluded=" $(self_and_ancestors | tr '\n' ' ')"
  local pid cmd
  for pid in $(pgrep -f 'daemon-processes' 2>/dev/null || true); do
    case "$excluded" in *" $pid "*) continue ;; esac
    cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
    case "$cmd" in
      *daemon-processes*daemon-config.json*) printf '%s\t%s\n' "$pid" "$cmd" ;;
    esac
  done
}

# このプロジェクトの runtime を見ているデーモンの PID（1 行 1 件）。
project_daemon_pids() {
  local runtime="$1" line
  [ -n "$runtime" ] || return 0
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    case "${line#*	}" in
      *"$runtime"*) printf '%s\n' "${line%%	*}" ;;
    esac
  done < <(daemon_pids)
}

# 別 runtime のデーモン（他プロジェクト / 古い devenv の置き土産かもしれない）。報告だけする。
foreign_daemon_pids() {
  local runtime="$1" line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    case "${line#*	}" in
      *"$runtime"*) ;;
      *) printf '%s\n' "${line%%	*}" ;;
    esac
  done < <(daemon_pids)
}

describe_pid() {
  local pid="$1"
  printf '    PID %s  %s\n' "$pid" "$(ps -p "$pid" -o lstart= 2>/dev/null | tr -s ' ' || echo '?')"
}

# SIGTERM → 待つ → 残っていれば SIGKILL。止め切れなかった PID を stdout に返す。
stop_pids() {
  local pids=("$@") pid waited=0 alive=()
  [ "${#pids[@]}" -gt 0 ] || return 0

  for pid in "${pids[@]}"; do kill -TERM "$pid" 2>/dev/null || true; done

  while [ "$waited" -lt "$TERM_WAIT_SECONDS" ]; do
    alive=()
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then alive+=("$pid"); fi
    done
    [ "${#alive[@]}" -gt 0 ] || return 0
    sleep 1
    waited=$((waited + 1))
  done

  for pid in "${alive[@]}"; do kill -KILL "$pid" 2>/dev/null || true; done
  sleep 1
  for pid in "${alive[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then printf '%s\n' "$pid"; fi
  done
}

cmd_status() {
  local runtime; runtime="$(runtime_dir)"
  log "runtime: ${runtime:-（未作成）}"

  if manager_files_present "$runtime"; then
    ok "devenv からデーモンが見えています（native-manager.pid / native.sock あり）"
  else
    warn "デーモンを指すファイルがありません（devenv からは「起動していない」ように見えます）"
  fi

  local mine; mine="$(project_daemon_pids "$runtime")"
  if [ -n "$mine" ]; then
    log "このプロジェクトのデーモン:"
    local pid; for pid in $mine; do describe_pid "$pid"; done
    manager_files_present "$runtime" \
      || warn "↑ は devenv から到達できません（'stop' か 'reap' で止まります）"
  else
    ok "このプロジェクトのデーモンは動いていません"
  fi

  local others; others="$(foreign_daemon_pids "$runtime")"
  if [ -n "$others" ]; then
    warn "別 runtime のデーモンもあります（別プロジェクトの可能性があるので触りません）:"
    local pid; for pid in $others; do describe_pid "$pid" >&2; done
  fi
}

# 到達不能なデーモンだけ止める。健全に動いているものには触らない。
cmd_reap() {
  local runtime; runtime="$(runtime_dir)"
  local pids; pids="$(project_daemon_pids "$runtime")"
  [ -n "$pids" ] || return 0

  if manager_files_present "$runtime"; then
    return 0   # devenv から管理できている＝正常
  fi

  warn "devenv から見えなくなったデーモンが残っています（devenv 2.2.2 の既知バグ）。先に止めます:"
  local pid; for pid in $pids; do describe_pid "$pid" >&2; done

  # shellcheck disable=SC2086  # PID 一覧なので分割させる
  local remaining; remaining="$(stop_pids $pids)"
  if [ -n "$remaining" ]; then
    die "止められなかったデーモンがあります: ${remaining}。手動で kill -9 してください"
  fi
  ok "迷子のデーモンを停止しました（このあと起動し直します）"
}

stop_devenv_processes() {
  local runtime; runtime="$(runtime_dir)"

  log "devenv のプロセスを停止します..."
  if manager_files_present "$runtime"; then
    devenv processes down || warn "devenv processes down が失敗しました。プロセスを直接止めます。"
  else
    warn "デーモンを指すファイルがありません（devenv tasks run が消した可能性）。プロセスを直接探します。"
  fi

  local pids; pids="$(project_daemon_pids "$runtime")"
  if [ -z "$pids" ]; then
    ok "devenv のプロセスは残っていません"
    return 0
  fi

  log "残っているデーモンを停止します:"
  local pid; for pid in $pids; do describe_pid "$pid"; done
  # shellcheck disable=SC2086  # PID 一覧なので分割させる
  local remaining; remaining="$(stop_pids $pids)"
  if [ -n "$remaining" ]; then
    warn "止められなかったデーモン: ${remaining}"
    return 1
  fi
  ok "devenv のプロセスを停止しました"
}

stop_supabase() {
  log "Supabase (Docker) を停止します..."
  if ! command -v supabase >/dev/null 2>&1; then
    warn "supabase CLI がありません（devenv shell 内で実行してください）。Supabase は停止していません。"
    return 1
  fi
  if supabase stop; then
    ok "Supabase を停止しました"
    return 0
  fi
  # 元から起動していない場合も `supabase stop` は失敗しうる。コンテナの有無で切り分ける。
  if ! command -v docker >/dev/null 2>&1 || [ -z "$(docker ps -q --filter 'name=supabase' 2>/dev/null)" ]; then
    ok "Supabase は起動していませんでした"
    return 0
  fi
  warn "Supabase を停止できませんでした（'supabase stop' の出力を確認してください）"
  return 1
}

cmd_stop() {
  local failed=0
  stop_devenv_processes || failed=1
  stop_supabase || failed=1

  if [ "$failed" -ne 0 ]; then
    # ここで成功を名乗ると、生き残ったプロセスがポートを掴んだまま次の起動を壊す。
    die "停止し切れていません。'services.sh status' で残りを確認してください。"
  fi
  ok "All services stopped."
}

case "${1:-}" in
  stop)   cmd_stop ;;
  reap)   cmd_reap ;;
  status) cmd_status ;;
  ""|-h|--help)
    awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}" ;;
  *) die "不明なサブコマンド: ${1}（stop | reap | status）" ;;
esac
