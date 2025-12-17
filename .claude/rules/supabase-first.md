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

---

## Storage Policy (MANDATORY)

### Default: Private Buckets

**ALWAYS use Private buckets** unless the user explicitly requests Public buckets.

```toml
# supabase/config.toml
[storage.buckets.documents]
public = false  # DEFAULT: Private
file_size_limit = "50MiB"
```

### File Access via createSignedUrl

Private buckets require signed URLs for file access:

```typescript
// ✅ Correct: Use createSignedUrl for private files
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl('path/to/file.pdf', 60)  // 60秒有効

// ❌ Wrong: getPublicUrl on private bucket (won't work)
const { data } = supabase.storage
  .from('documents')
  .getPublicUrl('path/to/file.pdf')
```

### Path Prefix Convention (RESTful)

Use RESTful hierarchical path structure:

```
{resource}/{id}/{sub-resource}/{filename}
```

Examples:
- `users/{user_id}/avatar.png`
- `users/{user_id}/documents/{doc_id}.pdf`
- `projects/{project_id}/assets/logo.png`

```typescript
// ✅ Correct: RESTful path structure
const path = `users/${userId}/avatar.png`
await supabase.storage.from('files').upload(path, file)

// ✅ Correct: Nested resource
const path = `projects/${projectId}/attachments/${fileId}.pdf`
await supabase.storage.from('files').upload(path, file)

// ❌ Wrong: No resource hierarchy
const path = `avatar.png`
```

### When to Use Public Buckets

Public buckets are allowed **ONLY** when:
1. User explicitly requests it
2. Files are truly public (marketing assets, public blog images)
3. High-performance CDN caching is required

### Prohibited Patterns

**NEVER**:
- Use public buckets for user-uploaded content without explicit approval
- Store sensitive files without RLS policies
- Use `getPublicUrl` for private buckets

## Enforcement

This Supabase-first policy is **NON-NEGOTIABLE**. All backend implementations require explicit justification for why supabase-js is insufficient.
