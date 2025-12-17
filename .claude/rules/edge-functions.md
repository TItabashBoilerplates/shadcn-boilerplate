---
paths: supabase/functions/**/*.ts
---

# Edge Functions Code Standards

## Architecture

- **Runtime**: Deno
- **API**: Native `Deno.serve`
- **TypeScript**: Strict mode

## Import Management

**MANDATORY**: Use `npm:` prefix for npm packages.

```typescript
// ✅ Good: npm: prefix
import { createClient } from "npm:@supabase/supabase-js@^2"
import type { InferSelectModel } from "npm:drizzle-orm"

// ❌ Bad: JSR or HTTP imports
import { createClient } from "jsr:@supabase/supabase-js"
import { serve } from "https://deno.land/std/http/server.ts"
```

## deno.json Configuration

Each function should have a `deno.json` with import map:

```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2",
    "drizzle-orm": "npm:drizzle-orm"
  }
}
```

## Error Handling

Use type guards for error handling:

```typescript
// ✅ Good: Type guard
try {
  // ...
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  })
}

// ❌ Bad: Unsafe error access
catch (error) {
  return new Response(error.message)  // error might not have message
}
```

## Drizzle Schema Usage

```typescript
import type { InferSelectModel, InferInsertModel } from "npm:drizzle-orm"
import { generalUsers } from "../shared/drizzle/index.ts"

type User = InferSelectModel<typeof generalUsers>
type NewUser = InferInsertModel<typeof generalUsers>
```

## Response Format

Always include proper headers:

```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
})
```
