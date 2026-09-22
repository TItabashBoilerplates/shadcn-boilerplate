#!/usr/bin/env bash
# Vercel project を用意（GitHub 連携 + Root Directory）してデプロイする。
#
#   vercel-deploy                             # メインの project（web + backend-py）を本番デプロイ
#   vercel-deploy --dry-run                   # 実行計画だけ出す
#   vercel-deploy --preview                   # preview デプロイ
#   vercel-deploy frontend/apps/lp            # 独立した別 project のフロントアプリ
#   vercel-deploy frontend/apps/lp --no-deploy      # project 作成 + env だけ（配信は git push に任せる）
#
# ── 2 つのモード（引数で決まる）──────────────────────────────────────────
#   services モード  : 引数なし（= リポジトリルート）。ルートの vercel.json の `services` が
#                      web(Next.js) と api(backend-py のコンテナ) を 1 つの project・同じドメインに
#                      載せる。project 側の Root Directory / framework は空（null）。
#                      https://vercel.com/docs/services
#   framework モード : frontend/apps/<name> を独立した別 project として出す（LP 等）。
#                      <app>/vercel.json の install/build がリポジトリルートへ戻れている必要がある
#                      （rootDirectory 配下に lockfile が無いため）。
#   ルートの vercel.json の service（frontend/apps/web / backend-py）を単独で出すことはできない。
#
# `scripts/infra/vercel.sh`（bootstrap の一部・メインの project を作る）とは役割が違う。
# こちらは **手で本番へ出す / アプリを後から足す**ための ad-hoc 経路で、config.env が
# 無くても動く（あれば APP_NAME / GH_REPO / VERCEL_TEAM_ID を既定値として拾う）。
# services モードの project 名は APP_NAME（bootstrap と同じ）なので、同じ project を指す。
#
# ── なぜ project 作成だけ REST API なのか ──────────────────────────────────
# `vercel project add` には **rootDirectory を指定・解除するフラグが無い**。framework モードでは
# 無いと、services モードでは残っていると、必ずビルドが壊れるので、作成と再保証は REST API を
# 直叩きする（`scripts/infra/vercel.sh` と同じ判断）。link / deploy は CLI の方が確実なので CLI を使う。
#
# ── GitHub 連携についての重要な制約（公式仕様）──────────────────────────
# git repository を紐付けられるのは **POST /v11/projects（作成時）だけ**。既存 project へ
# 後から repo を繋ぐ REST エンドポイントは公開されていない（PATCH /v9/projects にも
# gitRepository フィールドは無い）。よって「project は在るが repo 未接続」の場合、本 script は
# **dashboard での接続を促して止まる**（黙って進めない）。
# 前提として Vercel GitHub App が対象 repo に install 済みであること。
#
# ── 資格情報は Doppler が唯一のソース ──────────────────────────────────────
# Vercel の API トークンは **Doppler の bootstrap config の `VERCEL_TOKEN`**。devenv shell 進入時に
# loadDopplerByEnv が env へ載せるので、この script は何もせず拾える。
# （キー名は vercel CLI が読む名前そのもの = .claude/rules/env-naming.md §4。
#   Terraform provider だけ VERCEL_API_TOKEN を読むので scripts/infra/tf.sh が橋渡しする）
# Doppler が無い環境向けに VERCEL_TOKEN → `vercel login` 済み CLI の auth.json も見るが、
# それは最後の手段。**トークンを新規発行しない・値を出力しない**。
#
# ⚠️ secret は投入しない。`--env` で渡せるのは公開してよい非機密値だけ（詳細は
#    .claude/rules/env-naming.md）。runtime secret は Doppler→Vercel のネイティブ連携、
#    Supabase の値は Vercel Marketplace 連携が供給する。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/infra/lib.sh
. "$SCRIPT_DIR/lib.sh"
# shellcheck source=scripts/infra/vercel_lib.sh
. "$SCRIPT_DIR/vercel_lib.sh"

APP_DIR=""
PROJECT_NAME=""
GIT_REPO=""
FRAMEWORK=""
TEAM_ARG=""
URL_ENV_KEY="NEXT_PUBLIC_APP_URL"
# services（ルートの vercel.json）/ framework（frontend/apps/<name> の別 project）
MODE=""
HAS_CONTAINER=0
EXTRA_ENVS=()
DO_DEPLOY=1
DEPLOY_TARGET="production"
BUILD_CHECK=1
DRY_RUN=0

# 冒頭のコメントブロック（2 行目から最初の非コメント行まで）をそのまま説明に使う。
usage() {
  awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"
  cat <<'EOF'

Options:
  --project NAME       Vercel project 名
                       （既定: services = APP_NAME か repo 名 / framework = [APP_NAME-]<app ディレクトリ名>）
  --repo owner/repo    GitHub repo（既定: git remote origin から導出）
  --framework NAME     Vercel の framework preset（framework モードのみ。既定: package.json から判定。
                       none で無指定）。services モードでは常に none（service ごとに vercel.json が持つ）
  --team SLUG|ID       Vercel team（既定: VERCEL_TEAM_ID、無ければ自動解決）
  --env KEY=VALUE      非機密の env を production+preview に投入（複数可）
  --url-env-key KEY    本番 URL を入れる env のキー（既定: NEXT_PUBLIC_APP_URL / none で無効）
  --preview            preview デプロイ（既定は production）
  --no-deploy          project と env だけ用意し、デプロイしない
  --skip-build-check   デプロイ前のローカルビルド確認を省く
  --dry-run            何もせず計画だけ表示
EOF
}

# --env は「公開してよい非機密値」専用。予約 prefix と形式をここで弾く
# （dry-run でも気づけるよう、送信直前ではなく引数解析時に検査する）。
validate_env_pair() {
  local pair="$1" key="${1%%=*}"
  [ "$key" != "$pair" ] || die "--env は KEY=VALUE の形式で指定してください: $pair"
  case "$key" in
    VERCEL_*)
      die "'$key' は Vercel の system 予約 prefix です（.claude/rules/env-naming.md）" ;;
    SUPABASE_*)
      die "'$key' は Vercel Marketplace の Supabase 連携が自動注入します。手で入れないでください（.claude/rules/env-naming.md）" ;;
    [0-9]*)
      die "'$key' は数字始まりのため使えません" ;;
  esac
  case "$key" in
    *[!A-Za-z0-9_]*) die "'$key' に使えない文字が含まれています（英数字と _ のみ）" ;;
  esac
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -h|--help)          usage; exit 0 ;;
      --project)          PROJECT_NAME="${2:?--project に値が必要}"; shift 2 ;;
      --repo)             GIT_REPO="${2:?--repo に値が必要}"; shift 2 ;;
      --framework)        FRAMEWORK="${2:?--framework に値が必要}"; shift 2 ;;
      --team)             TEAM_ARG="${2:?--team に値が必要}"; shift 2 ;;
      --env)              validate_env_pair "${2:?--env に KEY=VALUE が必要}"; EXTRA_ENVS+=("$2"); shift 2 ;;
      --url-env-key)      URL_ENV_KEY="${2:?--url-env-key に値が必要}"; shift 2 ;;
      --preview)          DEPLOY_TARGET="preview"; shift ;;
      --no-deploy)        DO_DEPLOY=0; shift ;;
      --skip-build-check) BUILD_CHECK=0; shift ;;
      --dry-run)          DRY_RUN=1; shift ;;
      -*)                 die "未知のオプション: $1（--help 参照）" ;;
      *)                  [ -z "$APP_DIR" ] || die "アプリパスは 1 つだけ指定してください"; APP_DIR="$1"; shift ;;
    esac
  done
  APP_DIR="${APP_DIR:-.}"
  APP_DIR="${APP_DIR%/}"
  APP_DIR="${APP_DIR:-.}"
}

# ── 導出（推測ではなく、リポジトリの実ファイル / git remote から取る）────────
detect_repo() {
  [ -n "$GIT_REPO" ] && return 0
  [ -n "${GH_REPO:-}" ] && { GIT_REPO="$GH_REPO"; return 0; }
  local url
  url="$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || true)"
  [ -n "$url" ] || die "GitHub repo を特定できません（--repo owner/repo を指定してください）"
  # git@github.com:owner/repo.git / https://github.com/owner/repo(.git)
  GIT_REPO="$(printf '%s' "$url" | sed -E 's#^.*github\.com[:/]##; s#\.git$##')"
  case "$GIT_REPO" in
    */*) : ;;
    *)   die "origin が GitHub ではないようです（--repo owner/repo を指定してください）: $url" ;;
  esac
}

ROOT_VERCEL_JSON="$PROJECT_ROOT/vercel.json"

# ルートの vercel.json の services の root 一覧（リポジトリルート基準）
service_roots() {
  [ -f "$ROOT_VERCEL_JSON" ] || return 0
  jq -r '.services // {} | .[] | (.root // ".")' "$ROOT_VERCEL_JSON"
}

detect_mode() {
  if [ "$APP_DIR" = "." ]; then
    [ -f "$ROOT_VERCEL_JSON" ] \
      || die "リポジトリルートに vercel.json がありません（services の定義が正本です）"
    jq -e '(.services // {}) | length > 0' "$ROOT_VERCEL_JSON" >/dev/null 2>&1 \
      || die "ルートの vercel.json に services がありません"
    MODE="services"
    if jq -e '[.services[] | select(.runtime == "container")] | length > 0' \
        "$ROOT_VERCEL_JSON" >/dev/null 2>&1; then
      HAS_CONTAINER=1
    fi
    return 0
  fi

  # ルートの vercel.json の service を単独 project で出すと、同じコードが 2 つの project で
  # 別々にビルドされ、backend の URL も分かれる（services 構成の意味が無くなる）。
  local root
  while IFS= read -r root; do
    [ "$APP_DIR" = "${root%/}" ] && die "$(cat <<EOF
$APP_DIR はルートの vercel.json の service です（単独の project では出せません）。
  → 'vercel-deploy'（引数なし）でメインの project ごとデプロイしてください。
EOF
)"
  done < <(service_roots)
  MODE="framework"
}

detect_framework() {
  [ -n "$FRAMEWORK" ] && return 0
  # services モードでは project に framework を持たせない（service ごとに vercel.json が持つ）
  if [ "$MODE" = "services" ]; then FRAMEWORK="none"; return 0; fi
  local pkg="$PROJECT_ROOT/$APP_DIR/package.json"
  if [ -f "$pkg" ] && jq -e '.dependencies.next // .devDependencies.next' "$pkg" >/dev/null 2>&1; then
    FRAMEWORK="nextjs"
  else
    FRAMEWORK="none"
  fi
}

detect_project_name() {
  [ -n "$PROJECT_NAME" ] && return 0
  if [ "$MODE" = "services" ]; then
    # bootstrap（scripts/infra/vercel.sh）と同じ名前。揃えないと別の project ができる。
    PROJECT_NAME="${APP_NAME:-${GIT_REPO##*/}}"
    return 0
  fi
  local base; base="$(basename "$APP_DIR")"
  # config.env の APP_NAME があれば prefix にする（myapp-lp）。
  if [ -n "${APP_NAME:-}" ] && [ "$base" != "$APP_NAME" ]; then
    PROJECT_NAME="${APP_NAME}-${base}"
  else
    PROJECT_NAME="$base"
  fi
}

# framework service の install / build は **service root から lockfile のある workspace ルートへ
# 戻れていないと**必ずビルドが落ちる（service root 配下には lockfile も turbo.json も無い）。
# 判定は「installCommand の `cd <dir>` の行き先に lockfile があるか」で行う（深さを決め打ちしない）。
check_framework_service() {
  local name="$1" root="$2" install="$3" dest
  [ -d "$PROJECT_ROOT/$root" ] || die "services.${name}.root のディレクトリがありません: $root"
  dest="$(printf '%s' "$install" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:]&;]+).*/\1/p')"
  if [ -n "$dest" ] && [ -f "$PROJECT_ROOT/$root/$dest/bun.lock" ]; then
    ok "service '${name}': ${root}（framework / install は ${root}/${dest} から）"
  else
    warn "services.${name}.installCommand が lockfile のある workspace ルートへ戻っていません（ビルドが落ちる可能性）: ${install}"
  fi
}

# container service の前提を、Vercel へ 1 件も送る前に検査する。
# ここは **公開 JSON schema に無い制約**なので、`vercel.json` が schema 的に妥当でも通らない:
#   - entrypoint の basename は blessed 名 4 つのみ
#     （vercel/vercel の fs-detectors/src/services/resolve-v2.ts:
#      CONTAINER_ENTRYPOINT_CANDIDATES。接尾辞つきは never matched）
#   - ビルドコンテキストは常に dirname(Dockerfile)
#     （vercel/vercel の packages/container/src/index.ts: contextDir = path.dirname(...)）
#     → uv workspace は全 member の pyproject が要るので Dockerfile は workspace ルート必須
# 詳細: docs/_research/2026-08-22-vercel-services-container-build-context.md
check_container_service() {
  local name="$1" root="$2" entry="$3" dockerfile context
  local blessed="Dockerfile.vercel Containerfile.vercel Dockerfile Containerfile"

  [ -n "$entry" ] && [ "$entry" != "-" ] || die "services.${name} に entrypoint がありません（Dockerfile のパス）"
  dockerfile="$PROJECT_ROOT/${root}/$entry"
  # ./ を潰して表示・比較を安定させる
  dockerfile="$(cd "$(dirname "$dockerfile")" 2>/dev/null && pwd)/$(basename "$entry")" \
    || die "services.${name}.entrypoint のディレクトリが見つかりません: ${root}/$entry"
  case " $blessed " in
    *" $(basename "$entry") "*) : ;;
    *) die "services.${name}.entrypoint '${entry}' のファイル名は Vercel が受け付けません（使えるのは: ${blessed}）" ;;
  esac
  [ -f "$dockerfile" ] || die "services.${name}.entrypoint が指す ${dockerfile#"$PROJECT_ROOT"/} がありません"
  context="$(cd "$(dirname "$dockerfile")" && pwd)"
  if [ -f "$PROJECT_ROOT/$root/uv.lock" ] && [ ! -f "$context/uv.lock" ]; then
    die "$(cat <<EOF
services.${name} のビルドコンテキストは ${context#"$PROJECT_ROOT"/} になりますが、そこに uv.lock がありません。
Vercel はビルドコンテキストを **Dockerfile が置かれているディレクトリ**に固定します（root では変えられません）。
uv workspace のビルドには全 member の pyproject.toml が要るので、Dockerfile を
${root}/ 直下へ移し、entrypoint をその blessed 名にしてください。
EOF
)"
  fi
  [ -f "$context/.dockerignore" ] \
    || warn "${context#"$PROJECT_ROOT"/} に .dockerignore がありません（docker は <コンテキスト>/.dockerignore しか読みません）"
  ok "service '${name}': ${dockerfile#"$PROJECT_ROOT"/}（container / context=${context#"$PROJECT_ROOT"/}）"
}

# service は既定で非公開。top-level rewrite が無いと、デプロイは成功しても 404 になる。
require_services_vercel_json() {
  local name runtime root entry install
  while IFS=$'\t' read -r name runtime root entry install; do
    [ -n "$name" ] || continue
    jq -e --arg n "$name" '[.rewrites // [] | .[] | select(.destination.service == $n)] | length > 0' \
      "$ROOT_VERCEL_JSON" >/dev/null 2>&1 \
      || die "services.${name} を指す top-level rewrite がありません。service は既定で非公開なので、無いとデプロイは成功しても 404 になります。"
    if [ "$runtime" = "container" ]; then
      check_container_service "$name" "$root" "$entry"
    else
      check_framework_service "$name" "$root" "$install"
    fi
  done < <(jq -r '.services | to_entries[]
                  | [.key, (.value.runtime // "-"), (.value.root // "."),
                     (.value.entrypoint // "-"), (.value.installCommand // "-")] | @tsv' "$ROOT_VERCEL_JSON")

  # rewrite は先勝ち。catch-all が末尾に無いと、後ろのルールが死ぬか、どこにも届かないパスが出る。
  [ "$(jq -r '.rewrites[-1].source // ""' "$ROOT_VERCEL_JSON")" = "/(.*)" ] \
    || warn "rewrites の末尾が catch-all（/(.*)）ではありません。先勝ちなので順序を確認してください。"
}

# モノレポでは vercel.json の buildCommand / installCommand が
# **リポジトリルートまで戻れていないと必ずビルドが落ちる**（rootDirectory 配下には
# lockfile も turbo.json も無い）。作る前に落とすのではなく、ここで落とす。
require_app_vercel_json() {
  local f="$PROJECT_ROOT/$APP_DIR/vercel.json"
  if [ "$MODE" = "services" ]; then require_services_vercel_json; return 0; fi
  [ -f "$f" ] || die "$(cat <<EOF
$APP_DIR/vercel.json がありません。モノレポでは必須です（rootDirectory 配下には
bun.lock も turbo.json も無いので、install / build をルートへ戻す必要がある）。
下記を $APP_DIR/vercel.json に置いてから再実行してください:

{
  "\$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": $([ "$FRAMEWORK" = none ] && echo null || echo "\"$FRAMEWORK\""),
  "buildCommand": "cd ../.. && turbo build --filter=<package-name>",
  "installCommand": "cd ../.. && bun install",
  "outputDirectory": ".next"
}
EOF
)"
  jq -e '.installCommand // "" | test("cd \\.\\./\\.\\.")' "$f" >/dev/null 2>&1 \
    || warn "$APP_DIR/vercel.json の installCommand がリポジトリルートへ戻っていません（ビルドが落ちる可能性）"
}

# ── Vercel 側の操作 ──────────────────────────────────────────────────────
# project の rootDirectory / framework。services モードはどちらも null（vercel.json が持つ）。
project_settings_json() {
  if [ "$MODE" = "services" ]; then
    printf '%s' '{"rootDirectory":null,"framework":null}'
    return 0
  fi
  local fw_json
  [ "$FRAMEWORK" = "none" ] && fw_json="null" || fw_json="\"$FRAMEWORK\""
  jq -n --arg root "$APP_DIR" --argjson fw "$fw_json" '{rootDirectory:$root, framework:$fw}'
}

root_directory_label() {
  [ "$MODE" = "services" ] && printf '（リポジトリルート）' || printf '%s' "$APP_DIR"
}

ensure_project() {
  local existing
  if existing="$(vercel_project_json "$PROJECT_NAME")"; then
    ok "Vercel project '$PROJECT_NAME' は存在"
    local linked_repo
    linked_repo="$(printf '%s' "$existing" | jq -r '.link.repo // empty')"
    if [ -z "$linked_repo" ]; then
      die "$(cat <<EOF
project '$PROJECT_NAME' は存在しますが GitHub repo に接続されていません。
**既存 project へ repo を後付けする REST API は公開されていない**ため、この script では繋げません。
  → Vercel dashboard の Project > Settings > Git > Connect Git Repository で '$GIT_REPO' を接続
  → または別名で作り直す（--project <別名>）
EOF
)"
    fi
    ok "GitHub 連携: ${linked_repo}"
    # rootDirectory を冪等に再保証（dashboard で触られていても戻す）。
    # services モードは null（= リポジトリルート）でないとルートの vercel.json が読まれない。
    vapi PATCH "/v9/projects/${PROJECT_NAME}" "$(project_settings_json)" >/dev/null \
      || die "rootDirectory の更新に失敗"
    ok "rootDirectory=$(root_directory_label) を再保証"
    return 0
  fi

  log "Vercel project '$PROJECT_NAME' を作成（repo=${GIT_REPO} / root=$(root_directory_label) / framework=${FRAMEWORK}）..."
  local body
  body="$(project_settings_json \
    | jq --arg name "$PROJECT_NAME" --arg repo "$GIT_REPO" \
      '. + {name:$name, gitRepository:{type:"github", repo:$repo}}')"
  vapi POST "/v11/projects" "$body" >/dev/null \
    || die "project 作成に失敗。Vercel GitHub App が '$GIT_REPO' に install 済みか、project 名が重複していないかを確認してください。"
  ok "作成: $PROJECT_NAME"
}

# 本番 URL は **推測せず実測する**（canonical / sitemap / OG に焼き込まれるため、
# ここを間違えると本番の SEO とリンクが壊れる）。
push_envs() {
  local domain="$1" e key value type
  if [ "$URL_ENV_KEY" != "none" ]; then
    vercel_env_put "$PROJECT_NAME" "$URL_ENV_KEY" "https://${domain}" "plain"
  fi
  for e in ${EXTRA_ENVS[@]+"${EXTRA_ENVS[@]}"}; do
    key="${e%%=*}"; value="${e#*=}"
    # NEXT_PUBLIC_* はバンドルに出る公開値なので plain（dashboard で読める方が運用しやすい）
    case "$key" in NEXT_PUBLIC_*) type="plain" ;; *) type="encrypted" ;; esac
    vercel_env_put "$PROJECT_NAME" "$key" "$value" "$type"
  done
}

vercel_cli() {
  if have vercel; then vercel "$@"; else bunx vercel "$@"; fi
}

# `vercel link` は .gitignore に `.vercel` を追記する。本リポジトリは既に `**/.vercel/` を
# 無視しているので**重複した差分が出るだけ**。リンク前後で比べて、増えていたら元に戻す。
link_and_deploy() {
  local gitignore="$PROJECT_ROOT/.gitignore" snapshot=""
  [ -f "$gitignore" ] && snapshot="$(cat "$gitignore")"

  # リポジトリルートで link する。services モードは vercel.json がルートにあり、
  # framework モードも install/build がルートへ戻るので、アップロード起点はどちらもルート。
  log "vercel link（リポジトリルート → project '$PROJECT_NAME'）..."
  ( cd "$PROJECT_ROOT" && vercel_cli link --yes --project "$PROJECT_NAME" --scope "$VERCEL_TEAM_SLUG" ) \
    || die "vercel link に失敗"

  if [ -n "$snapshot" ] && [ "$snapshot" != "$(cat "$gitignore")" ]; then
    printf '%s\n' "$snapshot" > "$gitignore"
    ok ".gitignore への .vercel 追記を戻した（'**/.vercel/' で既に無視済み）"
  fi

  [ "$DO_DEPLOY" -eq 1 ] || { ok "--no-deploy 指定のためデプロイは行いません（git push で配信されます）"; return 0; }

  # --archive=tgz: モノレポ全体をアップロードするとファイル数が Vercel の上限
  # （`files` should NOT have more than 15000 items）を超える。公式の回避策がこれ。
  local flags=(deploy --yes --archive=tgz)
  [ "$DEPLOY_TARGET" = "production" ] && flags+=(--prod)
  log "vercel ${flags[*]}（${DEPLOY_TARGET}）..."
  ( cd "$PROJECT_ROOT" && vercel_cli "${flags[@]}" --scope "$VERCEL_TEAM_SLUG" ) \
    || die "デプロイに失敗（ビルドログは 'vercel logs' / dashboard で確認）"
}

verify() {
  local url="https://$1" code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 "$url" || true)"
  case "$code" in
    2*|3*) ok "疎通確認 ${url} → HTTP ${code}" ;;
    401)   warn "疎通確認 ${url} → HTTP 401（Deployment Protection が有効な可能性。dashboard を確認）" ;;
    *)     warn "疎通確認 ${url} → HTTP ${code:-（応答なし）}。反映待ちか、ビルド失敗の可能性があります。" ;;
  esac
}

main() {
  parse_args "$@"

  require_tool curl
  require_tool jq
  require_tool git
  load_config_if_present
  [ -n "$TEAM_ARG" ] && VERCEL_TEAM_ID="$TEAM_ARG"

  [ -d "$PROJECT_ROOT/$APP_DIR" ] || die "アプリディレクトリがありません: $APP_DIR"
  detect_repo
  detect_mode
  detect_framework
  detect_project_name
  require_app_vercel_json

  printf '\n'
  log "app       : $([ "$MODE" = services ] && echo 'リポジトリルート（vercel.json の services）' || echo "$APP_DIR")"
  log "mode      : $MODE"
  log "project   : $PROJECT_NAME"
  log "repo      : $GIT_REPO"
  log "framework : $FRAMEWORK"
  log "deploy    : $([ "$DO_DEPLOY" -eq 1 ] && echo "$DEPLOY_TARGET" || echo 'なし（--no-deploy）')"
  printf '\n'

  if [ "$DRY_RUN" -eq 1 ]; then
    ok "--dry-run のためここで終了（Vercel へのリクエストは 1 件も送っていません）"
    return 0
  fi

  vercel_token_autoload
  vercel_resolve_team

  # デプロイ枠とビルド時間を無駄にしないよう、先にローカルで通しておく。
  if [ "$DO_DEPLOY" -eq 1 ] && [ "$BUILD_CHECK" -eq 1 ]; then
    local check checks=(build-frontend)
    # container service はイメージを焼かないと検証できない。代わりに backend のテスト
    # （コンテナ設定とルーティングの静的検査を含む）を通す。
    [ "$HAS_CONTAINER" -eq 1 ] && checks+=(test-backend-py)
    for check in "${checks[@]}"; do
      have "$check" \
        || die "'$check' が PATH にありません。devenv shell 内（または 'devenv shell -- vercel-deploy ...'）で実行するか --skip-build-check を付けてください。"
      log "ローカル確認（$check）..."
      "$check" || die "ローカル確認（$check）が失敗しました。直してから再実行してください。"
    done
    ok "ローカル確認 OK"
    if [ "$HAS_CONTAINER" -eq 1 ]; then
      warn "イメージ自体は未検証です。Vercel と同条件で焼くなら: docker build -f <Dockerfile> <その Dockerfile のあるディレクトリ>"
    fi
  fi

  ensure_project

  local domain; domain="$(vercel_production_domain "$PROJECT_NAME")"
  ok "本番ドメイン: ${domain}"
  push_envs "$domain"
  # container は Vercel 既定の 80 へ流される。Dockerfile の PORT と揃えないと
  # デプロイは成功するのに 502 になる（非 root なので 80 は bind できない）。
  if [ "$HAS_CONTAINER" -eq 1 ]; then push_container_port "$PROJECT_NAME" "$PROJECT_ROOT"; fi

  record_output "VERCEL_PROJECT_${PROJECT_NAME//-/_}" "$PROJECT_NAME"
  record_output "VERCEL_URL_${PROJECT_NAME//-/_}" "https://${domain}"

  link_and_deploy
  if [ "$DO_DEPLOY" -eq 1 ] && [ "$DEPLOY_TARGET" = "production" ]; then
    verify "$domain"
  fi

  printf '\n'
  ok "完了: https://${domain}"
  warn "runtime secret は Doppler→Vercel 連携、Supabase の値は Vercel Marketplace 連携で供給する（手で入れない）。"
}

main "$@"
