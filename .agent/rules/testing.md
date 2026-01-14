# Testing Guidelines

## CRITICAL: Test-Driven Development (TDD) Requirement

**MANDATORY**: All frontend development MUST follow Test-Driven Development (TDD) practices.

### UI Components Exception

**UI コンポーネントは単体テスト不要。代わりに Storybook で品質担保。**

詳細は **[UI Testing Policy](./ui-testing.md)** を参照。

| 対象 | テスト方法 |
|------|-----------|
| UI コンポーネント | Storybook（単体テスト不要） |
| ビジネスロジック | 単体テスト（TDD 必須） |
| API / データ取得 | 単体テスト（TDD 必須） |

### TDD Principles

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

**This is NON-NEGOTIABLE**. Do not write implementation code before writing tests.

---

## Frontend Testing with supabase-test

### MANDATORY: Use supabase-test for API Segment Testing

**CRITICAL**: When implementing Feature-Sliced Design (FSD) `api` segments that interact with Supabase, you MUST use `supabase-test` for testing.

**Package**: [supabase-test](https://www.npmjs.com/package/supabase-test)

### Important: About This Testing Approach

**This guide uses a community-recommended practical approach**, not the official supabase-test method.

**Two Approaches**:

1. **Official supabase-test Approach**: Use `db.query()` to execute raw SQL
   - Example: [launchql/supabase-test-suite](https://github.com/launchql/supabase-test-suite)
   - Uses Jest + direct SQL execution
   - Does NOT use `@supabase/supabase-js` client

2. **Practical Approach (This Guide)**: Use `@supabase/supabase-js` client + `supabase-test`
   - Recommended by: [index.garden/supabase-vitest](https://index.garden/supabase-vitest/), [Supabase Official Testing Docs](https://supabase.com/docs/guides/local-development/testing/overview)
   - Tests actual frontend code (Supabase client library)
   - Requires `jsdom` environment for localStorage support
   - **More practical for real-world frontend development**

**Why Practical Approach?**: Your actual FSD api segment code uses `@supabase/supabase-js`:

```typescript
// Actual implementation code
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}
```

Testing with the official approach would look completely different:

```typescript
// ❌ Official approach - different from actual code
const profile = await db.one(
  `SELECT * FROM user_profiles WHERE user_id = $1`,
  [userId]
);
```

**We use the practical approach to test actual Supabase client behavior.**

### What is supabase-test?

`supabase-test` is a TypeScript-first testing library specialized for testing Supabase databases and Row-Level Security (RLS) policies. Key features:

- **Isolated Test Environments**: Each test runs in an isolated transaction with automatic rollback
- **Role Simulation**: Easily simulate PostgreSQL roles (`authenticated`, `anon`)
- **JWT Context**: Set JWT claims to test RLS policies
- **Zero Config**: Works out of the box with LaunchQL projects
- **CI/CD Ready**: Seamless integration with GitHub Actions

---

## Setup Requirements

### 1. Installation

```bash
cd frontend
bun add -d supabase-test
```

### 2. Vitest Configuration

**CRITICAL**: Must use `jsdom` environment for Supabase client compatibility.

**frontend/vitest.config.ts**:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',  // Required for @supabase/supabase-js localStorage support
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
  },
});
```

**Why `jsdom` is Required**:

1. **Vitest Default**: Vitest runs tests in Node.js environment (no browser APIs)
2. **Supabase Client Behavior**: `@supabase/supabase-js` stores auth tokens in `localStorage`
3. **Node.js Limitation**: Node.js does not have `localStorage`, `window`, or `document`
4. **jsdom Solution**: Simulates browser environment in Node.js, providing `localStorage` API

**What happens without jsdom**:

```typescript
// Without jsdom
await supabase.auth.signInWithPassword({ email, password });
// → ReferenceError: localStorage is not defined ❌
```

**With jsdom**:

```typescript
// With jsdom
await supabase.auth.signInWithPassword({ email, password });
// → Success! jsdom provides localStorage ✅
```

**Note**: The official supabase-test approach (using `db.query()`) does NOT require jsdom because it doesn't use the Supabase client library.

### 3. Test Setup File

**frontend/tests/setup.ts**:

```typescript
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { getConnections } from 'supabase-test';

let db;
let teardown;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());
});

afterAll(() => teardown());
beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());

export { db };
```

### 4. Environment Variables

Ensure Supabase local stack is running:

```bash
npx supabase start
```

Environment variables (automatically set by Supabase CLI):

```bash
PGPORT=54322
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=postgres
```

---

## Testing Pattern for FSD API Segment

### Directory Structure

```
src/
├── entities/
│   └── user/
│       ├── api/
│       │   ├── userApi.ts          # Supabase API implementation
│       │   └── userApi.test.ts     # supabase-test tests
│       ├── model/
│       └── ui/
└── features/
    └── authentication/
        ├── api/
        │   ├── authApi.ts
        │   └── authApi.test.ts
        ├── model/
        └── ui/
```

### Test Template

**src/entities/user/api/userApi.test.ts**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/tests/setup';
import { getUserProfile, updateUserProfile } from './userApi';
import crypto from 'crypto';

describe('User API - RLS Policy Tests', () => {
  const userId1 = crypto.randomUUID();
  const userId2 = crypto.randomUUID();

  beforeEach(async () => {
    // Insert fixture data
    await db.query(`
      INSERT INTO users (id, account_name, display_name)
      VALUES ($1, 'user1', 'User One'), ($2, 'user2', 'User Two')
    `, [userId1, userId2]);
  });

  describe('getUserProfile', () => {
    it('authenticated user can fetch own profile', async () => {
      db.setContext({
        role: 'authenticated',
        'jwt.claims.sub': userId1
      });

      const profile = await getUserProfile(userId1);

      expect(profile).toBeDefined();
      expect(profile.user_id).toBe(userId1);
    });

    it('anonymous user cannot fetch profile', async () => {
      db.setContext({ role: 'anon' });

      await expect(getUserProfile(userId1)).rejects.toThrow();
    });
  });

  describe('updateUserProfile', () => {
    it('authenticated user can update own profile', async () => {
      db.setContext({
        role: 'authenticated',
        'jwt.claims.sub': userId1
      });

      const updated = await updateUserProfile(userId1, {
        bio: 'Updated bio'
      });

      expect(updated.bio).toBe('Updated bio');
    });

    it('authenticated user cannot update other user profile', async () => {
      db.setContext({
        role: 'authenticated',
        'jwt.claims.sub': userId1
      });

      await expect(
        updateUserProfile(userId2, { bio: 'Hacked!' })
      ).rejects.toThrow(/row-level security policy/);
    });
  });
});
```

---

## RLS Policy Testing Requirements

### MANDATORY: Test All CRUD Operations and Roles

When testing RLS policies, you MUST verify:

1. **All Operations**: SELECT, INSERT, UPDATE, DELETE
2. **All Roles**: `anon`, `authenticated`
3. **Positive Cases**: Operations that should succeed
4. **Negative Cases**: Operations that should be denied

### Example: Comprehensive RLS Test

```typescript
describe('Posts Table RLS', () => {
  const roles = ['anon', 'authenticated'] as const;
  const userId = crypto.randomUUID();

  roles.forEach(role => {
    describe(`Role: ${role}`, () => {
      beforeEach(() => {
        if (role === 'authenticated') {
          db.setContext({ role, 'jwt.claims.sub': userId });
        } else {
          db.setContext({ role });
        }
      });

      it('SELECT operation', async () => {
        // Test SELECT permissions
      });

      it('INSERT operation', async () => {
        // Test INSERT permissions
      });

      it('UPDATE operation', async () => {
        // Test UPDATE permissions
      });

      it('DELETE operation', async () => {
        // Test DELETE permissions
      });
    });
  });
});
```

---

## TDD Workflow with supabase-test

### Step 1: Write Failing Test (RED)

```typescript
describe('createPost', () => {
  it('authenticated user can create post', async () => {
    db.setContext({
      role: 'authenticated',
      'jwt.claims.sub': userId
    });

    const post = await createPost({
      title: 'Test Post',
      content: 'Test content'
    });

    expect(post.id).toBeDefined();
    expect(post.author_id).toBe(userId);
  });
});
```

Run test to confirm it fails:

```bash
bun test
# → createPost is not defined ✗
```

### Step 2: Minimal Implementation (GREEN)

```typescript
export async function createPost(input: CreatePostInput) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: input.title,
      content: input.content,
      author_id: supabase.auth.user()?.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

Run test to confirm it passes:

```bash
bun test
# → ✓ authenticated user can create post
```

### Step 3: Refactor (REFACTOR)

```typescript
export async function createPost(input: CreatePostInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...input,
      author_id: user.id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

Run test again to ensure refactoring didn't break anything:

```bash
bun test
# → ✓ authenticated user can create post
```

---

## Best Practices

### 1. Test Isolation

```typescript
// ✅ Good: Use unique IDs for each test
it('test user creation', async () => {
  const userId = crypto.randomUUID();
  await createUser(userId, 'Alice');
  // ...
});

// ❌ Bad: Shared IDs
const sharedUserId = 'fixed-id';
it('test 1', async () => {
  await createUser(sharedUserId, 'Alice');  // Potential conflict
});
```

### 2. RLS Error Validation

```typescript
// Helper function for RLS error validation
function isRlsError(error: unknown): boolean {
  return error?.message?.includes('row-level security policy') || false;
}

// Usage
it('RLS policy blocks unauthorized update', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 });

  await expect(updateOtherUserData())
    .rejects.toThrow(/row-level security policy/);
});
```

### 3. Multiple Clients

Separate admin (service role) and user clients:

```typescript
import { createClient } from '@supabase/supabase-js';

// Admin client (bypasses RLS)
const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }  // IMPORTANT: Disable session persistence
);

// User client (RLS enforced)
const userClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

### 4. Fixture Data Setup

```typescript
beforeEach(async () => {
  // Use admin client to bypass RLS for fixture setup
  await adminClient.from('users').insert([
    { id: userId1, name: 'Alice' },
    { id: userId2, name: 'Bob' }
  ]);
});
```

---

## Test Execution Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run specific test file
bun test src/entities/user/api/userApi.test.ts

# Run tests with coverage
bun test --coverage
```

---

## CI/CD Integration

**GitHub Actions Example**:

```yaml
# .github/workflows/test.yml
name: Database Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase Local
        run: supabase start

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: |
          cd frontend
          bun install

      - name: Run tests
        run: |
          cd frontend
          bun test
        env:
          PGPORT: 54322
          PGHOST: localhost
          PGUSER: postgres
          PGPASSWORD: postgres
```

---

## Troubleshooting

### Session Persistence Issue

**Problem**: Test user loses session after sign-in

**Solution**: Set `environment: 'jsdom'` in `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',  // Browser-like environment
  },
});
```

### Service Role Client Session Conflict

**Problem**: Service role client picks up regular user session

**Solution**: Disable session persistence

```typescript
const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false }  // Disable storage-based session loading
});
```

### Database Connection Error

**Problem**: `ECONNREFUSED` error

**Solution**: Ensure Supabase local stack is running

```bash
# Check Supabase status
supabase status

# Start if not running
supabase start
```

---

## Enforcement

These testing guidelines are **NON-NEGOTIABLE**:

- ❌ NO implementation without tests
- ❌ NO skipping RLS policy tests
- ❌ NO using non-isolated test data
- ✅ ALWAYS write tests first (TDD)
- ✅ ALWAYS test all CRUD operations
- ✅ ALWAYS test all roles (`anon`, `authenticated`)
- ✅ ALWAYS verify both positive and negative cases

**Failure to follow these guidelines may result in**:
- Security vulnerabilities (RLS bypass)
- Data leaks between users
- Production bugs
- Failed code reviews

---

## All Green Policy (MANDATORY)

**作業終了時は必ずすべてのテストが通過（All Green）していること。**

### 作業終了前チェックリスト

1. **全テスト実行**: `make test` を実行
2. **失敗テストの対応**:
   - 原因分析を実施
   - 実装の修正（テストは変更しない）
   - 再度テスト実行
3. **All Green確認**: すべてのテストがパスするまで繰り返す

### 失敗テストへの対応

| 状況 | 対応 |
|------|------|
| 実装バグ | 実装を修正 |
| テスト環境問題 | 環境を修正し再実行 |
| 既存テストの破壊 | リグレッションを修正 |
| フレーキーテスト | 根本原因を特定し安定化 |

### 禁止事項

**NEVER**:
- 失敗テストを放置して作業を終了
- テストをスキップ（`skip`/`xfail`）して回避
- 失敗テストを削除して対処
- 「後で直す」として先送り

---

## References

### Official supabase-test Resources

- [supabase-test npm Package](https://www.npmjs.com/package/supabase-test)
- [LaunchQL Supabase Test Suite](https://github.com/launchql/supabase-test-suite) - Official examples using `db.query()`
- [LaunchQL supabase-test Source](https://github.com/launchql/launchql/tree/main/packages/supabase-test)

### Practical Approach Resources (This Guide)

- [Testing Supabase RLS with Vitest](https://index.garden/supabase-vitest/) - Community guide for `@supabase/supabase-js` + Vitest
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) - Official docs showing Vitest + Supabase client
- [Testing Supabase RLS - DEV Community](https://dev.to/davepar/testing-supabase-row-level-security-4h32)
- [Supabase RLS Automated Testing](https://aaronblondeau.com/posts/march_2024/supabase_rls_testing/)

### Why Two Approaches Exist

- **Official Approach**: Database-centric testing with direct SQL (best for database schema testing)
- **Practical Approach**: Frontend-centric testing with Supabase client (best for testing actual application code)

This guide uses the **Practical Approach** because it tests the actual code you write in your FSD api segments.
