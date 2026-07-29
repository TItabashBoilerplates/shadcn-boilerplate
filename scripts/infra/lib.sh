#!/usr/bin/env bash
# 共通ヘルパ（scripts/infra/*.sh から source される）。
# - secret 値は絶対に stdout / ログに出さない（key 名のみ）。
# - 冪等性は best-effort: 「存在チェック → 無ければ作成」で再実行・途中失敗からの続行を安全にする。
set -euo pipefail

# ── ログ（secret を出さない） ────────────────────────────────────────────────
log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── ツール / env の存在チェック ──────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }

require_tool() {
  have "$1" || die "CLI '$1' が見つかりません。devenv の packages か runbook の導入手順を確認してください。"
}

# 値は表示しない。未設定/空ならエラー（key 名のみ表示）。
require_env() {
  local name="$1"
  local val="${!name:-}"
  [ -n "$val" ] || die "環境変数 '$name' が未設定です（Doppler bootstrap config から注入されているか確認）。"
}

# 任意（未設定なら空のまま続行）。
optional_env() {
  local name="$1"
  printf '%s' "${!name:-}"
}

# ── Supabase CLI 認証の橋渡し ───────────────────────────────────────────────
# Doppler には `SUPABASE_` prefix のキーを登録できない（.claude/rules/env-naming.md）ため、
# bootstrap config では `SB_ACCESS_TOKEN` で保持する。一方 Supabase CLI は
# `SUPABASE_ACCESS_TOKEN` しか読まないので、CLI を呼ぶ直前にプロセス環境へ写す。
# （これはプロセス内の export であって Doppler への登録ではない = 同ルール §5 の対象外）
supabase_cli_auth() {
  require_env SB_ACCESS_TOKEN
  export SUPABASE_ACCESS_TOKEN="$SB_ACCESS_TOKEN"
}

# ── outputs（非機密のみ。ref / URL 等を記録して env/*.env 記入の元データにする） ──
OUTPUTS_FILE="${INFRA_OUTPUTS_FILE:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.outputs}"

record_output() {
  # record_output KEY VALUE  — 非機密値のみ渡すこと
  local key="$1" val="$2"
  mkdir -p "$(dirname "$OUTPUTS_FILE")"
  # 同一キーは上書き（冪等）
  if [ -f "$OUTPUTS_FILE" ]; then
    grep -v "^${key}=" "$OUTPUTS_FILE" > "${OUTPUTS_FILE}.tmp" 2>/dev/null || true
    mv "${OUTPUTS_FILE}.tmp" "$OUTPUTS_FILE"
  fi
  printf '%s=%s\n' "$key" "$val" >> "$OUTPUTS_FILE"
  ok "output: ${key}=${val}"
}

# ── 非機密の入力 config を読む（config.env。無ければ example を案内） ─────────
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

load_config() {
  local cfg="${INFRA_CONFIG_FILE:-$INFRA_DIR/config.env}"
  if [ ! -f "$cfg" ]; then
    die "非機密設定 '$cfg' がありません。'$INFRA_DIR/config.example.env' をコピーして値を埋めてください。"
  fi
  # shellcheck disable=SC1090
  set -a; . "$cfg"; set +a
}

# 環境名 → Doppler config 名（branch→env マッピングと一致させる）
# dev→dev / staging→stg / production→prd
doppler_config_for() {
  case "$1" in
    dev)        echo "dev" ;;
    staging)    echo "stg" ;;
    production) echo "prd" ;;
    *) die "未知の環境: $1（dev|staging|production）" ;;
  esac
}

# 環境名 → git branch 名（Supabase persistent branch / GitHub Environment と一致させる）
# dev→develop / staging→staging / production→main
git_branch_for() {
  case "$1" in
    dev)        echo "develop" ;;
    staging)    echo "staging" ;;
    production) echo "main" ;;
    *) die "未知の環境: $1（dev|staging|production）" ;;
  esac
}
