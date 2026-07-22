#!/usr/bin/env bash
# ==============================================================================
# claude-code-web-setup.sh
#
#   Claude Code on the web (CCR) 専用セットアップスクリプト
#   for: titabashboilerplates/shadcn-boilerplate
#
#   ローカル開発や CI では使わない（この環境専用）。リポジトリのファイルは変更しない。
# ------------------------------------------------------------------------------
# 標準セットアップ（この2点をセットで設定する）:
#   1. CCR 環境設定の「Setup script」欄     … 本スクリプトの中身を貼る
#   2. CCR 環境設定の「環境変数」欄          … 次の1行を追加
#          BASH_ENV=/root/.ccr-devenv-env.sh
#
#   → これで Bash ツールから `lint` / `format` / `dev-web` などが *プレフィックス
#     無し* で通る（ローカルの direnv 自動ロードと同じ体験）。
#     ※ セットアップスクリプトからはツールシェルの環境変数を直接セットできない
#       ため、BASH_ENV の付与だけは「環境変数」欄で行う（2 が必須）。
# ------------------------------------------------------------------------------
# 何を解決するか:
#   本プロジェクトの開発コマンドは devenv (nix) 上に構築されている。ところが CCR の
#   Bash ツールは *非対話* シェルで動くため、~/.bashrc / ~/.profile / /etc/profile.d
#   を読み込まない。よって nix プロファイルを対話シェル向けに PATH 配線しても効かず、
#   `devenv` が「毎回認識されない」。
#     （実測: `direnv allow .` 後でも `bash -c 'command -v lint'` は not found）
#
# どう直すか:
#   (a) 既に PATH 上にある /usr/local/bin へ devenv/direnv/nix を symlink
#       → 非対話シェルでも `devenv` が解決する。
#   (b) BASH_ENV 用の「遅延ローダ」を書き出す（devenv 環境の生成は clone 後に遅延実行）
#       → CCR の setup script は clone 前に走るため、repo を要する devenv 事前ビルドや
#         direnv export はここでは行えない。setup script はローダだけを書き、上記 2 の
#         BASH_ENV 経由で各セッション最初の Bash（clone 済み）が devenv 環境を生成・
#         キャッシュして読み込む → devenv scripts が裸で通る。
#   (c) Docker デーモンを起動（supabase-start / Supabase ローカルに必要）。
#       CCR はプロセスをキャッシュしないため、各セッションでの起動は BASH_ENV
#       ファイル内の遅延起動が担う。
#   (d) Supabase ローカルイメージをこの環境向けに調整（realtime を IPv4 バインドに、
#       edge-runtime に egress 傍受 CA を信頼させる）。CCR は IPv6 が無く HTTPS が
#       TLS 傍受されるため、素のイメージだと realtime（:eafnosupport）と edge-runtime
#       （Deno の UnknownIssuer）が boot に失敗し `supabase start` がスタックごと落ちる。
#       ※ 環境キャッシュが docker データ（/var/lib/docker）を保持しない場合、`supabase
#         start` は毎セッション素イメージを pull し直す。そのためパッチは setup 時（下記3）
#         だけでなく、BASH_ENV ローダ（下記4）が毎セッション `--session-docker` モードで
#         当て直す。パッチ済みは LABEL で検出しスキップするので冪等。BASH_ENV（上記2）を
#         設定しないとこの当て直しが走らず realtime/edge-runtime が起動失敗する。
#   （nix のプロキシ / TLS 設定 NIX_SSL_CERT_FILE 等は CCR が注入済みで追加不要）
# ==============================================================================
set -euo pipefail

# この環境固有の既知パス（CCR / このリポジトリ専用なのでハードコード）
# ※ repo パスは setup script では使わない（clone 前のため）。遅延ローダが実行時に
#   $CLAUDE_PROJECT_DIR から解決する。
NIX_PROFILE_BIN=/root/.nix-profile/bin
NIX_DAEMON_SH=/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
ENV_FILE=/root/.ccr-devenv-env.sh        # ← 「環境変数」欄の BASH_ENV が指すファイル（遅延ローダ）
DOCKERD_LOG=/var/log/ccr-dockerd.log     # Docker デーモンのログ

log() { printf '\033[1;34m[cc-web-setup]\033[0m %s\n' "$*"; }

# Docker デーモンを起動（未起動時のみ）して ready まで待つ。
# supabase-start（Supabase ローカル = Docker）に必要。この環境は systemd が PID1
# ではなく init.d も ulimit で失敗するため、dockerd を直接 detach 起動する。
ensure_dockerd() {
  command -v dockerd >/dev/null 2>&1 || { log "dockerd 無し。スキップ。"; return 0; }
  if docker info >/dev/null 2>&1; then return 0; fi
  log "Docker デーモンを起動..."
  setsid dockerd >"$DOCKERD_LOG" 2>&1 < /dev/null &
  for _ in $(seq 1 30); do
    docker info >/dev/null 2>&1 && { log "Docker 起動 OK ($(docker info --format '{{.ServerVersion}}' 2>/dev/null))"; return 0; }
    sleep 1
  done
  log "Docker 起動待ちタイムアウト（$DOCKERD_LOG 参照）。継続。"
}

# Supabase ローカルイメージをこの CCR 環境向けに調整（冪等 / IPv6 無し + TLS 傍受対策）。
#   realtime     : HTTP エンドポイント/Erlang 分散を IPv6→IPv4（:eafnosupport 回避）
#   edge-runtime : egress 傍受 CA を信頼ストアへ追加（Deno の UnknownIssuer 回避）
# 同一タグで上書きビルド → `supabase start` は pull せずパッチ済みを使う。パッチ済みは
# LABEL で検出してスキップ。イメージ（ファイル）は環境キャッシュに残るため1回で済む。
ensure_supabase_images() {
  local ca="${CCR_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}"
  local edge_default="public.ecr.aws/supabase/edge-runtime:v1.73.3"
  local rt_default="public.ecr.aws/supabase/realtime:v2.82.0"
  local marker="ccr.sandbox.patched"

  # IPv6 があれば不要 / egress CA が無ければ別環境（＝ローカル）→ 何もしない
  [ -e /proc/net/if_inet6 ] && { log "IPv6 あり → Supabase イメージ調整は不要。"; return 0; }
  [ -f "$ca" ] || { log "egress CA 無し → Supabase イメージ調整をスキップ。"; return 0; }
  command -v docker >/dev/null 2>&1 || return 0
  docker info >/dev/null 2>&1 || { log "docker 未起動 → Supabase イメージ調整をスキップ。"; return 0; }

  local ref ctx
  # --- edge-runtime: egress 傍受 CA を信頼ストアへ ---
  ref="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'supabase/edge-runtime:' | grep -v '<none>' | head -1 || true)"
  ref="${ref:-$edge_default}"
  docker image inspect "$ref" >/dev/null 2>&1 || { log "pull $ref"; docker pull "$ref" >/dev/null 2>&1 || log "pull 失敗: $ref（継続）"; }
  if docker image inspect "$ref" >/dev/null 2>&1 \
     && [ "$(docker image inspect "$ref" --format "{{ index .Config.Labels \"$marker\" }}" 2>/dev/null)" != "true" ]; then
    ctx="$(mktemp -d)"; cp "$ca" "$ctx/ca-bundle.crt"
    cat > "$ctx/Dockerfile" <<DOCKER
FROM $ref
COPY ca-bundle.crt /etc/ccr-ca-bundle.crt
RUN cat /etc/ccr-ca-bundle.crt >> /etc/ssl/certs/ca-certificates.crt
ENV DENO_CERT=/etc/ccr-ca-bundle.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV DENO_TLS_CA_STORE=system
LABEL $marker=true
DOCKER
    log "edge-runtime を egress CA 付きで再ビルド ($ref)"
    docker build -q -t "$ref" "$ctx" >/dev/null || log "edge-runtime 再ビルド失敗（継続）"
    rm -rf "$ctx"
  else
    log "edge-runtime は調整済み/スキップ ($ref)"
  fi

  # --- realtime: IPv6 → IPv4 バインドへ ---
  ref="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'supabase/realtime:' | grep -v '<none>' | head -1 || true)"
  ref="${ref:-$rt_default}"
  docker image inspect "$ref" >/dev/null 2>&1 || { log "pull $ref"; docker pull "$ref" >/dev/null 2>&1 || log "pull 失敗: $ref（継続）"; }
  if docker image inspect "$ref" >/dev/null 2>&1 \
     && [ "$(docker image inspect "$ref" --format "{{ index .Config.Labels \"$marker\" }}" 2>/dev/null)" != "true" ]; then
    ctx="$(mktemp -d)"
    cat > "$ctx/Dockerfile" <<'DOCKER'
ARG BASE
FROM ${BASE}
# Phoenix エンドポイントの listen を IPv6→IPv4（バージョン非依存に runtime.exs 探索）
RUN set -e; f="$(find /app/releases -maxdepth 2 -name runtime.exs | head -1)"; \
    sed -i 's/socket_opts: \[:inet6\]/socket_opts: [:inet]/' "$f"; \
    grep -q 'socket_opts: \[:inet\]' "$f"
ENV ERL_AFLAGS="-proto_dist inet_tcp"
ENV ECTO_IPV6=false
ENV DB_IP_VERSION=ipv4
LABEL ccr.sandbox.patched=true
DOCKER
    log "realtime を IPv4 バインドで再ビルド ($ref)"
    docker build -q --build-arg "BASE=$ref" -t "$ref" "$ctx" >/dev/null || log "realtime 再ビルド失敗（継続）"
    rm -rf "$ctx"
  else
    log "realtime は調整済み/スキップ ($ref)"
  fi
  return 0
}

# ------------------------------------------------------------------------------
# セッション時モード（BASH_ENV ローダから呼ばれる）:
#   dockerd 起動 + Supabase イメージ調整だけを行い、nix/devenv 導入はしない。
#   CCR は docker データ（/var/lib/docker）をセッション跨ぎで保持しない場合があり、
#   その場合 `supabase start` が毎セッション素イメージを pull し直す。よってイメージ
#   パッチ（realtime→IPv4 / edge-runtime→CA）を setup 時（下記3）だけでなく毎セッション
#   ここでも当て直す。パッチ済みは LABEL で検出しスキップするので冪等。
# ------------------------------------------------------------------------------
if [ "${1:-}" = "--session-docker" ]; then
  ensure_dockerd
  ensure_supabase_images || log "Supabase イメージ調整でエラー（継続）"
  exit 0
fi

# ------------------------------------------------------------------------------
# 1. nix + devenv + direnv を導入（未導入時のみ / 冪等）
#    ★ CCR のビルド環境は systemd が無く / が claude 所有のため、Determinate の
#      既定（--init systemd）だと determinate-nixd の init サービス設定
#      （systemd-tmpfiles）で "unsafe path transition" により失敗する。
#      --init none（root-only nix、systemd 不要）で回避する。
# ------------------------------------------------------------------------------
NIX_BIN=/nix/var/nix/profiles/default/bin/nix
if [ ! -e "$NIX_BIN" ] && ! command -v nix >/dev/null 2>&1; then
  log "Determinate Nix をインストール（--init none: systemd 不要 / root-only）..."
  curl -fsSL https://install.determinate.systems/nix \
    | sh -s -- install linux --init none --no-confirm \
        ${NIX_SSL_CERT_FILE:+--ssl-cert-file $NIX_SSL_CERT_FILE}
fi

# セットアップシェルに nix を PATH 追加（--init none でも profile script は作られる）
unset __ETC_PROFILE_NIX_SOURCED
for _f in "$NIX_DAEMON_SH" /nix/var/nix/profiles/default/etc/profile.d/nix.sh; do
  # shellcheck disable=SC1090
  [ -e "$_f" ] && { . "$_f"; break; }
done
# フォールバック: nix が PATH に無ければ profile bin を直接足す
command -v nix >/dev/null 2>&1 || export PATH="/nix/var/nix/profiles/default/bin:$NIX_PROFILE_BIN:$PATH"

for pkg in devenv direnv cachix; do
  if [ ! -e "$NIX_PROFILE_BIN/$pkg" ]; then
    log "nix profile add nixpkgs#$pkg ..."
    nix profile add "nixpkgs#$pkg"
  fi
done

# ------------------------------------------------------------------------------
# 2. devenv / direnv / nix を PATH 上の /usr/local/bin に symlink
#    → 非対話の Bash ツールシェルでも `devenv` が解決する
# ------------------------------------------------------------------------------
log "devenv / direnv / nix を /usr/local/bin に symlink..."
mkdir -p /usr/local/bin
for b in devenv direnv nix nix-build nix-shell cachix; do
  [ -e "$NIX_PROFILE_BIN/$b" ] && ln -sf "$NIX_PROFILE_BIN/$b" "/usr/local/bin/$b"
done
log "確認: $(command -v devenv) → $(devenv version 2>/dev/null || echo '??')"

# ------------------------------------------------------------------------------
# 3. Docker デーモンを起動 → Supabase ローカルイメージを調整
#    ※ CCR の環境キャッシュはファイルのみ保存しプロセスは保存しないため、ここで
#      起動した dockerd は新規セッションには残らない。各セッションでの起動は下の
#      BASH_ENV ファイル（毎シェル source）内の遅延起動が担う。ここでの起動は
#      セットアップ時の事前ビルド／検証用。
#    ※ Supabase イメージ（realtime / edge-runtime）はこの CCR 環境では素だと boot に
#      失敗するため調整する。イメージ（ファイル）は環境キャッシュに残るのでここで1回
#      やれば各セッションで有効（dockerd プロセスと違い毎回やり直す必要がない）。
# ------------------------------------------------------------------------------
ensure_dockerd
ensure_supabase_images || log "Supabase イメージ調整でエラー（継続）"

# ------------------------------------------------------------------------------
# 4. BASH_ENV 用の「遅延ローダ」を書き出す（repo 依存処理を clone 後に実行するため）
#    ※ CCR の setup script は「リポジトリのクローン前」に実行される。よって devenv.nix
#      を要する事前ビルドや direnv export はここでは行えない。そこで setup script は
#      *ローダだけ* を書き、実際の devenv 環境生成は各セッション最初の非対話 Bash 呼び出し
#      （＝ clone 済み）で遅延実行させる。「環境変数」欄で BASH_ENV=$ENV_FILE を指すと、
#      全非対話シェルがこのローダを source し:
#        - devenv 環境（PATH 等）をセッション内キャッシュ経由で読み込み → lint /
#          supabase-start 等が裸で通る（初回のみ devenv ビルドで時間がかかる。cachix で緩和可）
#        - Docker デーモンが未起動なら1回だけ起動し、Supabase イメージを当て直す
#          （--session-docker モード。プロセス／イメージはセッション跨ぎで残らない前提）
#      _CCR_DEVENV_LOADED を即 export して、ビルド中に派生する子シェルの再入（デッドロック）
#      を防ぎ、ロックで先着1プロセスだけが生成する。
# ------------------------------------------------------------------------------
log "BASH_ENV 遅延ローダを $ENV_FILE に書き出し..."
cat > "$ENV_FILE" <<'LOADER'
# Auto-generated by claude-code-web-setup.sh — BASH_ENV 経由で毎非対話 bash が source。
# repo 依存の devenv 環境生成を clone 後に遅延実行し、セッション内でキャッシュする。
[ -n "${_CCR_DEVENV_LOADED:-}" ] && return 0
export _CCR_DEVENV_LOADED=1   # ビルド中に派生する子 bash はここで即抜け（再入/デッドロック防止）

_ccr_repo="${CLAUDE_PROJECT_DIR:-/home/user/shadcn-boilerplate}"
_ccr_cache=/root/.ccr-devenv-env.cache.sh
_ccr_lock=/root/.ccr-devenv-env.lock

# Docker デーモンと Supabase イメージパッチ（realtime→IPv4 / edge-runtime→CA）を確保する。
#   ★ 修正前は「dockerd が未起動のときだけ」パッチを結線していたため、dockerd が既に
#     起動済みのセッションではパッチが当たらず、realtime(:eafnosupport) / edge-runtime
#     (Deno UnknownIssuer) が boot に失敗していた。dockerd の起動有無に依存させず、
#     「イメージが未パッチなら必ず当て直す」方式にする。両処理とも冪等
#     （dockerd は docker info で早期 return、イメージは LABEL 検出でスキップ）。
#   まず軽量なインライン検査（dockerd 稼働 & realtime/edge-runtime が patched=true）で
#   確定済みなら何もしない。未確定のとき（dockerd 停止 / イメージ未 pull / 未パッチ）だけ
#   重い --session-docker（pull+build 含む）を1回呼んで収束させる。
if command -v dockerd >/dev/null 2>&1; then
  _ccr_need=0
  pgrep -x dockerd >/dev/null 2>&1 || _ccr_need=1
  if [ "$_ccr_need" = 0 ]; then
    for _ccr_img in realtime edge-runtime; do
      _ccr_ref="$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E "supabase/${_ccr_img}:" | grep -v '<none>' | head -1 || true)"
      if [ -z "$_ccr_ref" ] || [ "$(docker image inspect "$_ccr_ref" --format '{{ index .Config.Labels "ccr.sandbox.patched" }}' 2>/dev/null || true)" != "true" ]; then
        _ccr_need=1; break
      fi
    done
  fi
  if [ "$_ccr_need" = 1 ]; then
    _ccr_setup="$_ccr_repo/scripts/claude-code-web-setup.sh"
    if [ -f "$_ccr_setup" ]; then
      bash "$_ccr_setup" --session-docker >>/var/log/ccr-dockerd.log 2>&1 || true
    else
      # clone 前など repo 不在時: dockerd だけ確保（イメージパッチは repo が要るため、
      # repo が見える後続の別 Bash 呼び出しのローダが収束させる）。
      pgrep -x dockerd >/dev/null 2>&1 || ( setsid dockerd >/var/log/ccr-dockerd.log 2>&1 < /dev/null & ) >/dev/null 2>&1 || true
    fi
    unset _ccr_setup
  fi
  unset _ccr_need _ccr_img _ccr_ref
fi

# devenv 環境: キャッシュ未生成なら先着1プロセスだけが生成（初回はビルドで数分）
if [ ! -f "$_ccr_cache" ] && command -v devenv >/dev/null 2>&1 && [ -f "$_ccr_repo/devenv.nix" ]; then
  if ( set -o noclobber; : > "$_ccr_lock" ) 2>/dev/null; then
    ( cd "$_ccr_repo" && direnv allow . >/dev/null 2>&1 || true; devenv shell -- true >/dev/null 2>&1 || true )
    _ccr_json="$( cd "$_ccr_repo" && direnv export json 2>/dev/null )" || true
    if printf '%s' "$_ccr_json" | jq -e 'has("PATH")' >/dev/null 2>&1; then
      {
        echo '_ccr_prev_path="$PATH"'
        printf '%s' "$_ccr_json" | jq -r 'to_entries[]|select(.value!=null)|"export \(.key)=\(.value|@sh)"'
        echo 'export PATH="$PATH:$_ccr_prev_path"'
        echo 'unset _ccr_prev_path'
      } > "$_ccr_cache"
    fi
    rm -f "$_ccr_lock"
  else
    # 他プロセスが生成中: キャッシュが出来るまで待つ（最大300秒）
    for _ in $(seq 1 300); do [ -f "$_ccr_cache" ] && break; sleep 1; done
  fi
fi

[ -f "$_ccr_cache" ] && . "$_ccr_cache"
unset _ccr_repo _ccr_cache _ccr_lock _ccr_json 2>/dev/null || true
LOADER

log "完了。環境変数欄に BASH_ENV=$ENV_FILE を設定すれば、clone 後の初回 Bash で"
log "devenv 環境（裸コマンド）/ Docker / Supabase イメージ調整が有効になります"
log "（初回のみ devenv ビルド + イメージ pull/パッチで時間がかかる）。"
log "★ BASH_ENV 未設定だとローダが動かず realtime/edge-runtime が起動失敗するので必須。"
