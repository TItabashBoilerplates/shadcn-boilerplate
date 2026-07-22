// CCR / web-sandbox E2E: Web OTP login against local Supabase, driven by
// Playwright + the prebaked Chromium. Mirrors .maestro/web/auth/login-flow.yaml
// (create user -> request OTP -> read code from Mailpit -> verify -> Dashboard).
//
// Maestro can't run here (no browser "device" for web / no emulator for mobile),
// so this drives the real web app through Chromium instead. See ./README.md.
//
// Env (all provided by run-ccr.sh):
//   WEB_BASE                     default http://127.0.0.1:3000
//   SUPABASE_URL                 default http://127.0.0.1:54321
//   SUPABASE_SERVICE_ROLE_KEY    required (admin createUser / cleanup)
//   MAILPIT_URL                  default http://127.0.0.1:54324
//   CHROME_BIN                   default /opt/pw-browsers/chromium
//   SHOT_DIR                     screenshot output dir (default ./)
const { chromium } = require("playwright-core");

const BASE = process.env.WEB_BASE || "http://127.0.0.1:3000";
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAILPIT = process.env.MAILPIT_URL || "http://127.0.0.1:54324";
const CHROME = process.env.CHROME_BIN || "/opt/pw-browsers/chromium";
const SHOT = process.env.SHOT_DIR || ".";

const email = `e2e_${Date.now()}@test.local`;
const password = "TestPass123!";
const log = (...a) => console.log("[e2e]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`admin createUser failed ${res.status}: ${await res.text()}`);
  }
  const user = await res.json();
  log("created user", user.id, email);
  return user.id;
}

async function getOtpFromMailpit(toEmail, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/messages`);
    if (res.ok) {
      const { messages = [] } = await res.json();
      const msg = messages.find((m) =>
        (m.To || []).some((t) => (t.Address || "").toLowerCase() === toEmail.toLowerCase()),
      );
      if (msg) {
        const detail = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
        const body = `${detail.Text || ""}\n${detail.HTML || ""}`;
        const match = body.match(/\b(\d{6})\b/);
        if (match) {
          log("OTP from Mailpit:", match[1]);
          return match[1];
        }
      }
    }
    await sleep(1000);
  }
  throw new Error("OTP email not found in Mailpit");
}

async function deleteUser(id) {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
    });
    log("cleaned up user", id);
  } catch (e) {
    log("cleanup failed (non-fatal):", e.message);
  }
}

async function main() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  }
  const userId = await createUser();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  let ok = false;
  try {
    log("goto login");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: `${SHOT}/01-login.png` });

    const emailInput = page
      .locator('#email, input[type="email"], input[name="email"]')
      .first();
    await emailInput.waitFor({ state: "visible", timeout: 15000 });
    await emailInput.fill(email);
    log("filled email");

    await page
      .getByRole("button", { name: /send one-?time password|send code|otp/i })
      .first()
      .click();
    log("clicked send OTP");

    await page
      .getByRole("heading", { name: /check your email/i })
      .waitFor({ state: "visible", timeout: 15000 });
    await page.screenshot({ path: `${SHOT}/02-check-email.png` });
    log("saw 'Check Your Email'");

    const otp = await getOtpFromMailpit(email);

    await page.goto(`${BASE}/verify?email=${encodeURIComponent(email)}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page
      .getByRole("heading", { name: /verify your email/i })
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() =>
        page.getByText(/6-digit/i).first().waitFor({ state: "visible", timeout: 10000 }),
      );
    await page.screenshot({ path: `${SHOT}/03-verify.png` });

    const tokenInput = page
      .locator('#token, input[name="token"], input[autocomplete="one-time-code"], input[data-input-otp]')
      .first();
    if (await tokenInput.count()) {
      await tokenInput.click();
      await tokenInput.fill(otp).catch(() => page.keyboard.type(otp));
    } else {
      await page.locator('[data-input-otp-slot], [role="textbox"], input').first().click();
      await page.keyboard.type(otp);
    }
    log("entered OTP");

    await page
      .getByRole("button", { name: /verify( code)?/i })
      .first()
      .click()
      .catch(() => {});
    log("clicked verify");

    await Promise.race([
      page.waitForURL(/dashboard/i, { timeout: 20000 }),
      page.getByText(/dashboard/i).first().waitFor({ state: "visible", timeout: 20000 }),
    ]);
    await page.screenshot({ path: `${SHOT}/04-dashboard.png` });
    log("SUCCESS: reached authenticated area. URL =", page.url());
    ok = true;
  } catch (e) {
    log("FAILURE:", e.message);
    await page.screenshot({ path: `${SHOT}/99-failure.png` }).catch(() => {});
    const inv = await page
      .evaluate(() => ({
        url: location.href,
        inputs: [...document.querySelectorAll("input")].map((i) => ({
          id: i.id,
          name: i.name,
          type: i.type,
        })),
        buttons: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).slice(0, 20),
        headings: [...document.querySelectorAll("h1,h2,h3")].map((x) => x.textContent.trim()).slice(0, 10),
      }))
      .catch(() => null);
    log("page-inventory:", JSON.stringify(inv));
  } finally {
    await browser.close();
    await deleteUser(userId);
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("[e2e] fatal:", e);
  process.exit(1);
});
