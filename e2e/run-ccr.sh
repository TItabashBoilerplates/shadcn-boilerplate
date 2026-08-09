#!/usr/bin/env bash
# ==============================================================================
# run-ccr.sh — CCR / web-sandbox E2E orchestrator
#
#   Drives the web app through Playwright + the prebaked Chromium against the
#   local Supabase stack. Invoked by the devenv script `e2e-web-ccr`.
#
#   Why not Maestro (the repo's default E2E)? In the CCR web sandbox Maestro has
#   no runnable target: `maestro test web/` reports "0 devices" (no browser
#   device in the Nix package) and mobile needs an emulator that isn't present.
#   Playwright + /opt/pw-browsers/chromium is the reliable driver here.
#
#   Steps: ensure Supabase -> derive keys -> ensure web (next dev) -> install
#   e2e deps -> run the OTP-login spec -> tear down anything we started.
# ==============================================================================
set -euo pipefail

ROOT="${DEVENV_ROOT:-$(git rev-parse --show-toplevel)}"
E2E_DIR="$ROOT/e2e"
SHOT_DIR="$ROOT/e2e-results/ccr"
WEB_LOG="$SHOT_DIR/web.log"
WEB_STARTED=0
WEB_PID=""

log() { printf '\033[1;34m[e2e-ccr]\033[0m %s\n' "$*"; }
mkdir -p "$SHOT_DIR"

cleanup() {
  if [ "$WEB_STARTED" = 1 ] && [ -n "$WEB_PID" ]; then
    log "stopping web dev server (pid $WEB_PID) we started"
    kill "$WEB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# 1. Supabase up? (start via the repo script if not)
if ! curl -sf -o /dev/null "http://127.0.0.1:54321/rest/v1/" 2>/dev/null; then
  log "Supabase not reachable -> supabase-start"
  supabase-start
fi

# 2. Derive keys from the running stack (local dev flow; keys are deterministic)
eval "$(supabase status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY|MAILPIT_URL)=')"
export SUPABASE_URL="${API_URL:-http://127.0.0.1:54321}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:?could not read SERVICE_ROLE_KEY from supabase status}"
export MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:54324}"

# 3. Web up? Do NOT pass `-H`.
#    Next.js 16.3 + next-intl: binding the dev/prod server to an explicit host
#    (`-H 127.0.0.1`) makes next-intl's middleware answer every page with a 307
#    to the very same path (`/login` -> `/login`, setting NEXT_LOCALE), i.e. an
#    infinite redirect loop -> the browser aborts with ERR_TOO_MANY_REDIRECTS.
#    Without `-H` the server still listens on 127.0.0.1 (verified: /login 200 on
#    both 127.0.0.1 and localhost), so the old "$HOSTNAME is vm" workaround is
#    no longer needed and is now actively harmful.
if ! curl -sf -o /dev/null "http://127.0.0.1:3000/login" 2>/dev/null; then
  log "web not reachable -> starting next dev on port 3000"
  ( cd "$ROOT/frontend/apps/web" && exec bun run dev -- -p 3000 ) > "$WEB_LOG" 2>&1 &
  WEB_PID=$!
  WEB_STARTED=1
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "http://127.0.0.1:3000/login" 2>/dev/null && break
    sleep 3
  done
  curl -sf -o /dev/null "http://127.0.0.1:3000/login" 2>/dev/null \
    || { log "web did not become ready (see $WEB_LOG)"; exit 1; }
  log "web ready"
fi

# 4. e2e deps (standalone, not in the Bun workspace)
if [ ! -d "$E2E_DIR/node_modules" ]; then
  log "installing e2e deps (playwright-core)"
  ( cd "$E2E_DIR" && bun install )
fi

# 5. Run the spec against the prebaked Chromium
export WEB_BASE="http://127.0.0.1:3000"
export CHROME_BIN="${CHROME_BIN:-/opt/pw-browsers/chromium}"
export SHOT_DIR
log "running OTP-login spec (screenshots -> $SHOT_DIR)"
set +e
( cd "$E2E_DIR" && node otp-login.ce2e.js )
RC=$?
set -e
[ "$RC" = 0 ] && log "E2E PASSED" || log "E2E FAILED (rc=$RC)"
exit "$RC"
