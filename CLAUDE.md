# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Research-First Development Approach

**MANDATORY REQUIREMENT**: Before starting any implementation or planning, you MUST conduct thorough research using available tools.

### Research Protocol (MUST FOLLOW)

#### 1. Pre-Implementation Research (REQUIRED)

Before writing any code or creating a plan, you MUST:

1. **Use Context7 MCP** to fetch the latest documentation for all relevant libraries and frameworks
   - Example: If implementing a Next.js feature, fetch Next.js documentation first
   - Example: If using a new npm package, research its latest API and best practices
   - Example: If implementing Supabase features, verify current API specifications

2. **Use WebSearch** to verify current best practices and common pitfalls
   - Search for: "[Technology] [Feature] best practices 2025"
   - Search for: "[Library] [Version] breaking changes"
   - Search for: "[Framework] official documentation [specific feature]"

3. **Use WebFetch** to read official documentation directly
   - Fetch official docs, not blog posts or outdated tutorials
   - Verify API syntax, parameter names, and return types
   - Check for deprecation warnings and recommended alternatives

#### 2. What to Research

**ALWAYS research**:
- Library/framework versions and their current APIs
- Deprecated features and their replacements
- Breaking changes in recent versions
- Official recommended patterns and anti-patterns
- TypeScript type definitions and interfaces
- Configuration file formats and schemas
- CLI command syntax and options

**NEVER**:
- Make assumptions based on memory or general knowledge
- Use outdated patterns without verification
- Implement features without checking official docs
- Guess API signatures or parameter types

#### 3. Research Checklist

Before implementation, confirm you have:
- [ ] Checked Context7 for latest library documentation
- [ ] Verified API syntax with official sources
- [ ] Searched for breaking changes and migration guides
- [ ] Reviewed official examples and best practices
- [ ] Confirmed TypeScript types and interfaces
- [ ] Validated configuration formats

#### 4. When Research is Required

**MANDATORY research scenarios**:
- Using any external library or framework
- Implementing authentication or security features
- Configuring build tools or bundlers
- Setting up database schemas or migrations
- Integrating third-party APIs or services
- Using CLI tools with specific syntax
- Implementing real-time features
- Working with type definitions

**Example: Before implementing Supabase Realtime**
```bash
# MUST DO:
1. Use Context7: Get latest @supabase/supabase-js documentation
2. Use WebFetch: Read https://supabase.com/docs/guides/realtime/postgres-changes
3. Use WebSearch: Search "Supabase realtime ALTER PUBLICATION 2025"
4. Verify: ALTER PUBLICATION syntax from PostgreSQL docs
5. Confirm: RLS integration and client API
# ONLY THEN: Write implementation code
```

#### 5. Consequences of Skipping Research

**DO NOT**:
- ❌ Implement features based on outdated knowledge
- ❌ Use deprecated APIs without checking alternatives
- ❌ Write code with incorrect syntax or parameters
- ❌ Create configurations that don't match current schemas
- ❌ Make assumptions about library behavior

**ALWAYS**:
- ✅ Research first, implement second
- ✅ Verify with official documentation
- ✅ Use current best practices
- ✅ Check for breaking changes
- ✅ Validate syntax and types

### Enforcement

This research-first approach is **NON-NEGOTIABLE**. Any implementation without proper research is considered incomplete and must be revised.

---

## CRITICAL: Development Command Guidelines

**MANDATORY REQUIREMENT**: Always use Makefile commands for development tasks. Direct execution of tools is strictly controlled.

### Command Usage Policy

#### 1. Use Makefile Commands (REQUIRED)

**ALWAYS use `make` commands** for the following operations:

- **Linting**: `make lint`, `make lint-frontend`, `make lint-backend-py`, `make lint-functions`, `make lint-drizzle`
- **Formatting**: `make format`, `make format-frontend`, `make format-backend-py`, `make format-functions`, `make format-drizzle`
- **Type Checking**: `make type-check`, `make type-check-frontend`, `make type-check-backend-py`
- **Building**: `make build`, `make build-frontend`, `make build-backend-py`
- **Testing**: `make test`, `make test-frontend`, `make test-backend-py`
- **CI Checks**: `make ci-check` (combines lint + format + type checks)
- **Service Management**: `make run`, `make frontend`, `make stop`

**Examples**:

```bash
# ✅ Good: Use Makefile commands
make lint-frontend        # Lint frontend code
make format               # Format all code
make type-check          # Type check all projects
make ci-check            # Run all CI checks

# ❌ Bad: Direct tool execution
cd frontend && bun run biome check --write  # DO NOT do this
cd backend-py && uv run ruff check          # DO NOT do this
```

#### 2. Database Migration Policy (CRITICAL)

**❌ NEVER automatically execute database migrations without explicit user approval.**

**Rules**:

1. **Schema Changes Only**: You may edit schema files (`drizzle/schema/schema.ts`, etc.)
2. **NO Automatic Migration**: Do NOT run `make migrate-dev`, `make migrate-deploy`, or `make migration`
3. **User Confirmation Required**: Always ask the user to review schema changes and execute migration commands manually

**Workflow**:

```bash
# ✅ Good: Proper workflow
# 1. Assistant edits schema
vi drizzle/schema/schema.ts

# 2. Assistant informs user
"スキーマを更新しました。以下のコマンドでマイグレーションを実行してください：
make migrate-dev"

# 3. User executes migration manually
make migrate-dev

# ❌ Bad: Automatic migration execution
# Assistant runs make migrate-dev automatically - DO NOT DO THIS
```

**Why This Policy Exists**:

- Database migrations are **irreversible** operations
- Schema changes affect **production data**
- User must review migration SQL before applying
- Prevents accidental data loss or corruption

#### 3. Type Generation Policy

**Type generation is allowed** when it's part of development workflow:

```bash
# ✅ Allowed: Type generation (read-only operations)
make build-model-frontend   # Generate Supabase types
make build-model-functions  # Generate Edge Functions types
make build-model            # Generate all types

# ❌ Prohibited: Migration with type generation
make migrate-dev            # Includes migration execution - requires user approval
```

#### 4. Exception Cases

You may execute commands directly **ONLY** in these specific cases:

- **Reading files**: `cat`, `less`, `head`, `tail` (use Read tool instead when possible)
- **Listing files**: `ls`, `find`, `tree` (use Glob tool instead when possible)
- **Git operations**: `git status`, `git diff`, `git log` (read-only)
- **Package info**: `bun list`, `npm list`, `uv pip list` (read-only)

**All other operations MUST use Makefile commands.**

### Enforcement

This command usage policy is **NON-NEGOTIABLE**. Violations may cause:

- ❌ Unintended database schema changes
- ❌ Production data corruption
- ❌ Inconsistent development environment
- ❌ Breaking CI/CD pipelines

**Always ask the user for explicit approval before database operations.**

---

## Domain-Specific Documentation

For detailed information about each domain, refer to the following documentation:

- **Frontend**: [`frontend/README.md`](frontend/README.md) - Next.js 16, React 19, Feature-Sliced Design, shadcn/ui
- **Database Schema**: [`drizzle/README.md`](drizzle/README.md) - Drizzle ORM, RLS policies, migrations, pgvector
- **Backend Python**: [`backend-py/README.md`](backend-py/README.md) - FastAPI, Clean Architecture, AI/ML integration
- **Edge Functions**: [`supabase/functions/README.md`](supabase/functions/README.md) - Deno, Drizzle integration, type safety

## Architecture Overview

This is a full-stack application boilerplate with a multi-platform frontend and backend services:

### Frontend Architecture

- **Framework**: Next.js 16 with App Router
- **UI Library**: shadcn/ui (Radix UI + TailwindCSS 4)
- **Tech Stack**: React 19, TypeScript, Bun package manager
- **Build System**: Turbo for monorepo management
- **Architecture Pattern**: Feature-Sliced Design (FSD)

**→ For detailed frontend documentation, see [`frontend/README.md`](frontend/README.md)**

### TanStack Query（サーバー状態管理）

このプロジェクトは **TanStack Query v5** を使用してサーバー状態を管理しています。

#### 状態管理の役割分担

| 状態タイプ | 説明 | 管理方法 |
|-----------|------|----------|
| **ローカルUI状態** | モーダル開閉、フォーム入力、タブ選択 | `useState` |
| **グローバル共有状態** | 認証セッション（複数コンポーネント共有） | Zustand (`@workspace/auth`) |
| **サーバー状態** | DBデータ、API応答、Supabaseクエリ結果 | **TanStack Query** (`@workspace/query`) |

#### パッケージ構成

```
frontend/packages/query/
├── package.json
├── index.ts                    # Public API（hooks/types エクスポート）
├── provider/
│   └── QueryProvider.tsx       # QueryClientProvider ラッパー
└── client/
    └── queryClient.ts          # SSR対応QueryClient設定
```

#### 使用方法

**基本的なクエリ（Supabase連携）**:

```typescript
'use client'
import { useQuery, useMutation, useQueryClient } from '@workspace/query'
import { createClient } from '@workspace/client-supabase/client'

// Query Keys（FSD api segment に配置）
export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => [...userKeys.all, id] as const,
  profile: (id: string) => [...userKeys.detail(id), 'profile'] as const,
}

// クエリフック
export function useUserProfile(userId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data
    },
  })
}

// ミューテーションフック
export function useUpdateUserProfile() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data, { userId }) => {
      // キャッシュを自動更新
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
    },
  })
}
```

**コンポーネントでの使用**:

```typescript
'use client'
import { useUserProfile, useUpdateUserProfile } from '@/entities/user/api'

export function UserSettings({ userId }: { userId: string }) {
  const { data: profile, isLoading, error } = useUserProfile(userId)
  const updateProfile = useUpdateUserProfile()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <button
      onClick={() => updateProfile.mutate({ userId, updates: { bio: 'Updated!' } })}
      disabled={updateProfile.isPending}
    >
      {updateProfile.isPending ? 'Saving...' : 'Update Profile'}
    </button>
  )
}
```

#### FSD配置方針

| FSDレイヤー | TanStack Query 配置 |
|------------|---------------------|
| **shared/api** | 共通Query Key ファクトリ、基底クエリ関数 |
| **entities/*/api** | エンティティのCRUD用クエリ/ミューテーション |
| **features/*/api** | フィーチャー固有のクエリ/ミューテーション |

#### Provider設定

`QueryProvider` は `app/[locale]/layout.tsx` で `AuthProvider` の外側にラップされています:

```typescript
<QueryProvider>
  <AuthProvider>
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  </AuthProvider>
</QueryProvider>
```

#### DevTools

開発環境では画面右下に **ReactQueryDevtools** が自動表示されます。キャッシュ状態、クエリ履歴、リフェッチタイミングを確認できます。

### Frontend Testing with supabase-test

**CRITICAL**: All frontend API segments that interact with Supabase MUST be tested using `supabase-test`.

#### Important: About This Testing Approach

**This guide uses a community-recommended practical approach**, not the official supabase-test method.

**Two Approaches**:

1. **Official supabase-test Approach**: Use `db.query()` to execute raw SQL
   - Example: [launchql/supabase-test-suite](https://github.com/launchql/supabase-test-suite)
   - Tests database schema and RLS policies directly with SQL
   - Does NOT use `@supabase/supabase-js` client

2. **Practical Approach (This Guide)**: Use `@supabase/supabase-js` client + `supabase-test`
   - Recommended by: [index.garden/supabase-vitest](https://index.garden/supabase-vitest/), [Supabase Testing Docs](https://supabase.com/docs/guides/local-development/testing/overview)
   - Tests actual frontend code (Supabase client library)
   - Requires `jsdom` environment for localStorage support
   - **More practical for real-world frontend development**

**Why Practical Approach?**: Your actual FSD api segment code uses `@supabase/supabase-js`, so tests should too.

#### What is supabase-test?

`supabase-test` is a TypeScript-first testing library specialized for testing Supabase databases and Row-Level Security (RLS) policies:

- **Isolated Test Environments**: Each test runs in an isolated transaction with automatic rollback
- **Role Simulation**: Easily simulate PostgreSQL roles (`authenticated`, `anon`)
- **JWT Context**: Set JWT claims to test RLS policies
- **Zero Config**: Works out of the box with LaunchQL projects
- **CI/CD Ready**: Seamless integration with GitHub Actions

**Package**: [supabase-test](https://www.npmjs.com/package/supabase-test)

#### Setup Requirements

**1. Installation**:

```bash
cd frontend
bun add -d supabase-test
```

**2. Vitest Configuration** (`frontend/vitest.config.ts`):

**CRITICAL**: Must use `jsdom` environment for Supabase client compatibility.

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

- **Vitest Default**: Runs tests in Node.js environment (no browser APIs like `localStorage`)
- **Supabase Client Behavior**: `@supabase/supabase-js` stores auth tokens in `localStorage`
- **jsdom Solution**: Simulates browser environment in Node.js, providing `localStorage` API

**Without jsdom**: `ReferenceError: localStorage is not defined`

**Note**: The official supabase-test approach (using `db.query()`) does NOT require jsdom.

**3. Test Setup File** (`frontend/tests/setup.ts`):

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

**4. Start Supabase Local Stack**:

```bash
npx supabase start
```

#### Testing Pattern for FSD API Segment

**Directory Structure**:

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

#### TDD Workflow with supabase-test

**Test-Driven Development (TDD) Cycle**:

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

**Example: Step 1 - Red (Failing Test)**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/tests/setup';
import { getUserProfile } from './userApi';
import crypto from 'crypto';

describe('User API - RLS Policy Tests', () => {
  const userId = crypto.randomUUID();

  beforeEach(async () => {
    await db.query(`
      INSERT INTO general_users (id, account_name, display_name)
      VALUES ($1, 'testuser', 'Test User')
    `, [userId]);
  });

  it('authenticated user can fetch own profile', async () => {
    db.setContext({
      role: 'authenticated',
      'jwt.claims.sub': userId
    });

    const profile = await getUserProfile(userId);

    expect(profile).toBeDefined();
    expect(profile.user_id).toBe(userId);
  });
});
```

Run test to confirm it fails:

```bash
cd frontend
bun test
# → getUserProfile is not defined ✗
```

**Example: Step 2 - Green (Minimal Implementation)**:

```typescript
// src/entities/user/api/userApi.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

Run test to confirm it passes:

```bash
bun test
# → ✓ authenticated user can fetch own profile
```

**Example: Step 3 - Refactor (Improve Code)**:

```typescript
export async function getUserProfile(userId: string) {
  // Add input validation
  if (!userId) throw new Error('User ID is required');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // Better error handling
    if (error.code === 'PGRST116') {
      throw new Error('User profile not found');
    }
    throw error;
  }

  return data;
}
```

Run test again to ensure refactoring didn't break anything:

```bash
bun test
# → ✓ authenticated user can fetch own profile
```

#### RLS Policy Testing Requirements

**MANDATORY**: When testing RLS policies, you MUST verify:

1. **All Operations**: SELECT, INSERT, UPDATE, DELETE
2. **All Roles**: `anon`, `authenticated`
3. **Positive Cases**: Operations that should succeed
4. **Negative Cases**: Operations that should be denied

**Example: Comprehensive RLS Test**:

```typescript
describe('User API - RLS Policy Tests', () => {
  const userId1 = crypto.randomUUID();
  const userId2 = crypto.randomUUID();

  beforeEach(async () => {
    await db.query(`
      INSERT INTO general_users (id, account_name, display_name)
      VALUES ($1, 'user1', 'User One'), ($2, 'user2', 'User Two')
    `, [userId1, userId2]);

    await db.query(`
      INSERT INTO user_profiles (user_id, bio, avatar_url)
      VALUES ($1, 'Bio 1', 'https://example.com/1.jpg'),
             ($2, 'Bio 2', 'https://example.com/2.jpg')
    `, [userId1, userId2]);
  });

  describe('SELECT policy', () => {
    it('authenticated user can fetch own profile', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 });
      const profile = await getUserProfile(userId1);
      expect(profile.user_id).toBe(userId1);
    });

    it('authenticated user can fetch other user profile (public info)', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 });
      const profile = await getUserProfile(userId2);
      expect(profile.user_id).toBe(userId2);
    });

    it('anonymous user cannot fetch profile', async () => {
      db.setContext({ role: 'anon' });
      await expect(getUserProfile(userId1)).rejects.toThrow();
    });
  });

  describe('UPDATE policy', () => {
    it('authenticated user can update own profile', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 });
      const updated = await updateUserProfile(userId1, { bio: 'Updated bio' });
      expect(updated.bio).toBe('Updated bio');
    });

    it('authenticated user cannot update other user profile', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 });
      await expect(
        updateUserProfile(userId2, { bio: 'Hacked!' })
      ).rejects.toThrow(/row-level security policy/);
    });
  });
});
```

#### Test Execution Commands

```bash
# Run all tests
cd frontend
bun test

# Run tests in watch mode
bun test:watch

# Run specific test file
bun test src/entities/user/api/userApi.test.ts

# Run tests with coverage
bun test --coverage
```

#### Best Practices

1. **Test Isolation**: Use unique IDs (`crypto.randomUUID()`) for each test
2. **RLS Error Validation**: Verify RLS policy violations throw correct errors
3. **Multiple Clients**: Separate admin (service role) and user clients
4. **Fixture Data**: Use admin client to bypass RLS when setting up test data

**Example: Admin Client for Fixture Setup**:

```typescript
import { createClient } from '@supabase/supabase-js';

// Admin client (bypasses RLS)
const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }  // IMPORTANT: Disable session persistence
);

beforeEach(async () => {
  // Use admin client to set up fixtures (bypasses RLS)
  await adminClient.from('users').insert([
    { id: userId1, name: 'Alice' },
    { id: userId2, name: 'Bob' }
  ]);
});
```

#### Troubleshooting

**Session Persistence Issue**:

```typescript
// Problem: Test user loses session after sign-in
// Solution: Use jsdom environment in vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',  // Browser-like environment
  },
});
```

**Service Role Client Session Conflict**:

```typescript
// Problem: Service role client picks up regular user session
// Solution: Disable session persistence
const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false }  // Disable storage-based session loading
});
```

**→ For detailed testing guidelines, see [`.agent/rules/testing.md`](.agent/rules/testing.md)**

### Backend Architecture

- **Python Backend**: FastAPI application in `backend-py/` using clean architecture patterns
- **Edge Functions**: Supabase Edge Functions using Deno's native `Deno.serve` API for serverless functions
- **Database**: PostgreSQL with **Drizzle ORM** for schema management, includes pgvector extension for embeddings
- **Schema Management**: Drizzle ORM with TypeScript-based declarative schema definitions and migrations
- **Infrastructure**: Supabase for auth/database, Docker containerization
- **AI Integration**: LangChain, OpenAI, multi-modal AI capabilities, vector search

#### Backend Clean Architecture Structure

```
backend-py/app/src/
├── controller/       # HTTPリクエスト/レスポンス処理のみ
├── usecase/          # ビジネスロジック
├── gateway/          # データアクセス抽象化インターフェース
├── domain/           # エンティティ・モデル（models.py: sqlacodegen生成）
├── infra/            # 外部依存（DB、API client、Supabase）
└── middleware/       # 認証・CORS・ロギング
```

**責務の分離**:
- Controllers: HTTP層のみ、ビジネスロジックを含まない
- Use Cases: ビジネスロジック、orchestration
- Gateways: データアクセスの抽象化（インターフェース定義）
- Infrastructure: Gatewayの実装、外部システムとの統合
- Domain: エンティティ、Value Objects（sqlacodegen自動生成）

**→ For detailed Python backend documentation, see [`backend-py/README.md`](backend-py/README.md)**

#### AI/ML Integration Details

**実装済みの主要AI/MLライブラリ**:

- **LLM Orchestration**:
  - LangChain: 複雑なAIワークフロー構築
  - LangGraph: ステートフルなエージェント実装
  - LangSmith: モニタリング・デバッグ
  - Langchainhub: プロンプトテンプレート管理

- **LLM Providers**:
  - OpenAI: GPT-4, DALL-E, Whisper統合
  - Anthropic: Claude統合（LangChain経由）
  - Replicate: オープンソースモデルAPI
  - FAL: 高速AI推論API

- **Deep Learning & ML**:
  - Torch: ディープラーニングフレームワーク
  - Diffusers: 画像生成（Stable Diffusion等）
  - Transformers: HuggingFace モデル
  - Accelerate: モデル高速化・分散学習

- **Real-time Communication**:
  - LiveKit: WebRTC/リアルタイム音声・映像通信
  - livekit-api: LiveKit API client
  - aiortc: WebRTC実装

- **Voice & Audio**:
  - Cartesia: 音声合成API

- **Vector Search**:
  - pgvector: PostgreSQL拡張、ベクトル類似検索

- **Message Queue**:
  - kombu: メッセージブローカー抽象化
  - tembo-pgmq-python: PostgreSQLベースのメッセージキュー

### Database Design

- Multi-client architecture with corporate users, general users, and virtual users
- Chat system with rooms, messages, and user relationships
- Vector embeddings table for AI/ML features
- Clean separation between user types and permissions

### Package Management

**重要**: このプロジェクトは**ルートにpackage.jsonを持たない**独立型モノレポ構成です。

各コンポーネントは用途に応じて最適なパッケージマネージャーを使用しています：

- **Frontend** (`frontend/`): **Bun 1.2.8**
  - 高速なJavaScript runtime & package manager
  - Node.js完全互換、npmの代替
  - Bun workspaceでモノレポ管理
  - `frontend/package.json`で依存関係管理

- **Backend Python** (`backend-py/`): **uv**
  - Rust製の超高速Pythonパッケージマネージャー
  - Ruff（linter）開発元による信頼性
  - `backend-py/app/pyproject.toml`で依存関係管理

- **Drizzle** (`drizzle/`): **Bun**
  - frontendと同様にBunを使用
  - 独立したパッケージとして管理
  - `drizzle/package.json` + `drizzle/node_modules/`

- **Edge Functions** (`supabase/functions/`): **Deno**
  - Deno runtime組み込みのパッケージマネージャー
  - `npm:` prefixでnpmパッケージをインポート
  - 各関数の`deno.json`でimport map管理

**ディレクトリ構成**:
```
/
├── drizzle/
│   ├── package.json          # Drizzle専用依存関係
│   └── node_modules/         # Drizzle専用モジュール
├── frontend/
│   ├── package.json          # Frontend workspace定義
│   └── node_modules/         # Frontend全体のモジュール
└── backend-py/
    └── app/
        ├── pyproject.toml    # Python依存関係（uv管理）
        └── .venv/            # Python仮想環境
```

この構成により、各コンポーネントが独立して最適なツールを使用でき、依存関係の競合を防ぎます。

### ni (パッケージマネージャー抽象化)

このプロジェクトは [ni](https://github.com/antfu-collective/ni) を使用してパッケージマネージャーコマンドを統一しています。`ni` はプロジェクトのロックファイル（`bun.lockb`, `package-lock.json` など）を自動検出し、適切なパッケージマネージャーのコマンドを実行します。

#### 主要コマンド

| ni コマンド | Bun 変換結果 | 用途 |
|---|---|---|
| `ni` | `bun install` | 依存関係インストール |
| `ni package` | `bun add package` | パッケージ追加 |
| `ni -D package` | `bun add -d package` | 開発依存追加 |
| `nr script` | `bun run script` | スクリプト実行 |
| `nlx command` | `bunx command` | 一時実行 |
| `nun package` | `bun remove package` | パッケージ削除 |
| `nci` | `bun install --frozen-lockfile` | CI用クリーンインストール |

#### インストール

```bash
# macOS/Linux (Homebrew)
brew install ni

# または npm
npm install -g @antfu/ni
```

**注記**: `make init` 実行時に ni がインストールされていない場合、エラーが表示されます。

#### 使用例

```bash
# Frontend で依存関係をインストール
cd frontend && ni

# スクリプト実行
cd frontend && nr dev
cd drizzle && nr generate

# 一時実行（bunx 相当）
cd frontend && nlx tsc --noEmit
```

## Development Commands

### Initial Setup

```bash
make init                    # Full project initialization (run once)
```

### Running Services

```bash
make run                     # Start backend services with Docker
make frontend                # Start frontend (web) development server
make stop                    # Stop all services
```

### Lint & Format

```bash
# フロントエンド（Biome）
make lint-frontend           # Biome lint（自動修正）
make lint-frontend-ci        # Biome lint（CI用、修正なし）
make format-frontend         # Biome format（自動修正）
make format-frontend-check   # Biome formatチェック（チェックのみ）
make type-check-frontend     # TypeScript型チェック

# Drizzle（Biome）
make lint-drizzle            # Biome lint（自動修正）
make lint-drizzle-ci         # Biome lint（CI用、修正なし）
make format-drizzle          # Biome format（自動修正）
make format-drizzle-check    # Biome formatチェック（チェックのみ）

# Backend Python（Ruff + MyPy）
make lint-backend-py         # Ruff lint（自動修正）
make lint-backend-py-ci      # Ruff lint（CI用、修正なし）
make format-backend-py       # Ruff format（自動修正）
make format-backend-py-check # Ruff formatチェック（チェックのみ）
make type-check-backend-py   # MyPy型チェック（strict mode）

# Edge Functions（Deno）
make lint-functions          # Deno lint
make format-functions        # Deno format（自動修正）
make format-functions-check  # Deno formatチェック（チェックのみ）
make check-functions         # Deno型チェック（全関数自動検出）

# 統合コマンド（推奨）
make lint                    # 全体のlint（Frontend + Drizzle + Backend Python + Edge Functions）
make format                  # 全体のformat（自動修正）
make format-check            # 全体のformatチェック（CI用）
make type-check              # 全体の型チェック
make ci-check                # CI用の全チェック（lint + format + type）
```

### Database Operations

```bash
# 開発用マイグレーション
make migrate-dev           # マイグレーション生成 + 適用 + 型生成（ローカル専用）
make migration             # migrate-dev のエイリアス

# 本番用マイグレーション適用
make migrate-deploy        # マイグレーションファイルを適用（全環境）
ENV=staging make migrate-deploy    # ステージング環境
ENV=production make migrate-deploy # 本番環境

# 型生成（通常は migrate-dev に含まれる）
make build-model           # Supabase型とSQLModelを生成
```

### Model Generation

```bash
make build-model-frontend  # Generate Supabase types for frontend
make build-model-functions # Generate types + copy Drizzle schema for Edge Functions
```

**Edge Functions 用に生成されるもの**:

- `supabase/functions/shared/types/supabase/schema.ts` - Supabase TypeScript 型
- `supabase/functions/shared/drizzle/` - Drizzle スキーマ（TypeScript）

### Frontend Development

```bash
cd frontend
bun run dev                 # Next.js web development (Turbo)
bun run build              # Build all packages
bun run lint               # Run Biome lint (auto-fix)
bun run format             # Format code with Biome
bun run type-check         # TypeScript type checking
```

### Backend Development (Python)

Backend follows clean architecture with strict separation of concerns:

- Controllers handle HTTP requests/responses only
- Use cases contain business logic
- Gateways provide data access interfaces
- Infrastructure handles external dependencies

Code quality tools:

- Ruff for linting (line length: 88)
- MyPy for type checking (strict mode)
- Maximum function complexity: 3 (McCabe)

### Edge Functions Development

Edge Functions use Deno's native `Deno.serve` API for serverless API development:

- Built with Deno runtime for TypeScript support
- Native `Deno.serve` API for lightweight, efficient serverless functions
- Each function should have a `deno.json` with import map configuration
- **IMPORTANT**: 原則として `npm:` プレフィックスを使用して npm パッケージをインポート
  - JSR (`jsr:`) は特別な理由がない限り使用しない
  - 例: `"@supabase/supabase-js": "npm:@supabase/supabase-js@^2"`
- Type-safe integration with Supabase client and database schema
- Proper error handling with TypeScript type guards (`error instanceof Error`)

#### Edge Functions で Drizzle スキーマを使用

Edge Functions でも Drizzle スキーマを直接使用できます：

```typescript
// supabase/functions/example/index.ts
import type { InferSelectModel, InferInsertModel } from "npm:drizzle-orm";
import { generalUsers, generalUserProfiles } from "../shared/drizzle/index.ts";

// 型を推論
type User = InferSelectModel<typeof generalUsers>;
type NewUser = InferInsertModel<typeof generalUsers>;
type UserProfile = InferSelectModel<typeof generalUserProfiles>;

Deno.serve(async (req) => {
  const user: User = {
    id: crypto.randomUUID(),
    displayName: "John Doe",
    accountName: "johndoe",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return new Response(JSON.stringify({ user }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**メリット**:

- TypeScript の型安全性を享受
- スキーマ変更時に型が自動更新される（`make build-model` 実行時）
- Supabase 生成型と Drizzle 型の両方を使い分け可能

**→ For detailed Edge Functions documentation, see [`supabase/functions/README.md`](supabase/functions/README.md)**

## Supabase Configuration Management

**IMPORTANT**: Supabase service configurations and database schema management are handled separately.

### Configuration Responsibilities

#### 1. Supabase Service Configuration (`supabase/config.toml`)

**Use for**: Infrastructure and service-level configurations

- **Authentication**: OAuth providers, JWT settings, email/SMS, MFA
  - `[auth]`, `[auth.email]`, `[auth.sms]`, `[auth.mfa]`
  - `[auth.external.apple]`, `[auth.external.google]`, etc.
- **Storage**: File size limits, buckets, image transformation
  - `[storage]`, `[storage.buckets.*]`
- **API**: Port, schemas exposed via API, max rows, TLS settings
  - `[api]`
- **Realtime Service**: Enable/disable service, port settings
  - `[realtime]` - Service configuration only
  - **Note**: Actual Realtime publications (which tables support realtime) are managed in Drizzle
- **Studio**: Supabase Studio settings
  - `[studio]`
- **Edge Runtime**: Deno version, policies
  - `[edge_runtime]`
- **Analytics**: Backend configuration
  - `[analytics]`

**Configuration Example**:
```toml
# Enable OAuth provider
[auth.external.google]
enabled = true
client_id = "your-client-id"
secret = "env(GOOGLE_OAUTH_SECRET)"
redirect_uri = "http://127.0.0.1:3000/auth/callback"

# Configure storage limits
[storage]
enabled = true
file_size_limit = "50MiB"

# Add storage bucket
[storage.buckets.avatars]
public = true
file_size_limit = "5MiB"
allowed_mime_types = ["image/png", "image/jpeg"]
```

**When to Edit**: When you need to:
- Add OAuth providers (Google, GitHub, etc.)
- Change JWT expiry time
- Configure email/SMS providers
- Adjust storage limits or add buckets
- Modify API settings (ports, schemas exposed)
- Enable/disable Supabase services

#### 2. Database Schema Management (`drizzle/`)

**Use for**: Database structure and data access rules

- **Tables**: Schema definitions with TypeScript
- **RLS Policies**: Row-level security policies
- **Realtime Publications**: Enable realtime updates for specific tables
- **Functions**: PostgreSQL functions and triggers
- **Extensions**: pgvector, custom extensions
- **Enums**: Database enum types
- **Check Constraints**: Data validation rules

**When to Edit**: When you need to:
- Add/modify database tables
- Change RLS policies
- Enable/configure realtime updates for tables
- Add database functions or triggers
- Modify table relationships

**→ See next section for Drizzle ORM details**

---

### Drizzle Schema Management

**IMPORTANT**: このプロジェクトは **Drizzle ORM** でデータベーススキーマを管理しています（Atlas/Prisma から移行済み）。

#### スキーマ構成

スキーマは `drizzle/` ディレクトリに TypeScript 形式で定義されています：

```
drizzle/
├── drizzle.config.ts         # Drizzle Kit設定ファイル
├── migrate.ts                # カスタムSQL実行スクリプト（プログラマティック実行）
├── schema/
│   ├── schema.ts             # メインスキーマ（テーブル、RLS、check制約を一元管理）
│   ├── types.ts              # Enum定義
│   └── index.ts              # Public API（スキーマのエクスポート）
├── config/
│   └── functions.sql         # カスタムSQL（関数・トリガー・拡張）
└── (migrations stored in supabase/migrations/)
```

**重要**: `drizzle/`ディレクトリは独立したパッケージとして管理されており、独自の`package.json`と依存関係を持っています。プロジェクトルートはクリーンに保たれています。

**モノレポ構成**:

```
/
├── package.json              # ワークスペース定義（drizzle, frontendを含む）
├── drizzle/
│   ├── package.json          # Drizzle専用の依存関係とスクリプト
│   ├── node_modules/         # Drizzle専用の依存関係
│   ├── drizzle.config.ts
│   └── ...
└── frontend/
    ├── package.json          # フロントエンド専用の依存関係とスクリプト
    └── ...
```

**重要**: Drizzle Kit は 1 つのデータベースのみを使用：

- **url database** (localhost:54322): Supabase Local DB
  - スキーマ定義からマイグレーション SQL を自動生成
  - 生成されたマイグレーションを適用
  - 開発データが保存される

#### スキーマ変更ワークフロー

**ローカル開発**:

```bash
# 1. スキーマ編集
vi drizzle/schema/schema.ts

# 2. マイグレーション生成 + 適用 + 型生成
make migrate-dev
# または短縮形
make migration

# 3. 生成されたマイグレーションファイルを確認
cat supabase/migrations/0000_*.sql

# drizzle/ディレクトリ内で直接実行する場合
cd drizzle
bun run generate  # マイグレーション生成
bun run migrate   # マイグレーション適用
bun run check     # スキーマ検証
bun run studio    # Drizzle Studio起動

# 4. Gitにコミット
git add supabase/migrations/
git commit -m "Add new feature schema"
git push
```

**リモート環境（CI/CD or 手動）**:

```bash
# 1. マイグレーションファイルを取得
git pull

# 2. マイグレーション適用
ENV=staging make migrate-deploy
# または本番環境
ENV=production make migrate-deploy
```

#### RLS（Row Level Security）の宣言的管理

**重要**: RLS は完全に Drizzle ORM の `pgPolicy` 関数で管理され、**テーブル定義と同じファイル**（`schema.ts`）に配置されています。

**テーブル定義と RLS ポリシーを一緒に管理**:

```typescript
import { pgTable, uuid, text, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// テーブル定義
export const generalUsers = pgTable("general_users", {
  id: uuid("id").primaryKey(),
  accountName: text("account_name").notNull().unique(),
  // ... 他のカラム ...
}).enableRLS(); // RLS有効化

// 直後にそのテーブルのRLSポリシーを定義
export const selectOwnUser = pgPolicy("select_own_user", {
  for: "select",
  to: ["anon", "authenticated"],
  using: sql`true`,
}).link(generalUsers);

export const editPolicyGeneralUsers = pgPolicy("edit_policy_general_users", {
  for: "all",
  to: "authenticated",
  using: sql`(SELECT auth.uid()) = id`,
  withCheck: sql`(SELECT auth.uid()) = id`,
}).link(generalUsers);
```

**ポリシーパラメータ**:

- **for**: 操作タイプ（`'select'`, `'insert'`, `'update'`, `'delete'`, `'all'`）
- **to**: 適用対象ロール（配列または文字列）
- **using**: 閲覧・編集可能な行の条件（`sql` タグ付きテンプレート）
- **withCheck**: 挿入・更新時の検証条件（`sql` タグ付きテンプレート）

**メリット**:

- TypeScript の型安全性を享受
- テーブルとその RLS ポリシーを同じファイルで確認可能
- 認知負荷が低い（ファイル間を移動する必要がない）
- 変更時にテーブルとポリシーを一緒に編集できる

#### マイグレーション管理

- Drizzle Kit は自動的にマイグレーション SQL を生成
- マイグレーション履歴は `supabase/migrations/` に保存
- ロールバックは手動でマイグレーションファイルを削除して再適用

**カスタム SQL（関数・トリガー・拡張）の管理**:

カスタム SQL（pgvector 拡張、認証フック、トリガーなど）は `drizzle/config/functions.sql` で管理し、**プログラマティック**に実行されます：

```typescript
// drizzle/migrate.ts - カスタムSQL実行スクリプト
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// functions.sqlを読み込んで実行
const customSql = readFileSync("drizzle/config/functions.sql", "utf-8");
await db.execute(sql.raw(customSql));
```

**実行タイミング**:

- `make migrate-dev`: マイグレーション適用後に自動実行
- `make migrate-deploy`: マイグレーション適用後に自動実行（全環境）

**メリット**:

- CLI ツール（`psql`）に依存しない
- TypeScript で型安全に実行
- エラーハンドリングが統一的
- 環境変数管理がシンプル

#### Realtime Publications の管理

Supabase Realtimeのpublication（どのテーブルでリアルタイム更新を有効にするか）は、`drizzle/config/functions.sql` で管理します：

```sql
-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chats;

-- Remove table from realtime (if needed)
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.table_name;
```

**Note**: `supabase/config.toml` の `[realtime]` セクションはRealtimeサービスの有効化とポート設定のみです。実際にどのテーブルがリアルタイム更新をサポートするかはDrizzleで管理します。

詳細は Drizzle 公式ドキュメントを参照してください。

**→ For detailed Drizzle ORM documentation, see [`drizzle/README.md`](drizzle/README.md)**

## Code Style and Quality

### Frontend

- **Linting & Formatting**: Biome (高速なオールインワンツールチェーン)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: TailwindCSS 4 with CSS variables
- **Code Style**: 2-space indentation, 100-character line width, single quotes, semicolons as needed
- **TypeScript**: Strict mode enabled
- **Import Organization**: Auto-organize imports with type-only import enforcement

### Date and Time Handling (Supabase + Database Best Practices)

日時処理に関する重要な原則とベストプラクティス:

#### データベース設定

1. **Drizzle Schema**:

   - 全ての日時カラムに `timestamp` with `withTimezone: true` と `precision: 3` を使用
   - PostgreSQL の `TIMESTAMP WITH TIME ZONE` 型にマップされる
   - ミリ秒精度(3)は JavaScript の `Date` オブジェクトと完全互換

2. **Supabase/PostgreSQL**:
   - データベースのタイムゾーンは UTC を維持（Supabase デフォルト）
   - タイムゾーン付きで挿入されたデータも内部的には UTC で保存
   - 一貫性のため、全ての日時データを UTC として扱う

#### クライアント実装の原則

1. **クライアントコンポーネントで処理**:

   - 日時の表示・フォーマットは必ずクライアントコンポーネント（`'use client'`）で行う
   - Next.js のサーバーコンポーネントで日時をフォーマットしない
   - SSR とクライアントのタイムゾーン不一致によるハイドレーションエラーを防ぐ

2. **データベース保存時**:

   - JavaScript の `Date` オブジェクトを `toISOString()` で ISO 8601 形式に変換
   - データベースは自動的に UTC として保存
   - `Date.now()` は使用しない（Unix タイムスタンプはエラーになる）

3. **クライアント表示時**:
   - 必ずクライアントのタイムゾーンに変換して表示
   - `Intl.DateTimeFormat` を使用（ブラウザのタイムゾーン設定を尊重）
   - date-fns や dayjs などのライブラリも活用可能

#### Next.js SSR/CSR ハイドレーション対策

Next.js 公式ドキュメントでは、`Date()` コンストラクタなど時間依存の API を使用するとハイドレーションエラーが発生すると明記されています。以下の方法で対処します:

**重要な前提知識**:

1. **Client Component でも初期レンダリング（SSR）はサーバー側で実行される**

   - `'use client'` を付けても、最初のレンダリングはサーバーで行われる
   - クライアント側でハイドレーション（再レンダリング）が行われる
   - サーバーとクライアントで異なる結果を返すとハイドレーションエラーが発生

2. **ブラウザ API を使う処理は必ず`useEffect`内で実行**

   - `Intl.DateTimeFormat().resolvedOptions().timeZone` などのブラウザ API は`useEffect`内で使用
   - `useEffect`はクライアント側でのみ実行されるため、SSR との不一致が起きない

3. **Server→Client Component への props は必ずシリアライズ可能な値のみ**

   - `Date` オブジェクトはシリアライズ不可能なため、ISO 文字列（`string`）で渡す
   - `toISOString()` で変換してから渡す

4. **タイムゾーン変換は必ずクライアント側で行う**

   - サーバー（UTC）とクライアント（ローカルタイムゾーン）で結果が異なるため
   - `useEffect`内でタイムゾーン変換を実行

5. **推奨パターン: `useEffect` を使用**（最も信頼性が高い）:

   - セマンティックな `<time>` 要素を使用
   - 初回レンダリングでは空文字またはプレースホルダーを表示
   - `useEffect` でクライアント側タイムゾーンに変換して状態を更新
   - サーバーとクライアントで異なるコンテンツをレンダリングする場合のみ `suppressHydrationWarning` を追加

6. **代替パターン 1: Dynamic Import with SSR 無効化**:

   ```typescript
   import dynamic from "next/dynamic";

   const DateDisplay = dynamic(() => import("./DateDisplay"), {
     ssr: false,
     loading: () => <time>読み込み中...</time>,
   });
   ```

7. **代替パターン 2: next-intl を使用**（国際化対応が必要な場合）:

   - `useNow()` / `getNow()` で安定した時刻取得
   - サーバーとクライアント間で一貫性のある時刻処理

8. **Cookie ベースの最適化**（オプション）:
   - Cookie にタイムゾーンを保存して 2 回目以降の訪問で使用
   - 初回訪問時はデフォルトタイムゾーン（UTC または地域デフォルト）を使用

**重要な注意点**:

- `suppressHydrationWarning` は App Router で再レンダリングを防ぐ場合があるため、主に静的な datetime 属性に使用
- 動的にコンテンツが変わる場合は `useEffect` パターンを優先
- Next.js 公式ドキュメント: https://nextjs.org/docs/messages/react-hydration-error

#### 実装例

```typescript
// ✅ Good: 推奨パターン - useEffect を使用したクライアントコンポーネント
"use client";

import { useEffect, useState } from "react";

interface DateDisplayProps {
  utcDate: string; // 必ずISO文字列で受け取る（Dateオブジェクトはシリアライズ不可）
  className?: string;
}

export function DateDisplay({ utcDate, className }: DateDisplayProps) {
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [isoDate, setIsoDate] = useState<string>("");

  useEffect(() => {
    // すべての日時処理をuseEffect内で実行（ブラウザAPIを使用するため）
    const date = new Date(utcDate);

    // ISO形式（datetime属性用）
    setIsoDate(date.toISOString());

    // ユーザーのタイムゾーンでフォーマット（ブラウザAPI使用）
    const formatted = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(date);
    setFormattedDate(formatted);
  }, [utcDate]);

  // ハイドレーションエラーを防ぐため、初回は空を表示
  // SSRでは空文字、クライアントでuseEffectが実行されて値が設定される
  if (!formattedDate) {
    return <time className={className}>読み込み中...</time>;
  }

  return (
    <time dateTime={isoDate} className={className}>
      {formattedDate}
    </time>
  );
}

// Server Componentから使用する場合
// app/page.tsx
import { DateDisplay } from "@/components/DateDisplay";

export default async function Page() {
  // DBから取得したDateオブジェクトをISO文字列に変換
  const eventDate = new Date("2025-01-15T10:30:00Z");

  return (
    <div>
      {/* 必ずISO文字列で渡す */}
      <DateDisplay utcDate={eventDate.toISOString()} />
    </div>
  );
}

// ✅ Good: Dynamic Import でSSRを無効化（代替パターン）
// app/page.tsx
import dynamic from "next/dynamic";

const DateDisplay = dynamic(() => import("@/components/DateDisplay"), {
  ssr: false,
  loading: () => <time>読み込み中...</time>,
});

export default function Page() {
  return <DateDisplay utcDate="2025-01-15T10:30:00Z" />;
}

// ✅ Good: next-intl を使用（国際化対応アプリの場合）
("use client");

import { useFormatter, useNow } from "next-intl";

export function InternationalizedDateDisplay({ utcDate }: { utcDate: string }) {
  const format = useFormatter();
  const now = useNow(); // サーバーとクライアントで一貫した時刻
  const date = new Date(utcDate); // ISO文字列からDateオブジェクトに変換

  return (
    <time dateTime={utcDate}>
      {format.dateTime(date, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}

// ✅ Good: Supabase へのデータ保存
const saveEvent = async (eventDate: Date) => {
  await supabase.from("events").insert({
    event_date: eventDate.toISOString(), // ISO 8601 形式でUTCとして保存
  });
};

// ✅ Good: ユーザー入力からの日時保存
const saveEventFromUserInput = async (
  year: number,
  month: number,
  day: number
) => {
  // ユーザーのローカルタイムゾーンで Date オブジェクトを作成
  const userDate = new Date(year, month - 1, day);

  // toISOString() で UTC に変換して保存
  await supabase.from("events").insert({
    event_date: userDate.toISOString(),
  });
};

// ❌ Bad: Dateオブジェクトをpropsで渡す（シリアライズ不可）
export default function BadPage() {
  const eventDate = new Date("2025-01-15T10:30:00Z");
  // Dateオブジェクトはシリアライズできないため、エラーになる
  return <DateDisplay utcDate={eventDate} />;
}

// ❌ Bad: サーバーコンポーネントでタイムゾーン変換
export function ServerDateDisplay({ utcDate }: { utcDate: string }) {
  // サーバー側でローカライズすると、クライアントとタイムゾーンが異なる
  // ハイドレーションエラーが発生する
  const formatted = new Date(utcDate).toLocaleString("ja-JP");
  return <time>{formatted}</time>;
}

// ❌ Bad: useEffect外でブラウザAPIを使用
("use client");
export function BadClientDateDisplay({ utcDate }: { utcDate: string }) {
  // Intl.DateTimeFormat().resolvedOptions() はブラウザAPIなので
  // SSR時にはundefinedになる可能性がある
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatted = new Date(utcDate).toLocaleString("ja-JP", {
    timeZone: timezone,
  });
  return <time>{formatted}</time>;
}

// ❌ Bad: Date.now() の使用
const badSave = async () => {
  await supabase.from("events").insert({
    event_date: Date.now(), // エラー: Unix タイムスタンプは受け付けられない
  });
};
```

#### Drizzle Schema の例

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  // イベント日時（UTC、ミリ秒精度）
  eventDate: timestamp("event_date", {
    withTimezone: true,
    precision: 3,
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
});
```

#### 重要なポイント

- **一貫性**: DB は常に UTC、表示時のみユーザータイムゾーン
- **精度**: `timestamptz(3)` でミリ秒精度を確保
- **ハイドレーション**: クライアントコンポーネントで日時処理
- **ISO 8601**: `toISOString()` で標準形式に変換
- **型安全性**: Supabase CLI で型を自動生成

この実装により、タイムゾーン関連のバグとハイドレーションエラーを防ぎ、グローバルなアプリケーションでも一貫した日時処理が可能になります。

### UI Design System

このプロジェクトは **shadcn/ui + TailwindCSS 4** を使用した統一的なデザインシステムを採用しています。

#### shadcn/ui Components

- **基盤**: Radix UI primitives（アクセシビリティ対応）
- **スタイル**: TailwindCSS 4 with CSS variables
- **カスタマイズ**: `frontend/apps/web/components.json` で管理
- **共有コンポーネント**: `frontend/packages/ui/components/` に配置

#### UI Implementation Guidelines

1. **shadcn/ui コンポーネントの使用**:

   ```bash
   # 新しいコンポーネントを追加
   cd frontend
   bun run ui:add button card input
   ```

2. **TailwindCSS CSS 変数の使用**:

   ```typescript
   // ✅ Good: CSS変数を使用
   <Card className="border-border bg-background">
     <h2 className="text-foreground">Title</h2>
     <p className="text-muted-foreground">Description</p>
   </Card>

   // ❌ Bad: ハードコードされた色
   <Card className="border-gray-200 bg-white">
     <h2 className="text-black">Title</h2>
     <p className="text-gray-600">Description</p>
   </Card>
   ```

3. **色の管理**:

   - TailwindCSS CSS 変数を使用（`--background`, `--foreground`, `--primary`, etc.）
   - テーマファイル: `frontend/apps/web/app/globals.css`
   - ダークモード対応: `dark:` プレフィックスで自動切り替え

4. **アクセシビリティ**:

   - Radix UI のアクセシビリティ機能を活用
   - ARIA 属性は自動で付与される
   - キーボードナビゲーション対応

5. **レスポンシブデザイン**:
   - TailwindCSS のレスポンシブユーティリティを使用
   - `sm:`, `md:`, `lg:`, `xl:` プレフィックス

### Backend Python

- **Package Manager**: uv（Rust製、高速なPythonパッケージマネージャー）
- **Linting**: Ruff（Rust製の高速linter）
  - 包括的なルールセット（pyproject.toml設定）
  - 行長: 88文字
  - 自動修正機能
- **Type Checking**: MyPy（strict mode）
  - すべての関数に型アノテーション必須
  - 厳密な型チェック
- **Code Style**:
  - Google-style docstrings
  - Async/await for all I/O operations
  - Clean architecture dependency rules enforced
  - Maximum function complexity: 3 (McCabe)
- **Commands**:
  - `make lint-backend-py` - Ruff lint（自動修正）
  - `make format-backend-py` - Ruff format（自動修正）
  - `make type-check-backend-py` - MyPy型チェック

### Edge Functions

- Native `Deno.serve` API for lightweight serverless functions
- TypeScript strict mode with proper type annotations
- Proper error handling with type guards (`error instanceof Error`)
- Deno formatting and linting standards
- **Import Management**:
  - 原則として `npm:` プレフィックスを使用（例: `npm:@supabase/supabase-js@^2`）
  - JSR (`jsr:`) は特別な理由がない限り使用しない
  - `deno.json` の `imports` フィールドで依存関係を管理
  - HTTP インポート（`https://deno.land/x/...`）は使用しない

## Environment Configuration

Environment files are organized by component in the `env/` directory:

```
env/
├── backend/local.env         # Backend service (Supabase URL, etc.)
├── frontend/local.env        # Frontend (Next.js environment variables)
├── migration/local.env       # Database migration (DATABASE_URL)
├── secrets.env               # Secrets (.gitignore, created from example)
└── secrets.env.example       # Template for secrets
```

- **`env/secrets.env`**: Copy from `env/secrets.env.example` and configure with actual credentials (git-ignored)
- **`env/backend/local.env`**: Backend service configuration (Supabase URL, API keys, etc.)
- **`env/frontend/local.env`**: Frontend environment variables (Next.js public variables)
- **`env/migration/local.env`**: Database migration settings (DATABASE_URL for Drizzle)

Environment variables are loaded using dotenvx for secure management.

## Special Notes

### Type Generation

Drizzle スキーマから各プラットフォーム向けに型を生成：

- **Frontend**: Supabase TypeScript 型生成（`make build-model-frontend`）
- **Backend Python**: SQLModel（sqlacodegen でデータベースから直接生成）
- **Edge Functions**:
  - Supabase TypeScript 型生成（`supabase gen types typescript`）
  - **NEW**: Drizzle スキーマを `supabase/functions/shared/drizzle/` にコピー（`make build-model-functions`）
  - `InferSelectModel` / `InferInsertModel` で型推論可能

### AI/ML Features

このプロジェクトは包括的なAI/ML機能を統合しています：

- **Vector Search**: pgvector（PostgreSQL拡張）でベクトル類似検索
- **LLM Orchestration**: LangChain/LangGraphで複雑なAIワークフロー構築
- **LLM Providers**: OpenAI (GPT-4), Anthropic (Claude), Replicate, FAL
- **Image Generation**: Diffusers（Stable Diffusion等）、DALL-E
- **Deep Learning**: PyTorch, Transformers (HuggingFace), Accelerate
- **Real-time Communication**: LiveKit（WebRTC音声・映像）、aiortc
- **Voice Synthesis**: Cartesia API
- **RAG (Retrieval Augmented Generation)**: ベクトル検索 + LLM統合
- **Message Queue**: kombu, tembo-pgmq-python（PostgreSQLベース）
- **Monitoring**: LangSmith（デバッグ・トレーシング）

詳細な統合ライブラリリストは「AI/ML Integration Details」セクションを参照してください。

### Authentication

- Supabase auth integration
- JWT token verification middleware
- User context properly typed throughout application

### Development Workflow

- Use `make` commands for consistency across team
- Environment variables managed through dotenvx
- Docker compose for service orchestration
- Supports multiple development environments (local, staging, production)

## Important Notes for UI Implementation

### shadcn/ui + TailwindCSS 4 Guidelines

フロントエンド UI を実装する際は、以下の手順に従ってください：

1. **コンポーネント設定の確認**

   - `frontend/apps/web/components.json` - shadcn/ui 設定ファイル
   - `frontend/apps/web/app/globals.css` - TailwindCSS CSS 変数定義
   - `frontend/packages/ui/components/` - 共有コンポーネント

2. **利用可能なコンポーネント**

   ```typescript
   // shadcn/uiコンポーネントのインポート
   import { Button } from "@/components/ui/button";
   import {
     Card,
     CardContent,
     CardDescription,
     CardHeader,
     CardTitle,
   } from "@/components/ui/card";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";
   import {
     Dialog,
     DialogContent,
     DialogDescription,
     DialogHeader,
     DialogTitle,
     DialogTrigger,
   } from "@/components/ui/dialog";

   // 使用例
   <Card>
     <CardHeader>
       <CardTitle>タイトル</CardTitle>
       <CardDescription>説明文</CardDescription>
     </CardHeader>
     <CardContent>
       <Button variant="default">ボタン</Button>
     </CardContent>
   </Card>;
   ```

3. **新しいコンポーネントの追加**

   ```bash
   cd frontend
   bun run ui:add <component-name>
   # 例: bun run ui:add table select checkbox
   ```

4. **色の使用ルール**

   - ハードコードされた色（`#ffffff`, `rgb(255,255,255)`, `gray-500`など）は禁止
   - 必ず CSS 変数を使用（`text-foreground`, `bg-background`, `border-border`, `text-primary`など）
   - 新しい色が必要な場合は `app/globals.css` の CSS 変数に追加

5. **アクセシビリティ対応**
   - Radix UI のアクセシビリティ機能を活用
   - コントラスト比の基準に従う
   - 色のみに依存しない情報伝達
   - スクリーンリーダー対応

この実装により、統一的でアクセシブル、メンテナンス可能な UI システムが実現できます。
