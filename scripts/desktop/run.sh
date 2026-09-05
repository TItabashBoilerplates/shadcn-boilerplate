#!/usr/bin/env bash
#
# Tauri デスクトップアプリ（frontend/apps/desktop）の起動 / 配布物ビルド。
#
#   desktop-run                     # ネイティブウィンドウを開く（既定は本番バックエンド）
#   desktop-run --env local         # ローカル Supabase / backend に向ける
#   desktop-run --build             # 配布物（.app / .dmg / .msi / .AppImage）を作る
#   desktop-run --build --env dev
#
# ## なぜ script が要るか
#
# ネイティブビルドには 2 つの前提が同時に要り、どちらが欠けても失敗の仕方が分かりにくい:
#
#   1. **Rust** … devenv の opt-in profile `desktop` にしか入っていない
#      （Linux はさらに WebKitGTK 一式。macOS / Windows は OS 側の前提だけで足りる）
#   2. **バックエンドの向き先** … Vite は `NEXT_PUBLIC_*` を**ビルド時に焼き込む**ので、
#      素の shell（ENV=local）で焼くと **localhost を見る .app** ができあがる。
#      値は devenv の env profile（`-P production` 等）が Doppler から入れる
#
# したがって profile を 2 つ重ねた shell の中で `nr tauri:*` を実行する。
#
# ⚠️ `--build` は **署名も公証もしない**（ローカル確認用）。配布物は
#    GitHub Actions の desktop-release.yml が作る。詳細は docs/desktop/release-runbook.md。
#
# ⚠️ sidecar（externalBin）を足したら、`nr tauri:*` の前にそのビルドを挟むこと
#    （`binaries/<name>-<target-triple>` が無いと externalBin の解決で落ちる）。
set -euo pipefail

MODE="dev"
ENV_NAME="production"

while [ $# -gt 0 ]; do
  case "$1" in
    --build) MODE="build"; shift ;;
    --dev) MODE="dev"; shift ;;
    --env) ENV_NAME="${2:?--env には local|dev|staging|production を渡す}"; shift 2 ;;
    -h|--help) sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

case "$ENV_NAME" in
  local|dev|staging|production) ;;
  *) echo "✗ --env は local|dev|staging|production のいずれか（受け取った値: ${ENV_NAME}）" >&2; exit 2 ;;
esac

# `local` は base の enterShell がそのまま担当する（`-P local` は不要）。
ENV_PROFILE=()
if [ "$ENV_NAME" != "local" ]; then
  ENV_PROFILE=(-P "$ENV_NAME")
fi

TASK="tauri:dev"
[ "$MODE" = "build" ] && TASK="tauri:build"

echo "🖥  desktop: $MODE (backend=$ENV_NAME)"

# Rust は `-P desktop` にしか無いので、必ずこの shell の中で実行する。
# ENV は profile の enterShell が export するが、明示しておくと
# 「-P だけ付けて ENV=local のままローカル値を掴む」事故を防げる。
exec devenv shell -P desktop "${ENV_PROFILE[@]}" -- bash -c "
  set -euo pipefail
  export ENV='$ENV_NAME'

  # ビルド時に焼き込む値なので、ここで食い違うと「起動はするがログインできない .app」になる。
  # デスクトップがまだバックエンドを参照していない段階（雛形）では未設定でよい
  if [ '$ENV_NAME' != 'local' ] && [ -n \"\${NEXT_PUBLIC_SUPABASE_URL:-}\" ]; then
    case \"\$NEXT_PUBLIC_SUPABASE_URL\" in
      *localhost*|*127.0.0.1*)
        echo \"✗ ENV=$ENV_NAME なのに Supabase の接続先がローカルです: \$NEXT_PUBLIC_SUPABASE_URL\" >&2
        exit 1 ;;
    esac
  fi

  echo \"   supabase: \${NEXT_PUBLIC_SUPABASE_URL:-<unset>}\"
  echo \"   backend : \${NEXT_PUBLIC_BACKEND_PY_URL:-<unset>}\"
  cd \"\$DEVENV_ROOT/frontend/apps/desktop\"
  exec nr $TASK
"
