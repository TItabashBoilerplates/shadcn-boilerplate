---
paths: frontend/**/*.{ts,tsx,js,jsx}
---

# Frontend Code Standards

## Architecture

- **Pattern**: Feature Sliced Design (FSD)
- **Framework**: Next.js 16 with App Router
- **UI Library**: shadcn/ui (Radix UI + TailwindCSS 4)
- **State Management**: TanStack Query for server state, Zustand for global state

## Code Style

- **Linting & Formatting**: Biome
- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quotes**: Single quotes
- **Semicolons**: As needed
- **TypeScript**: Strict mode enabled

## Import Organization

```typescript
// 1. External packages
import { useState, useEffect } from 'react'
import { useQuery } from '@workspace/query'

// 2. Workspace packages
import { Button } from '@workspace/ui/components'
import { createClient } from '@workspace/client-supabase/client'

// 3. FSD layers (top to bottom)
import { Header } from '@/widgets/header'
import { LoginForm } from '@/features/auth'
import { useUserStore } from '@/entities/user'
import { cn } from '@/shared/lib/utils'

// 4. Relative imports
import { SomeComponent } from './SomeComponent'
```

## CSS/Styling Rules

**MANDATORY**: Use CSS variables, never hardcode colors.

```typescript
// ✅ Good: CSS variables
<Card className="border-border bg-background">
  <h2 className="text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</Card>

// ❌ Bad: Hardcoded colors
<Card className="border-gray-200 bg-white">
  <h2 className="text-black">Title</h2>
</Card>
```

## Date/Time Handling

To prevent hydration errors:

- **DB Storage**: `toISOString()` for UTC format
- **Server → Client**: Pass ISO string (not Date object)
- **Timezone Conversion**: Only in `useEffect` on client side

```typescript
// ✅ Good
<DateDisplay utcDate={event.date.toISOString()} />

// ❌ Bad: Date object as prop
<DateDisplay utcDate={new Date()} />

// ❌ Bad: toLocaleString in Server Component
const formatted = new Date(utcDate).toLocaleString('ja-JP')
```

## Testing

- **Framework**: Vitest with jsdom environment
- **RLS Testing**: supabase-test for policy verification
- **TDD**: Write failing tests first, then implement
