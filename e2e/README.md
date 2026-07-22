# E2E (CCR / web-sandbox)

Playwright-based E2E for the **Claude Code on the web (CCR)** sandbox, where the
repo's default Maestro E2E can't run.

## Why not Maestro here?

`.maestro/` is the canonical E2E suite (`e2e` / `e2e-web` / `e2e-mobile`). In the
CCR web sandbox it has no runnable target:

- `maestro test web/` → **`0 devices connected`** — the Nix `maestro` package has
  no browser device to drive.
- `maestro test mobile/` → needs an Android emulator / iOS simulator, which the
  Linux headless sandbox doesn't provide.

So this harness drives the **real web app** through the **prebaked Chromium**
(`/opt/pw-browsers/chromium`) with `playwright-core`, against the **real local
Supabase** stack (Auth + Mailpit). It reuses the same flow as
`.maestro/web/auth/login-flow.yaml`.

This directory is intentionally **outside the Bun workspace** and **excluded from
the frontend Biome toolchain** — it is standalone sandbox tooling with its own
runtime (Node + `playwright-core`), mirroring how `scripts/claude-code-web-setup.sh`
is CCR-specific.

## Run

```bash
e2e-web-ccr        # devenv script: ensures Supabase + web, then runs the spec
```

`run-ccr.sh` orchestrates everything:

1. starts Supabase (`supabase-start`) if `:54321` isn't up,
2. reads the local keys from `supabase status`,
3. starts `next dev` on `127.0.0.1:3000` if the web app isn't up
   (pinning `-H 127.0.0.1` because Next uses `$HOSTNAME` = `vm` otherwise),
4. `bun install`s `playwright-core` on first run,
5. runs `otp-login.ce2e.js` and tears down anything it started.

Screenshots and the web log are written to `e2e-results/ccr/` (git-ignored).

## What the spec covers

`otp-login.ce2e.js` — full OTP login:
create test user (Supabase Admin API) → `/login` → request OTP →
read the 6-digit code from Mailpit → `/verify` → assert redirect to `/dashboard`
→ delete the test user.
