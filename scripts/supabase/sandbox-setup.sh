#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# Supabase local stack setup for the Claude Code on the web sandbox
#
# ▍これは何か
#   Claude Code on the web の "setup script" 欄にそのまま貼り付けて使える
#   単一・自己完結スクリプト（他ファイルを source しない）。リポジトリにも
#   コミットしてあり、`bash scripts/supabase/sandbox-setup.sh` で手動実行も可能。
#
# ▍なぜ必要か
#   この実行コンテナは (1) IPv6 が無く (2) 外向き HTTPS が TLS 傍受プロキシ経由。
#   素の Supabase ローカルイメージだと以下で boot に失敗し `supabase start` が
#   スタックごと落ちる:
#     • realtime     : Phoenix エンドポイント / Erlang 分散が IPv6 バインド
#                      → :eafnosupport (Address family not supported)
#     • edge-runtime : コンテナ egress を傍受する CA を未信頼
#                      → Deno のモジュール取得が UnknownIssuer
#   このスクリプトが同一タグでパッチ済みイメージを用意する。`supabase start` は
#   ローカルに同一タグがあれば pull せずそれを使うため、これだけで挙動を差し替え可能。
#
# ▍ローカル debug への影響: 無し
#   サンドボックス専用の egress CA バンドルが無ければ即 no-op で抜ける。通常の
#   Mac / Linux 開発機では何もしない（IPv6 ありの realtime / edge も素で動く）。
#
# ▍性質: 冪等（パッチ済みイメージは LABEL で検出してスキップ）。安全に再実行可。
# ═════════════════════════════════════════════════════════════════════════════
set -uo pipefail

log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*" >&2; }

# サンドボックス egress を傍受する CA を含むバンドル（Claude 実行環境が用意する）。
CA_BUNDLE="${CCR_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}"

# devenv が固定している Supabase CLI が要求するイメージ（fallback 既定値）。
# ローカルに別バージョンが pull 済みなら find_ref がそちらを優先する。
# CLI を更新してイメージバージョンが変わったらこの 2 行も追随させること。
EDGE_DEFAULT="public.ecr.aws/supabase/edge-runtime:v1.73.3"
RT_DEFAULT="public.ecr.aws/supabase/realtime:v2.82.0"

MARKER="ccr.sandbox.patched"

# ── ガード 1: Claude サンドボックス以外では絶対に何もしない（ローカル保護）─────
# egress CA バンドルは Claude の実行コンテナにしか存在しない。ローカルの
# Mac / Linux 開発機には無いので、ここで確実に no-op になる。
# ※ macOS は /proc が無く IPv6 判定が使えないため、この CA ガードを最優先にする。
if [ ! -f "$CA_BUNDLE" ]; then
  exit 0
fi

# ── ガード 2:（サンドボックス内でも）IPv6 があるなら回避不要 ─────────────────
if [ -e /proc/net/if_inet6 ]; then
  log "IPv6 が有効 → Supabase イメージの回避は不要 (no-op)"
  exit 0
fi

command -v docker >/dev/null 2>&1 || { warn "docker が見つからない。スキップ"; exit 0; }

# ── docker daemon の起動確認（落ちていれば best-effort で起動）───────────────
if ! docker info >/dev/null 2>&1; then
  warn "docker daemon に接続できない。dockerd の起動を試行"
  nohup dockerd >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 15); do docker info >/dev/null 2>&1 && break; sleep 2; done
fi
docker info >/dev/null 2>&1 || { warn "docker daemon がまだ使えない。スキップ"; exit 0; }

# ローカルに存在する supabase/<repo> イメージの完全参照を返す（無ければ空）。
find_ref() {
  docker images --format '{{.Repository}}:{{.Tag}}' \
    | grep -E "supabase/$1:" | grep -v '<none>' | head -1
}

already_patched() {  # $1 = image ref
  [ "$(docker image inspect "$1" --format "{{ index .Config.Labels \"$MARKER\" }}" 2>/dev/null)" = "true" ]
}

ensure_pulled() {  # $1 = ref
  docker image inspect "$1" >/dev/null 2>&1 && return 0
  log "pull $1"
  docker pull "$1" >/dev/null 2>&1 || { warn "pull 失敗: $1"; return 1; }
}

# ── edge-runtime: egress CA を信頼ストアへ ──────────────────────────────────
patch_edge() {
  local ref; ref="$(find_ref edge-runtime)"; ref="${ref:-$EDGE_DEFAULT}"
  ensure_pulled "$ref" || return 0
  if already_patched "$ref"; then ok "edge-runtime は既にパッチ済み ($ref)"; return 0; fi
  local ctx; ctx="$(mktemp -d)"
  cp "$CA_BUNDLE" "$ctx/ca-bundle.crt"
  cat > "$ctx/Dockerfile" <<DOCKER
FROM $ref
COPY ca-bundle.crt /etc/ccr-ca-bundle.crt
RUN cat /etc/ccr-ca-bundle.crt >> /etc/ssl/certs/ca-certificates.crt
ENV DENO_CERT=/etc/ccr-ca-bundle.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV DENO_TLS_CA_STORE=system
LABEL $MARKER=true
DOCKER
  log "edge-runtime を egress CA 付きで再ビルド ($ref)"
  if docker build -q -t "$ref" "$ctx" >/dev/null; then ok "edge-runtime パッチ完了"; else warn "edge-runtime の再ビルド失敗"; fi
  rm -rf "$ctx"
}

# ── realtime: IPv4 バインドへ ────────────────────────────────────────────────
patch_realtime() {
  local ref; ref="$(find_ref realtime)"; ref="${ref:-$RT_DEFAULT}"
  ensure_pulled "$ref" || return 0
  if already_patched "$ref"; then ok "realtime は既にパッチ済み ($ref)"; return 0; fi
  local ctx; ctx="$(mktemp -d)"
  cat > "$ctx/Dockerfile" <<'DOCKER'
ARG BASE
FROM ${BASE}
# Phoenix エンドポイントの listen を IPv6 → IPv4 に。バージョン非依存に runtime.exs を探索。
RUN set -e; f="$(find /app/releases -maxdepth 2 -name runtime.exs | head -1)"; \
    sed -i 's/socket_opts: \[:inet6\]/socket_opts: [:inet]/' "$f"; \
    grep -q 'socket_opts: \[:inet\]' "$f"
# Erlang 分散 / Ecto も IPv4 に。
ENV ERL_AFLAGS="-proto_dist inet_tcp"
ENV ECTO_IPV6=false
ENV DB_IP_VERSION=ipv4
LABEL ccr.sandbox.patched=true
DOCKER
  log "realtime を IPv4 バインドで再ビルド ($ref)"
  if docker build -q --build-arg "BASE=$ref" -t "$ref" "$ctx" >/dev/null; then ok "realtime パッチ完了"; else warn "realtime の再ビルド失敗"; fi
  rm -rf "$ctx"
}

log "IPv6 無しサンドボックスを検出 → Supabase ローカルイメージを調整"
patch_edge
patch_realtime
ok "Supabase イメージの調整完了（この後 supabase-start で全サービスが起動可能）"
exit 0
