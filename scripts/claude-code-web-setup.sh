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
#   (b) devenv 環境を BASH_ENV 用ファイルに書き出す
#       → 上記 2 の BASH_ENV 経由で全 Bash 呼び出しに devenv 環境が読み込まれ、
#         devenv scripts が裸で通る。
#   (c) Docker デーモンを起動（supabase-start / Supabase ローカルに必要）。
#       CCR はプロセスをキャッシュしないため、各セッションでの起動は BASH_ENV
#       ファイル内の遅延起動が担う。
#   （nix のプロキシ / TLS 設定 NIX_SSL_CERT_FILE 等は CCR が注入済みで追加不要）
# ==============================================================================
set -euo pipefail

# この環境固有の既知パス（CCR / このリポジトリ専用なのでハードコード）
REPO=/home/user/shadcn-boilerplate
NIX_PROFILE_BIN=/root/.nix-profile/bin
NIX_DAEMON_SH=/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
ENV_FILE=/root/.ccr-devenv-env.sh        # ← 「環境変数」欄の BASH_ENV が指すファイル
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

# ------------------------------------------------------------------------------
# 1. nix + devenv + direnv を導入（未導入時のみ / 冪等）
#    入れ方は本リポジトリ CI 準拠（.github/workflows/ci.yml: nix profile add）
# ------------------------------------------------------------------------------
if [ ! -e "$NIX_DAEMON_SH" ]; then
  log "Determinate Nix をインストール..."
  curl -fsSL https://install.determinate.systems/nix | sh -s -- install --no-confirm
fi

# セットアップシェルに nix をロード（NIX_SSL_CERT_FILE 等は CCR が注入済み）
unset __ETC_PROFILE_NIX_SOURCED
# shellcheck disable=SC1091
. "$NIX_DAEMON_SH"

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
# 3. Docker デーモンを起動（supabase-start / Supabase ローカル用）
#    ※ CCR の環境キャッシュはファイルのみ保存しプロセスは保存しないため、ここで
#      起動した dockerd は新規セッションには残らない。各セッションでの起動は下の
#      BASH_ENV ファイル（毎シェル source）内の遅延起動が担う。ここでの起動は
#      セットアップ時の事前ビルド／検証用。
# ------------------------------------------------------------------------------
ensure_dockerd

# ------------------------------------------------------------------------------
# 4. devenv シェルを事前ビルド（環境キャッシュに焼く → 初回コマンドが速くなる）
# ------------------------------------------------------------------------------
log "devenv シェルを事前ビルド（初回のみ時間がかかる）..."
( cd "$REPO" && direnv allow . >/dev/null 2>&1 || true; devenv shell -- true ) \
  || log "事前ビルド失敗（セッション内で解決可能）。継続。"

# ------------------------------------------------------------------------------
# 5. devenv 環境を BASH_ENV 用ファイルに書き出す（裸コマンド + 各セッション Docker 起動）
#    「環境変数」欄で BASH_ENV=$ENV_FILE を指すと、全非対話シェルがこれを source し、
#      - lint / format / dev-web 等が裸で通る
#      - Docker デーモンが未起動なら（各セッション）バックグラウンドで1回だけ起動
#    ガード（_CCR_DEVENV_LOADED）で子シェルは再読込しない。既存 PATH は温存（結合）。
# ------------------------------------------------------------------------------
log "devenv 環境を $ENV_FILE に書き出し（BASH_ENV 用）..."

# direnv export は稀に空を返す（状態依存）。PATH を含む結果が得られるまで最大3回。
devenv_env_json=""
for _ in 1 2 3; do
  # `|| true`: direnv export が非ゼロ終了しても set -e で落とさずリトライさせる
  devenv_env_json="$( cd "$REPO" && direnv allow . >/dev/null 2>&1; direnv export json 2>/dev/null )" || true
  if printf '%s' "$devenv_env_json" | jq -e 'has("PATH")' >/dev/null 2>&1; then break; fi
  devenv_env_json=""
done
[ -n "$devenv_env_json" ] || log "警告: devenv env の取得に失敗（裸コマンドは無効。devenv shell -- で回避可）。"

{
  echo "# Auto-generated by claude-code-web-setup.sh"
  echo "# Enable by setting env var:  BASH_ENV=$ENV_FILE"
  echo '[ -n "${_CCR_DEVENV_LOADED:-}" ] && return 0'
  echo '_ccr_prev_path="$PATH"'
  printf '%s' "$devenv_env_json" \
    | jq -r 'to_entries[] | select(.value != null) | "export \(.key)=\(.value | @sh)"' 2>/dev/null || true
  echo 'export PATH="$PATH:$_ccr_prev_path"'
  echo 'export _CCR_DEVENV_LOADED=1'
  echo 'unset _ccr_prev_path'
  # 各セッションで Docker デーモンを1回だけ遅延起動（CCR はプロセスを保存しないため）。
  # pgrep ガードで既起動時は何もしない。detach 起動（fire-and-forget、待たない）。
  echo 'if command -v dockerd >/dev/null 2>&1 && ! pgrep -x dockerd >/dev/null 2>&1; then'
  echo "  ( setsid dockerd >$DOCKERD_LOG 2>&1 < /dev/null & ) >/dev/null 2>&1 || true"
  echo 'fi'
} > "$ENV_FILE"

log "完了。BASH_ENV=$ENV_FILE を環境変数欄に設定すれば裸コマンド + Docker 自動起動が有効です。"
