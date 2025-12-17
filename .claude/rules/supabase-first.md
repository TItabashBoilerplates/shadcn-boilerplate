# Supabase-First Architecture Policy

**MANDATORY**: Prioritize `supabase-js` / `@supabase/ssr` for all data operations. Backend services should be minimal.

## Decision Hierarchy (REQUIRED)

Before implementing any data operation, evaluate in this order:

1. **First**: Can this be done with `supabase-js` / `@supabase/ssr` directly from the frontend?
2. **Second**: If not, is an Edge Function necessary?
3. **Last Resort**: Only use `backend-py` when absolutely required

## When to Use Each Layer

### Frontend with supabase-js / @supabase/ssr (DEFAULT)

**USE for**:
- CRUD operations with RLS policies
- Real-time subscriptions
- Authentication flows
- File uploads to Supabase Storage
- Simple data queries and mutations
- Row-level security protected operations

```typescript
// ✅ Preferred: Direct Supabase client usage
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId)
```

### Edge Functions (WHEN NEEDED)

**USE for**:
- Webhook handlers (Stripe, external services)
- Operations requiring service_role key
- Simple external API integrations
- Scheduled tasks (cron)
- Pre-processing before database writes

### Backend Python (LAST RESORT)

**USE ONLY for**:
- Complex database transactions (multi-table atomic operations)
- Mission-critical business logic requiring audit trails
- External API calls with complex retry/error handling
- AI/ML processing (LangChain, embeddings)
- Long-running background jobs
- Operations requiring Python-specific libraries

## Prohibited Patterns

**NEVER**:
- Create backend endpoints for simple CRUD operations
- Use backend for operations that RLS can secure
- Build API wrappers around basic Supabase queries
- Add unnecessary backend layers "for security" when RLS suffices

```typescript
// ❌ Wrong: Unnecessary backend call for simple query
const response = await fetch('/api/posts')

// ✅ Correct: Direct Supabase query with RLS
const { data } = await supabase.from('posts').select('*')
```

## Justification Required

When proposing backend implementation, you MUST explain:
1. Why supabase-js cannot handle this operation
2. What specific requirement necessitates backend processing
3. Security or business logic constraints involved

## Benefits of This Approach

- Reduced latency (no extra network hop)
- Lower infrastructure costs
- Simpler deployment and maintenance
- Built-in RLS security
- Real-time capabilities out of the box

## Enforcement

This Supabase-first policy is **NON-NEGOTIABLE**. All backend implementations require explicit justification for why supabase-js is insufficient.
