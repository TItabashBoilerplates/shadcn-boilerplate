#!/usr/bin/env bash
# 自動更新（tauri-plugin-updater）の署名鍵と配布 endpoint を用意する。
#
#   使い方: desktop-updater-keygen [--supabase-url https://<ref>.supabase.co] [--force]
#           --supabase-url … 配布先（本番 Supabase）。省略時は scripts/infra/.outputs の
#                            SUPABASE_REF から組む。初回は必ずどちらかで解決できること
#           --force        … 鍵を再生成（⚠️ 配布済みアプリは以後の更新を検証できなくなる）
#   前提  : doppler login 済み / gh auth 済み（repo admin）/ frontend の bun install 済み
#
# やること（順に）:
#   1. Doppler all/all に TAURI_SIGNING_PRIVATE_KEY が無ければ `tauri signer generate` で鍵ペアを作る
#   2. 秘密鍵（と公開鍵）を Doppler all/all に保管する
#   3. wire-signing-secrets.sh で GitHub Repository secrets へ写す（desktop-release.yml が読む）
#   4. 公開鍵と endpoint を tauri.conf.json の plugins.updater に焼き込む（コミット対象）
#
# ## 鍵は永続。失くしたら終わり
#
# 公開鍵は配布したアプリに焼き込まれる。秘密鍵を変えると、**配布済みのアプリは新しい
# 署名を検証できず、以後の更新が一切届かない**（手動で入れ直してもらうしかない）。
# だから既に登録済みなら生成しないし、--force は本当に事故ったときだけ使う。
#
# ## endpoint も同じく永続
#
# 配布済みアプリはこの URL しか見ない。あとから配布先を変えると、旧版は永久に
# 更新されなくなる。**最初に本番 Supabase project を決めてから**実行すること。
#
# ## パスワードを付けない理由
#
# `tauri signer generate -p <pw>` はパスワードが argv に載る（ps で見える）。`--ci` なら
# 空パスワードで生成され、鍵は Doppler（シークレットストア）にしか置かないので、
# パスワードを別に持っても守れるものが増えない。CI 側は
# TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" を**明示**する（未設定だと対話プロンプトで固まる）。
#
# ## 値の扱い
#
# 秘密鍵は一時ディレクトリ（0700）→ このプロセスの変数 → doppler の stdin にしか現れない。
# echo / ログ / argv には一切出さない。公開鍵だけは表示する（配布物に焼くもので秘密ではない）。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESKTOP_DIR="$REPO_ROOT/frontend/apps/desktop"
CONF="$DESKTOP_DIR/src-tauri/tauri.conf.json"
OUTPUTS_FILE="$REPO_ROOT/scripts/infra/.outputs"
PRIVATE_KEY_NAME="TAURI_SIGNING_PRIVATE_KEY"
PUBLIC_KEY_NAME="TAURI_SIGNING_PUBLIC_KEY"
FORCE=0
SUPABASE_URL_ARG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --supabase-url) SUPABASE_URL_ARG="${2:?--supabase-url には https://<ref>.supabase.co を渡す}"; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

for cmd in doppler gh bun node; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "✗ $cmd がありません" >&2; exit 1; }
done

# ── 配布 endpoint（本番 Supabase）の解決 ──────────────────────────────────
# 優先順: --supabase-url > tauri.conf.json に既に入っている値 > infra の .outputs
current_endpoint="$(node -e '
  const conf = require(process.argv[1]);
  process.stdout.write(conf.plugins?.updater?.endpoints?.[0] ?? "");
' "$CONF")"

supabase_url="$SUPABASE_URL_ARG"
if [ -z "$supabase_url" ] && [ -n "$current_endpoint" ]; then
  supabase_url="$(printf '%s' "$current_endpoint" | sed -nE 's|^(https://[^/]+)/.*$|\1|p')"
fi
if [ -z "$supabase_url" ] && [ -f "$OUTPUTS_FILE" ]; then
  ref="$(sed -n 's/^SUPABASE_REF=//p' "$OUTPUTS_FILE" | tr -d '"' | head -1)"
  [ -n "$ref" ] && supabase_url="https://${ref}.supabase.co"
fi
if [ -z "$supabase_url" ]; then
  echo "✗ 配布先（本番 Supabase）を解決できません。" >&2
  echo "  --supabase-url https://<ref>.supabase.co を渡すか、infra-bootstrap を先に実行してください。" >&2
  exit 1
fi
supabase_url="${supabase_url%/}"
endpoint="${supabase_url}/storage/v1/object/public/releases/desktop/latest/latest.json"

if [ -n "$current_endpoint" ] && [ "$current_endpoint" != "$endpoint" ]; then
  echo "⚠️  endpoint を変更しようとしています。**配布済みアプリは旧 URL しか見ません**。" >&2
  echo "    現在: $current_endpoint" >&2
  echo "    新規: $endpoint" >&2
  printf '続行するには yes と入力: ' >&2
  IFS= read -r answer
  [ "$answer" = "yes" ] || { echo "中止" >&2; exit 1; }
fi

has_secret() {
  doppler secrets get "$1" --project all --config all --plain >/dev/null 2>&1
}

put_secret() {
  # 値は stdin で渡す（argv に載せない）
  printf '%s' "$2" | doppler secrets set "$1" --project all --config all --no-interactive --silent >/dev/null
  echo "✓ $1 → Doppler all/all" >&2
}

if has_secret "$PRIVATE_KEY_NAME" && [ "$FORCE" -eq 0 ]; then
  echo "→ $PRIVATE_KEY_NAME は Doppler all/all に登録済み。再生成しません（--force で上書き）"
  public_key="$(doppler secrets get "$PUBLIC_KEY_NAME" --project all --config all --plain 2>/dev/null || true)"
  if [ -z "$public_key" ]; then
    echo "✗ $PUBLIC_KEY_NAME が無く、秘密鍵から公開鍵を導出する手段が CLI に無い。" >&2
    echo "  tauri.conf.json の pubkey が既に入っていればそのままでよい。空なら --force で作り直す（配布済みアプリは更新不能になる）。" >&2
    exit 1
  fi
else
  if [ "$FORCE" -eq 1 ] && has_secret "$PRIVATE_KEY_NAME"; then
    echo "⚠️  --force: 既存の鍵を捨てます。配布済みのアプリは以後の自動更新を検証できません。" >&2
    printf '続行するには yes と入力: ' >&2
    IFS= read -r answer
    [ "$answer" = "yes" ] || { echo "中止" >&2; exit 1; }
  fi
  tmp="$(mktemp -d)"
  chmod 700 "$tmp"
  trap 'rm -rf "$tmp"' EXIT
  echo "→ 鍵ペアを生成します（tauri signer generate --ci）"
  # CLI は鍵を stdout にも出すので捨てる（ファイルからだけ読む）
  (cd "$DESKTOP_DIR" && bunx tauri signer generate -w "$tmp/updater.key" --ci --force >/dev/null 2>&1)
  private_key="$(cat "$tmp/updater.key")"
  public_key="$(cat "$tmp/updater.key.pub")"
  [ -n "$private_key" ] && [ -n "$public_key" ] || { echo "✗ 鍵の生成に失敗" >&2; exit 1; }
  put_secret "$PRIVATE_KEY_NAME" "$private_key"
  put_secret "$PUBLIC_KEY_NAME" "$public_key"
  unset private_key
fi

echo "→ GitHub Repository secrets へ配線します"
bash "$REPO_ROOT/scripts/desktop/wire-signing-secrets.sh" --updater-only

echo "→ 公開鍵と endpoint を tauri.conf.json に焼き込みます"
PUBLIC_KEY="$public_key" ENDPOINT="$endpoint" node -e '
  const fs = require("node:fs");
  const path = process.argv[1];
  const conf = JSON.parse(fs.readFileSync(path, "utf8"));
  conf.plugins ??= {};
  conf.plugins.updater ??= {};
  conf.plugins.updater.endpoints = [process.env.ENDPOINT];
  conf.plugins.updater.pubkey = process.env.PUBLIC_KEY;
  // Windows は進捗だけ出して質問しない（更新のたびにウィザードを見せない）
  conf.plugins.updater.windows ??= { installMode: "passive" };
  fs.writeFileSync(path, `${JSON.stringify(conf, null, 2)}\n`);
' "$CONF"
echo "✓ plugins.updater を更新: $CONF"
echo "   endpoint: $endpoint"
echo
echo "公開鍵（配布物に焼き込むもの。秘密ではない）:"
echo "$public_key"
echo
echo "次: Apple の署名/公証シークレットを Doppler all/all に入れて desktop-wire-signing を実行し、"
echo "    tauri.conf.json をコミットしてください（docs/desktop/release-runbook.md）。"
