#!/usr/bin/env bash
# Doppler `all/all` の Apple 署名・公証シークレットと、自動更新（updater）の署名鍵を
# GitHub Actions へ配線する。
#
#   使い方: desktop-wire-signing            # 全キーを配線（欠けていたら落ちる）
#           desktop-wire-signing --updater-only   # 自動更新の署名鍵だけ（macOS 署名は後回し）
#   前提  : doppler login 済み / gh auth 済み（repo admin）
#           updater の鍵は desktop-updater-keygen が Doppler に登録する
#
# ## なぜ Doppler の sync に任せないのか
#
# - `all` project は**アカウント共通トークンの置き場**で、意図的にどこへも sync しない
#   （VC_TOKEN / GH_TOKEN / SUPABASE_ACCESS_TOKEN まで丸ごと GitHub へ届いてしまうため、
#   config 単位でしか作れない sync はここでは過剰配布になる）。
# - `<app>/prd` へコピーする案は、prd の sync 先（GitHub Actions の全 environment、
#   将来 Vercel / Edge Functions）にまで署名証明書が配られてしまうので却下。
# - よってこのスクリプトが **下の KEYS だけ**を GitHub の Repository secrets へ写す。
#   Doppler 側でローテーションしたら再実行する（docs/desktop/release-runbook.md）。
#
# ## Repository secrets にする理由
#
# desktop-release.yml の job は `environment: production`（SUPABASE_PROJECT_REF 等の供給元）
# を使う。GitHub は environment → repository の順で secret を解決するので、APPLE_* を
# repository 側に置けば environment を汚さず（= Doppler の environment sync が
# 管理する集合に手出しせず）両方が届く。
#
# ## 値の扱い
#
# 値は Doppler → このプロセスの env → gh の stdin にしか現れない。
# echo / ログ / argv（外部コマンドの引数）には一切出さない。
set -euo pipefail

UPDATER_ONLY=0
[ "${1:-}" = "--updater-only" ] && UPDATER_ONLY=1

# 自動更新の署名鍵（minisign）。これが無いと updater artifact の署名で CI が落ちる
UPDATER_KEYS=(
  TAURI_SIGNING_PRIVATE_KEY  # desktop-updater-keygen が生成・登録
)
# macOS の Developer ID 署名 + 公証。無いと `tauri build` は**未署名のまま成功**する
APPLE_KEYS=(
  APPLE_CERTIFICATE          # Developer ID Application (.p12, base64)
  APPLE_CERTIFICATE_PASSWORD # ↑ のパスワード
  APPLE_SIGNING_IDENTITY     # "Developer ID Application: <name> (<team>)"
  APPLE_API_KEY              # App Store Connect API の Key ID（notarytool 用）
  APPLE_API_ISSUER           # 同 Issuer ID
  APPLE_API_KEY_P8           # 同 .p8 秘密鍵（PEM または base64）
)

KEYS=("${UPDATER_KEYS[@]}")
[ "$UPDATER_ONLY" -eq 0 ] && KEYS+=("${APPLE_KEYS[@]}")

command -v doppler >/dev/null 2>&1 || { echo "✗ doppler CLI がありません" >&2; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "✗ gh CLI がありません" >&2; exit 1; }

# Doppler の値を env に注入した子プロセスとして自分を再実行する
if [ -z "${_DESKTOP_WIRE:-}" ]; then
  echo "→ Doppler all/all から署名シークレットを読み込みます（値は表示しません）"
  exec doppler run --project all --config all -- env _DESKTOP_WIRE=1 bash "$0" "$@"
fi

# doppler run が注入する GH_TOKEN / GITHUB_TOKEN は狭い PAT のことがあり、
# secrets 管理（admin）権限が無い。gh は env トークンを keyring より優先するため、
# ここで外して `gh auth login` 済みの認証（repo admin）に戻す。
unset GH_TOKEN GITHUB_TOKEN

# 配線先は **このリポジトリ**（origin の GitHub リポジトリ）。
# 雛形から起こしたプロジェクトでも書き換え不要にするため、固定せず解決する。
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
[ -n "$REPO" ] || { echo "✗ GitHub リポジトリを解決できません（gh auth / origin を確認）" >&2; exit 1; }
echo "→ 配線先: $REPO (Repository secrets)"

for key in "${KEYS[@]}"; do
  value="${!key:-}"
  if [ -z "$value" ]; then
    echo "✗ Doppler all/all に $key がありません" >&2
    if [ "$key" = "TAURI_SIGNING_PRIVATE_KEY" ]; then
      echo "  → desktop-updater-keygen を先に実行してください" >&2
    else
      echo "  → Apple の証明書 / ASC API キーを Doppler all/all に投入してください" >&2
      echo "     （まだ用意できていないなら desktop-wire-signing --updater-only）" >&2
    fi
    exit 1
  fi
  # printf は bash builtin なので値が別プロセスの argv に載らない。gh へは stdin で渡す
  printf '%s' "$value" | gh secret set "$key" --repo "$REPO" --app actions
  echo "✓ $key → $REPO (Repository secret)"
done

echo "完了: desktop-release.yml がこれらを参照できます。"
