# Project Guidelines

Full-stack application boilerplate with multi-platform frontend and backend services.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend (Web)** | Next.js 16, React 19, TypeScript, Bun |
| **Frontend (Mobile)** | Expo 55, React Native, TypeScript |
| **UI (Web)** | shadcn/ui, Radix UI, TailwindCSS 4 |
| **UI (Mobile)** | gluestack-ui, NativeWind 5, TailwindCSS 4 |
| **State** | TanStack Query (server), Zustand (global) |
| **Architecture** | Feature Sliced Design (FSD) |
| **i18n** | next-intl (en, ja) |
| **Backend** | FastAPI (Python), Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL, Drizzle ORM, pgvector |
| **Auth** | Supabase Auth |

## Commands (MANDATORY)

**ALWAYS use devenv commands** (scripts on PATH or `devenv tasks run`) for development. Direct tool execution is prohibited. Makefile はもう存在しません。

```bash
# Setup
# 不要 — `devenv shell` 進入 (direnv 経由含む) で setup:* タスクが自動実行:
#   - secrets コピー / bun install (frontend, drizzle) / uv sync (backend-py)

# Services（軽量 default = supabase + backend + storybook）
devenv up              # 軽量セット起動 (TUI 付き)
dev-web                # 軽量 + Next.js (web)
dev-mobile             # 軽量 + Expo Metro (mobile, non-interactive)
dev-all                # 全部入り
devenv up backend web  # 任意組み合わせ
stop                   # devenv プロセス + Supabase 全停止

# Devenv 外（対話的 TUI 必要時）
frontend               # turbo dev (web + mobile 並列、重い)
mobile-ios / mobile-android / mobile-web   # Expo TUI を別ターミナルで

# Quality
lint                   # Lint all (auto-fix)
format                 # Format all
format-check           # Format check (CI)
type-check             # Type check all
ci-check               # CI gate (lint + format-check + type-check)

# Tests
test-db                # pgTAP DB tests
e2e / e2e-web / e2e-mobile

# Database (user approval required)
devenv tasks run app:migrate-dev   # Generate + apply migration + types (recommended)
devenv tasks run db:migrate-dev    # Migration only
devenv tasks run model:build       # Regenerate types only

# Remote migration: GitHub Actions (migrate.yml) is the canonical path
gh workflow run migrate.yml --ref main -f environment=production

# Profile switching for remote ops (local invocation — emergency only)
#   MUST prefix ENV=. The base enterShell does `export ENV="${ENV:-local}"`, so `-P` alone
#   leaves ENV=local and the task picks up env/*/.env.local (local POSTGRES_URL).
ENV=staging    devenv tasks run -P staging    db:migrate-deploy
ENV=production devenv tasks run -P production deploy:functions
```

**NEVER execute tools directly**:

```bash
# WRONG
cd frontend && bun run biome check --write
npx tsc --noEmit
make lint           # ❌ Makefile は削除済み

# CORRECT
lint-frontend
type-check-frontend
```

---

## Core Policies (NON-NEGOTIABLE)

### 1. Research-First Development & Design-Time Verification

**Before implementation, you MUST**:

1. Use **Context7 MCP** to fetch latest documentation
2. Use **WebSearch** to verify current best practices
3. Use **WebFetch** to read official documentation directly

**NEVER**:
- Make assumptions based on memory or general knowledge
- Use outdated patterns without verification
- Guess API signatures or parameter types

#### 設計フェーズ（実装より前）で必須のこと

**設計を書き始める前に、その設計で使うツール・API・パッケージ・サービスの一次情報を実際に読む。**
canonical rule: `.claude/rules/design-research.md`

1. **該当 Skill を先に起動する**（DB なら `supabase-postgres-best-practices` / `rls` / `drizzle`、
   配置なら `fsd` / `feature-sliced-design` / `monorepo`、UI なら `ui-ux-pro-max` ほか）。
2. **実際に入っているバージョンを確認する**（`bun info` / `bun outdated` / `package.json` /
   `uv tree` / `deno.json`）。ドキュメントはバージョンごとに違う。
3. **そのバージョンの一次情報を読む**。Context7 は
   `mcp__context7__resolve-library-id` → `mcp__context7__query-docs`
   （**`get-library-docs` は存在しない**。1 呼び出し 1 トピック、同一の問いに 3 回まで）。
   Supabase は `mcp__supabase__search_docs`。載っていなければ WebFetch で公式サイトを直接読む。
4. **型定義・スキーマを実物で確認する**（`*.d.ts` / OpenAPI / `supabase gen types`）。
5. 埋めるべき項目: **API シグネチャ / 設定ファイル形式 / 非推奨・破壊的変更 / 制限値・クォータ /
   料金体系 / 前提プラン・前提設定 / ライセンス / 認証と鍵の扱い**。
6. **デザインパターン・アーキテクチャ・DB 設計もベストプラクティスを調査してから決める。**
   DB は「テーブル定義」で終わらせず、**制約は DB 側 / `timestamptz` で UTC / RLS はテーブルと同時 /
   ポリシー列とソートキーに index / ページングの tiebreaker / 削除カスケード / テナント境界 /
   監査・使用量の集計軸**まで設計する（集計軸は後から足しても過去行が埋まらない）。
7. 調査結果は `docs/_research/YYYY-MM-DD-<topic>.md`、設計と選定理由・出典は `docs/designs/` に残す。

#### 乖離を見つけたら、必ずユーザーに確認する（勝手に解消しない）

次の 4 類型はいずれも「**意図的な逸脱なのか、単なる記載ミスなのか**」をユーザーに聞く。
**黙って設計書に合わせるのも、黙って自分の設計に差し替えるのも違反。**

| 類型 | 内容 |
|---|---|
| A | 設計書 × 一次情報（公式仕様上できない / 非推奨 / 制限超過） |
| B | 設計書 × ベストプラクティス（動くが既知の落とし穴を踏む） |
| C | 設計書 × 本リポジトリのルール・既存の技術選定 |
| D | 実装 × 設計書（設計書に無い実装 / 設計書にあるのに無い実装） |

確認には **①該当箇所 ②事実 ③出典 URL とバージョン ④影響 ⑤選択肢と推奨** の 5 点を必ず添える。

**後戻りできない論点**（DB スキーマ・集計軸・API 契約・認証方式・課金と単価・URL 設計・
テナント境界・Storage パス）と**セキュリティ / 個人情報 / 決済 / ストア審査**に関わる乖離は、
**回答が来るまでその部分に着手しない**。巻き戻せる論点は仮定を明記して進め、まとめて報告する。
意図的だと回答されたら、その判断を受け入れて理由を記録し、同じ指摘を繰り返さない。

### 2. Test-Driven Development (TDD)

**MANDATORY workflow**:

1. **Write Tests First**: Define expected inputs/outputs before implementation
2. **Run Tests and Confirm Failure**: Verify tests fail (Red phase)
3. **Implement to Pass Tests**: Write minimal code (Green phase)
4. **Refactor if Needed**: Keep tests green

**All Green Policy**: Work MUST end with all tests passing (`ci-check` に加えて関連テストを実行)。

**NEVER**:
- Write implementation code before tests
- Modify tests to make them pass
- Leave failing tests at end of work

### 3. Supabase-First Architecture

**Priority order**:
1. **First**: `supabase-js` / `@supabase/ssr` from frontend
2. **Second**: Edge Functions (if necessary)
3. **Last Resort**: `backend-py` (only when required)

**Use backend-py ONLY for**:
- Complex database transactions
- AI/ML processing (LangChain, embeddings)
- Long-running background jobs
- Python-specific library requirements

### 4. Auto-Generated Files (DO NOT EDIT)

**NEVER manually edit**:
- `frontend/packages/types/schema.ts`
- `supabase/functions/shared/types/supabase/schema.ts`
- `backend-py/apps/api/src/api/domain/entity/models.py`

**Correct workflow**: Edit `drizzle/schema/*.ts` → run `devenv tasks run app:migrate-dev`

### 5. Internationalization (i18n)

**ALL user-facing text MUST be internationalized**:

```typescript
// WRONG
<Button>Save</Button>

// CORRECT
<Button>{t('common.save')}</Button>
```

Both `en.json` and `ja.json` are required.

### 6. DateTime Handling

| Layer | Timezone | Format |
|-------|----------|--------|
| **Database** | UTC | `TIMESTAMP WITH TIME ZONE` |
| **API** | UTC | ISO 8601 string |
| **Frontend** | Convert UTC ⇔ Local | `toISOString()` / `Intl.DateTimeFormat` |

**Frontend is responsible for all timezone conversions**.

### 7. Secrets & Environment Variable Naming

**NEVER register keys with a `GITHUB_`, `SUPABASE_`, or `VERCEL_` prefix in Doppler** (nor in
GitHub Actions / Vercel / Supabase secrets). Each platform reserves that namespace, so Doppler's
native sync fails with a reserved-value error and **the whole config stops syncing**.

| Prefix | Reserved by | What happens |
|---|---|---|
| `GITHUB_` | GitHub Actions secrets | "Must not start with the `GITHUB_` prefix" |
| `SUPABASE_` | Supabase Edge Function secrets | "Env name cannot start with SUPABASE_" |
| `VERCEL_` | Vercel System Environment Variables | Collides with system-injected `VERCEL_*` |

**Supabase env vars are NOT managed in Doppler.** They are delivered by the platforms:

- **Vercel (web / backend)** → the **Vercel Marketplace Supabase integration** (*Settings >
  Integrations > Supabase > Connect Account*) auto-injects `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `POSTGRES_*`.
- **Edge Functions** → Supabase platform provides them as **default secrets**.
- **Local** → `env/{backend,frontend}/.env.local` (files, not synced — prefix rule does not apply).

So "the app needs a Supabase value" is **never** a reason to create a Doppler key. Duplicating
those keys in Doppler is prohibited (breaks sync *and* causes drift).

**If you must store such a value yourself**, drop the prefix: `SB_ACCESS_TOKEN`, `SB_DB_PASSWORD`,
`VC_TOKEN`, `VC_TEAM_ID`, `GH_TOKEN`. Names like `NEXT_PUBLIC_SUPABASE_URL` are fine — only the
**leading** prefix is restricted.

Full policy: `.claude/rules/env-naming.md`

### 8. Storage Policy

**Default: Private buckets** (unless explicitly requested otherwise)

```typescript
// CORRECT: Use createSignedUrl for private files
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl('path/to/file.pdf', 60)

// WRONG: getPublicUrl on private bucket
const { data } = supabase.storage
  .from('documents')
  .getPublicUrl('path/to/file.pdf')
```

**RESTful path structure**: `{resource}/{id}/{sub-resource}/{filename}`

### 9. List Pagination

**Paginate any list that can grow — without waiting to be asked.** Pick the UI pattern yourself.

Pagination is REQUIRED unless the row count is hard-capped by schema or spec. "There is little data
right now" is not a reason: seed data never surfaces the problem, production does.

```typescript
// WRONG: unbounded fetch + client-side slicing
const { data } = await supabase.from('orders').select('*')
const page = data.slice(offset, offset + 20)

// CORRECT: paginate in the DB, with a unique tiebreaker in the sort
const { data, count } = await supabase
  .from('orders')
  .select('*', { count: 'estimated' })
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })      // required — otherwise rows repeat/vanish across pages
  .range(from, from + PAGE_SIZE - 1)
```

**Default UI pattern by surface**:

| Surface | Default |
|---------|---------|
| Web admin tables / search results / SEO-facing lists | Numbered pages synced to the URL (`?page=`) |
| Web exploratory grids and galleries | "Load more" button |
| Mobile (Expo / RN) lists | Infinite scroll (`onEndReached` + virtualized list) |
| Chat / timelines / feeds (new rows prepended) | Keyset (cursor) pagination |

When unsure, choose "Load more". Infinite scroll additionally requires: no footer, a real
"Load more" button left in the DOM (keyboard fallback), and scroll-position restoration.

Also required: clamp `limit` server-side, index the sort keys, skip `count` unless the total is
shown (`estimated` on large tables), and ship all five states — initial loading, loading more,
empty, error, end-of-list.

Full policy: `.claude/rules/list-pagination.md`

### 10. Minimal Implementation (Write Less Code)

**Good engineers write less code.** Work is judged by how much you *avoided* building, not by how
much you produced — code you never wrote cannot break, needs no review, and costs nothing to
maintain. Before writing anything, evaluate in this order and stop at the first option that works:

1. **What already exists in this repo** — `frontend/packages/*` (`@workspace/ui`, `query`, `auth`,
   `client-supabase`, `logger`, `api-client`), an app's `shared/` and `entities/`,
   `backend-py/packages/core`, `supabase/functions/shared/`. **Actually grep for it.**
2. **Platform / framework built-ins** — `Intl`, `URL`, `crypto.randomUUID`; React 19 and Next.js 16
   (Server Components, `loading.tsx`, `next/image`); PostgreSQL (constraints, generated columns,
   RLS, indexes, pgvector).
3. **Managed services** — Supabase (Auth / Storage / Realtime / Edge Functions), Stripe, Resend,
   OneSignal, LiveKit, fal, Sentry, Doppler, Vercel, EAS.
4. **A well-maintained OSS library** that passes the selection bar below.
5. **Scratch** — only once 1–4 are ruled out.

Adding a dependency is also adding a maintenance obligation, so the reverse is equally banned:
do not pull in a package for something that takes a few lines of standard API, and do not wrap
product-specific domain logic in a generic library. **Never hand-roll** crypto, auth/session
handling (Supabase Auth), row-level authorization (RLS), payments (Stripe / RevenueCat), date-time
and locale formatting (`Intl`), or email deliverability (Resend).

**Library selection bar** — every item is required:

| # | Requirement |
|---|-------------|
| 1 | Not archived or deprecated, with recent activity (OpenSSF Scorecard's `Maintained` scores full marks at ≥1 commit/week over the last 90 days) |
| 2 | Real-world adoption (weekly downloads, dependents) |
| 3 | No unfixed known vulnerabilities (`bun audit`, OSV) |
| 4 | Commercially usable license (MIT / Apache-2.0 / BSD / ISC). **AGPL / SSPL / BUSL require asking the user** |
| 5 | Ships types (bundled or official `@types`; `py.typed` for Python) |
| 6 | Docs and release notes, with migration guidance for breaking changes |
| 7 | Shallow transitive dependency tree |

Verify with `bun info` / `bun outdated` / `bun why` / `bun audit` / `uv tree`,
[deps.dev](https://deps.dev), `scorecard.dev/viewer/?uri=github.com/<owner>/<repo>`, and the
official docs. **Stars are a secondary signal**: few stars (under a few hundred) is a reason to
pass, but many stars is never a reason to adopt — stars are purchasable, and CMU / NC State /
Socket (ICSE 2026) documented roughly six million suspected fake stars. **Do not introduce a
library that overlaps an already-chosen area**: shadcn/ui + Radix (web), gluestack-ui (mobile),
TanStack Query, Zustand, next-intl, Drizzle, Hey API, Supabase Auth.

**Share code by the Rule of Three** — write it once, tolerate the second copy, extract on the
third. Extract on the *second* copy when drift causes incidents (style constants, query keys,
`PAGE_SIZE`, price tables, validation rules, API contracts). *Duplication is far cheaper than the
wrong abstraction*; if an abstraction does not shrink total lines, it was not worth adding.

**None of this licenses breaking maintainability.** Violating FSD layer direction or public APIs
(`index.ts`), reaching across features, collapsing types with `any`/`as`, or skipping tests, error
handling, i18n, or pagination to save lines is a violation of this policy, not compliance with it.
"Less code" means less code *we own and maintain* — never fewer quality gates.

Design against **officially recommended practice**, confirmed from primary sources (official docs >
official blog / release notes > official repo code and examples > maintainer statements >
third-party posts, which are never sufficient on their own). Use official CLIs, codemods, and
scaffolds rather than reproducing them by hand; if you must deviate, record the reason.

Full policy: `.claude/rules/minimal-implementation.md`

### 11. Authentication Method and Recovery Flows

**If the product ships a mobile app, email + password MUST be the primary sign-in method. OTP or
magic link alone is forbidden.** OAuth, passkeys and OTP may be offered *in addition*, as long as
email + password alone gets a user all the way in.

The reason is App Review, not preference. App Store Review Guideline **2.1(a)** requires you to
give the reviewer "an active demo account ... plus any other hardware or resources that might be
needed to review your app (e.g. **login credentials**)". With OTP-only sign-in the reviewer cannot
read the inbox the code is sent to, so the app is rejected under 2.1 — and papering over it with a
review-only backdoor or fixed code creates a separate violation. Google Play asks for test-account
credentials the same way.

| Product shape | Primary sign-in |
|---------------|-----------------|
| Ships a mobile app (Expo / RN, store-distributed) | **Email + password (required)** |
| Web only, no mobile app | OTP / magic link is fine |
| Both web and mobile | **Both on email + password** (same credentials work everywhere; web may also offer OTP) |

**Recovery flows are required, and are not optional extras** — a user who changed inboxes or forgot
their password has no self-service path back into the account without them:

| Flow | OTP (web-only) | Email + password | Where it goes |
|------|----------------|------------------|---------------|
| Change email address | **Required** | **Required** | Account settings |
| Forgot password | — | **Required** | **The login screen** — someone who forgot the password cannot reach a signed-in screen |
| Change password | — | **Required** | Account settings (send `current_password` — see below) |
| Delete account | Mobile: required | Mobile: required | Account settings (`.claude/rules/store-review.md`) |

```typescript
// Mobile password reset — prefer the 6-digit code over deep links. Link prefetching by spam
// scanners (e.g. Safe Links) consuming {{ .ConfirmationURL }} is a documented Supabase limitation,
// and using {{ .Token }} is the official workaround.
await supabase.auth.resetPasswordForEmail(email)                       // recovery template needs {{ .Token }}
await supabase.auth.verifyOtp({ email, token, type: 'recovery' })      // establishes a session
await supabase.auth.updateUser({ password: newPassword })

// Changing the password while signed in — send current_password. Do NOT "verify" the current
// password by calling signInWithPassword: that issues a new session and is not the documented flow.
// Requires [auth.email] secure_password_change = true (defaults to false).
await supabase.auth.updateUser({ email, current_password: currentPassword, password: newPassword })

// Email change — keep double_confirm_changes = true (default): BOTH the old and the new
// address must confirm before the address actually changes. Say so in the UI.
await supabase.auth.updateUser({ email: newEmail })
```

Also required: set password strength (`minimum_password_length` ≥ 8, `password_requirements`) plus
leaked-password protection (HaveIBeenPwned, Pro plan and above), and surface `WeakPasswordError`
from `signInWithPassword` into the reset flow — otherwise existing users hit a dead end the day you
tighten the rules. On mobile, configure the client with a storage adapter, `persistSession: true`,
`autoRefreshToken: true` and `detectSessionInUrl: false`, or the session is lost on every launch.
Server-side, authorize with `getUser()` — never `getSession()`, whose values "may not be authentic"
when storage is request cookies.

Never build auth yourself; never disable `double_confirm_changes`; never reveal whether an address
is registered in the forgot-password response.

Full policy: `.claude/rules/auth.md`

---

## Domain Documentation

| Domain | Documentation |
|--------|---------------|
| Frontend (Web) | [frontend/README.md](frontend/README.md) |
| Frontend (Mobile) | [frontend/apps/mobile/README.md](frontend/apps/mobile/README.md) |
| Backend Python | [backend-py/README.md](backend-py/README.md) |
| Database Schema | [drizzle/README.md](drizzle/README.md) |
| Edge Functions | [supabase/functions/README.md](supabase/functions/README.md) |

---

## Package Management

| Component | Package Manager |
|-----------|-----------------|
| Frontend Web | **Bun** |
| Frontend Mobile | **Bun** |
| Backend Python | **uv** |
| Drizzle | **Bun** |
| Edge Functions | **Deno** |

---

## Debugging (MANDATORY)

フロントエンド・バックエンドのデバッグは **devenv 2.0 の native process manager の TUI** を主インターフェースとして使用する。`devenv up` を対話端末で実行すると TUI が自動起動し、プロセス状態・リアルタイムログ・個別再起動がキーボード操作で可能。process-compose は撤去済み。

非対話環境（CI / Claude Code）では `/tmp/devenv-*/processes/logs/<process>.{stdout,stderr}.log` を直接 tail する:

```bash
tail -100 /tmp/devenv-*/processes/logs/backend.stderr.log
tail -100 /tmp/devenv-*/processes/logs/storybook.stderr.log
tail -100 /tmp/devenv-*/processes/logs/web.stderr.log     # devenv up web 起動時
```

詳細は `.claude/skills/debugging/SKILL.md` を参照。

---

## Skills

Detailed guidance available in `.codex/skills/`:

- `fsd/` - Feature Sliced Design
- `drizzle/` - Drizzle ORM schema management
- `supabase/` - Supabase Auth, RLS, Storage
- `tanstack-query/` - TanStack Query v5
- `datetime/` - DateTime handling patterns
- `i18n/` - next-intl internationalization
- `shadcn-ui/` - shadcn/ui + TailwindCSS
- `debugging/` - デバッグ手順（devenv 2.0 native process manager の TUI 優先）
