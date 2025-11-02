# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Next.js frontend application following Feature-Sliced Design (FSD) methodology:

### Feature-Sliced Design Architecture

- **Methodology**: Feature-Sliced Design (FSD) with strict layer-based organization
- **Application**: Next.js 16 application with App Router
- **UI Framework**: shadcn/ui components with TailwindCSS 4 for styling
- **Tech Stack**: React 19, TypeScript, Next.js 16, shadcn/ui, Lucide React icons
- **Package Manager**: Bun for fast package management and script execution
- **Build System**: Next.js built-in build system with Turbopack (default in Next.js 16)
- **Internationalization**: next-intl for multi-language support (English & Japanese)
- **State Management**: Zustand for client-side state
- **Integration**: Supabase client for backend services

### FSD Layer Structure

```
frontend/
├── app/              # Next.js App Router (at project root, outside src/)
│   ├── [locale]/     # Locale-based routes
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Root page
└── src/              # FSD layers (inside src/)
    ├── app/          # FSD Application layer - providers, global styles
    ├── views/        # FSD Views layer - full page components
    ├── widgets/      # Widgets layer - large composite UI blocks
    ├── features/     # Features layer - business features and user scenarios
    ├── entities/     # Entities layer - business entities and domain models
    └── shared/       # Shared layer - reusable infrastructure code
```

**Important**: FSD architecture notes for Next.js:
- Next.js App Router is at project root (`app/`)
- FSD layers are in `src/` directory
- FSD Views layer (`views/`) renamed from `pages/` to avoid conflict with Next.js
- Use `@/views/*` import alias for FSD views layer

### Layer Import Rules

- **Layers can only import from lower layers**: `app` > `views` > `widgets` > `features` > `entities` > `shared`
- **Same layer imports**: Prohibited (use cross-imports with `@x` notation if absolutely necessary)
- **Upward imports**: Strictly forbidden

## Development Commands

### Frontend Development

```bash
bun install                 # Install dependencies
bun run dev                 # Next.js development server with Turbopack
bun run build               # Build production application
bun run start               # Start production server
bun run lint                # Run Biome linting and formatting (auto-fix)
bun run lint:ci             # Run Biome in CI mode (no auto-fix)
bun run format              # Format code with Biome
bun run format-check        # Check code formatting with Biome
bun run type-check          # TypeScript type checking

# Package management with Bun
bun add <package-name>      # Add runtime dependency
bun add -d <package-name>   # Add development dependency
bun remove <package-name>   # Remove dependency
bun update                  # Update all dependencies
```

### Component Management

#### MagicUI Components (Primary Choice)

```bash
# Use MagicUI MCP for modern, animated UI components
# Access through MagicUI MCP tools - these should be your FIRST choice for any UI needs
# Available categories: Components, Device Mocks, Special Effects, Animations,
# Text Animations, Buttons, Backgrounds
```

#### shadcn/ui Components (Fallback)

```bash
# Add basic shadcn/ui components only when MagicUI doesn't provide suitable alternatives
bunx shadcn@latest add button
bunx shadcn@latest add card
bunx shadcn@latest add input
bunx shadcn@latest add dialog
bunx shadcn@latest add form
```

## Code Style and Quality

### Frontend

- **Linting & Formatting**: Biome (all-in-one toolchain, replaces ESLint + Prettier)
- **Configuration**: `biome.json` at root with Next.js-optimized rules
- **Code Style**: 2-space indentation, 100-character line width, single quotes, semicolons as needed
- **TypeScript**: Strict mode enabled with type-only import enforcement
- **Styling**: TailwindCSS 4 with CSS variables
- **UI Components**: shadcn/ui component library with "New York" style
- **Import Organization**: Auto-organize imports on save/format

### FSD-Compliant UI Design System

- **Primary Components**: MagicUI components (accessed via MCP) for modern, animated UI elements
- **Secondary Components**: shadcn/ui components built on Radix UI primitives (fallback only)
- **Component Placement**: `src/shared/ui/magicui/` for MagicUI, `src/shared/ui/` for shadcn/ui
- **Package Runner**: Use `bunx` instead of `npx` for shadcn/ui component installation
- **Styling**: TailwindCSS with CSS variables for theming
- **Icons**: Lucide React icon library
- **Theme Configuration**: CSS variables defined in `src/app/styles/globals.css`
- **Component Aliases**: Configured in `components.json` with FSD structure
  - `@/shared/ui` - Reusable UI components (shadcn/ui)
  - `@/shared/lib` - Utility functions and libraries
  - `@/shared/api` - API client and request functions
  - `@/shared/config` - Configuration and environment variables
  - `@/entities` - Business entities and domain models
  - `@/features` - Business features and user scenarios
  - `@/widgets` - Composite UI blocks
  - `@/views` - Full page components
  - `@/app` - Application-level code

### FSD Implementation Guidelines

1. **Layer Placement**: Follow strict FSD layer hierarchy and import rules
2. **Components**: Use shadcn/ui components from `shared/ui` layer
3. **Styling**: Use TailwindCSS utility classes, avoid custom CSS
4. **Icons**: Use Lucide React icons consistently
5. **Theme**: Support light/dark modes using CSS variables
6. **Accessibility**: shadcn/ui components are accessible by default
7. **Type Safety**: Use TypeScript for all components and utilities
8. **Public API**: Create index.ts files for each slice to expose public interfaces
9. **Segments**: Organize code within slices using segments (ui, api, model, lib)

### Rendering Strategy Guidelines (Next.js Official Best Practices)

**IMPORTANT**: Always follow Next.js official best practices for rendering strategies:

1. **Public Pages (No Authentication Required)**: **SSG/SSR (Server Components) - MANDATORY**
   - DO NOT use `'use client'` directive
   - Implement as `async` functions
   - Use `getTranslations` from `next-intl/server` (NOT `useTranslations`)
   - Benefits: Best performance, SEO optimization, works without JavaScript
   - Example: Home page, About page, Blog posts

2. **Authenticated Pages (Login Required)**: **Hybrid (SSR + CSR) - STANDARD**

   **Standard Implementation: Hybrid (SSR + CSR) - Next.js Official Recommendation**
   - Page wrapper: Server Component (`async` function, NO `'use client'`)
   - Server-side authentication check with `await auth()` or `await verifySession()`
   - Interactive parts: Client Components (with `'use client'`)
   - Benefits: Fast initial load, server-side auth check, SEO support, security
   - Hydration management: Proper patterns prevent hydration errors (see docs/rendering-strategy.md)
   - Use for: Dashboards, settings pages, profiles, admin panels (almost all authenticated pages)

   **Special Case Only: Full CSR - NOT RECOMMENDED**
   - ⚠️ Use ONLY for real-time chat, collaborative editors requiring persistent WebSocket/SSE
   - Entire page: Client Component (with `'use client'`)
   - Trade-offs: Slower initial load, client-side auth only (security risk), no SEO, against Next.js design philosophy
   - ❌ DO NOT use simply because "it's easier to implement"

3. **Interactive Components**: **CSR (Client Components)**
   - USE `'use client'` directive
   - Use React Hooks (useState, useEffect, etc.)
   - Handle user interactions
   - Example: Forms, real-time updates, animations

4. **Hybrid Pattern** (Standard best practice):
   - Server Component for main page logic, authentication, and data fetching
   - Extract interactive parts into separate Client Components
   - Example: DashboardPage (Server) + UserSettings (Client)
   - This is the default approach for Next.js applications

**Build Output Indicators:**
- `●  (SSG)`: Static Site Generation - Optimal for public pages
- `ƒ  (Dynamic)`: Server-Side Rendering - For authenticated pages
- `○  (Static)`: Static content

For detailed guidelines, see `docs/rendering-strategy.md`

### Supabase Integration Guidelines

This project uses Supabase for backend services with strict adherence to both Next.js and Supabase official best practices.

#### Client Types

| Client Type | Usage | Import | When to Use |
|------------|-------|--------|-------------|
| **Server Client** | Server Components, Server Actions, Route Handlers | `@/shared/lib/supabase/server` | Authentication checks, protected data fetching |
| **Browser Client** | Client Components | `@/shared/lib/supabase/client` | Real-time subscriptions, client interactions |

#### Authentication Best Practices

**🔒 CRITICAL SECURITY REQUIREMENT:**

Always use `supabase.auth.getUser()` to protect pages. **NEVER** trust `supabase.auth.getSession()` in server code.

**Reason:**
- `getSession()`: Cookie-based (can be spoofed) ❌
- `getUser()`: Validated against Supabase Auth server (secure) ✅

#### Implementation Patterns

**Public Pages (No Authentication):**
```tsx
// Server Component
import { createClient } from '@/shared/lib/supabase/server'

export default async function BlogPage() {
  const supabase = createClient()
  const { data } = await supabase.from('posts').select()
  return <BlogList posts={data} />
}
```

**Authenticated Pages (Standard Pattern):**
```tsx
// Server Component - Page wrapper
import { createClient } from '@/shared/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function DashboardPage() {
  await cookies() // Disable cache for user-specific data

  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const { data } = await supabase.from('user_data').select()

  return <Dashboard data={data} user={user} />
}
```

**Client Components with Supabase + Zustand:**
```tsx
// Client Component
'use client'

import { createBrowserClient } from '@/shared/lib/supabase/client'
import { useUserStore } from '@/entities/user/model/store'

export function UserSettings({ initialData }) {
  const supabase = createBrowserClient()
  const updateUser = useUserStore(state => state.updateUser)

  const handleUpdate = async () => {
    const { data } = await supabase.from('profiles').update(...)
    if (data) updateUser(data) // Update Zustand store
  }

  return <button onClick={handleUpdate}>Save</button>
}
```

**Real-time Subscriptions (Client Component Only):**
```tsx
'use client'

import { createBrowserClient } from '@/shared/lib/supabase/client'

export function RealtimeUpdates({ userId }) {
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel(`user:${userId}`)
      .on('postgres_changes', { ... }, handler)
      .subscribe()

    return () => channel.unsubscribe()
  }, [userId])
}
```

#### Usage Matrix

| Feature | Component Type | Supabase Client | State Management |
|---------|---------------|-----------------|------------------|
| Auth check | Server Component | Server Client + `getUser()` | N/A |
| Initial data fetch | Server Component | Server Client | Props |
| Real-time subscriptions | Client Component | Browser Client | useState/Zustand |
| User interactions | Client Component | Browser Client | Zustand |
| Form submissions | Server Action | Server Client | N/A |

#### Security Requirements

1. **Authentication**: Always use Server Component with `getUser()`
2. **Cache Control**: Call `cookies()` before Supabase operations in authenticated pages
3. **Data Minimization**: Pass only necessary data to Client Components
4. **Environment Variables**: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Hydration Error Prevention (CRITICAL)

**⚠️ MUST AVOID HYDRATION ERRORS AT ALL COSTS**

Follow these rules strictly when using Supabase with Next.js:

**Rule 1: Server Component = Static Data Only**
- Only render data that is confirmed on the server
- NO conditional rendering based on auth state in Server Components
- Use `redirect()` for unauthenticated users instead of conditional UI

```tsx
// ✅ GOOD
export default async function Page() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login') // Redirect, not conditional UI
  return <div>Welcome {user.email}</div>
}

// ❌ BAD - Hydration risk
export default async function Page() {
  const { data: { user } } = await supabase.auth.getUser()
  return <div>{user ? 'Logged in' : 'Not logged in'}</div>
}
```

**Rule 2: Client Component = Use `mounted` Flag**
- Always use `mounted` state for browser-dependent logic
- Render `null` or loading state until mounted
- This prevents server/client HTML mismatch

```tsx
// ✅ GOOD
'use client'
export function Component() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  // Safe to use browser APIs here
}
```

**Rule 3: Real-time Data = Client Component Only**
- NEVER use Supabase Realtime in Server Components
- Pass initial data from Server Component to Client Component
- Subscribe to real-time updates in Client Component only

```tsx
// ✅ GOOD Pattern
// Server Component
export default async function Page() {
  const { data: initial } = await supabase.from('posts').select()
  return <PostsList initialData={initial} />
}

// Client Component
'use client'
export function PostsList({ initialData }) {
  const [posts, setPosts] = useState(initialData)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const channel = supabase.channel('posts').on(...)
    return () => channel.unsubscribe()
  }, [])

  if (!mounted) return null
  return <>{posts.map(...)}</>
}
```

**Rule 4: Time/Random Values = Client Component Only**
- Date formatting (timeAgo, relative time, etc.)
- Random values
- All must be in Client Component with `mounted` guard

**Rule 5: Props Flow = Server → Client**
- Server Component fetches initial data
- Pass data to Client Component via props
- Client Component manages dynamic updates

For complete hydration prevention patterns, see `docs/rendering-strategy.md` - "Hydrationエラーの完全回避ガイド" section.

#### Common Patterns

**Pattern 1: Server Component + Client Component Hybrid**
```tsx
// ✅ Recommended
// Server Component handles auth + initial data
// Client Component handles interactivity + Zustand
```

**Pattern 2: Real-time Features**
```tsx
// ✅ Always in Client Component
// Supabase Realtime only works in Browser Client
```

**Pattern 3: Zustand Integration**
```tsx
// ✅ Client Component only
// Server Component passes initial data via props
// Client Component updates Zustand store
```

For complete examples and detailed patterns, see `docs/rendering-strategy.md` - "Next.js + Supabase ベストプラクティス" section.

### Example: FSD-Compliant Implementation with SSR/CSR

```typescript
// ✅ Good example: Public page with SSR (Server Component)
// views/home/ui/HomePage.tsx
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from './LanguageSwitcher'

/**
 * ホームページ（Server Component - SSG）
 * ログイン不要のパブリックページのため、SSRで実装
 */
export default async function HomePage() {
  const t = await getTranslations('HomePage')

  return (
    <div>
      <h1>{t('title')}</h1>
      <LanguageSwitcher /> {/* Interactive part as Client Component */}
    </div>
  )
}

// ✅ Good example: Interactive component (Client Component)
// views/home/ui/LanguageSwitcher.tsx
'use client'

import { Link } from '@/shared/lib/i18n'

/**
 * 言語切り替えコンポーネント（Client Component）
 * ユーザーインタラクションを処理するため、CSRで実装
 */
export function LanguageSwitcher() {
  return (
    <div>
      <Link href="/" locale="en">English</Link>
      <Link href="/" locale="ja">日本語</Link>
    </div>
  )
}

// ✅ Good example: Authenticated page (Supabase + Next.js Best Practice)
// views/dashboard/ui/DashboardPage.tsx
import { createClient } from '@/shared/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { UserSettings } from './UserSettings'

/**
 * ダッシュボードページ（Server Component - Supabase + Next.js公式推奨パターン）
 * サーバーでSupabase認証チェックとデータ取得、インタラクティブ部分のみClient Component
 */
export default async function DashboardPage() {
  await cookies() // Disable cache for user-specific data

  const supabase = createClient() // Supabase Server Client

  // 🔒 Supabase authentication check (MUST use getUser(), not getSession())
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  // Server-side data fetching with Supabase
  const { data: userData } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div>
      {/* Static content rendered on server */}
      <h1>Welcome, {user.email}</h1>
      <p>User ID: {user.id}</p>

      {/* Interactive parts as Client Components */}
      <UserSettings initialData={userData} userId={user.id} />
    </div>
  )
}

// views/dashboard/ui/UserSettings.tsx (Client Component with Supabase + Zustand)
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/shared/lib/supabase/client'
import { useUserStore } from '@/entities/user/model/store'

export function UserSettings({ initialData, userId }) {
  const [settings, setSettings] = useState(initialData)
  const updateUser = useUserStore(state => state.updateUser) // Zustand
  const supabase = createBrowserClient() // Supabase Browser Client

  const handleUpdate = async () => {
    // Supabase Browser Client for client-side operations
    const { data, error } = await supabase
      .from('user_profiles')
      .update(settings)
      .eq('id', userId)
      .select()
      .single()

    if (!error && data) {
      setSettings(data)
      updateUser(data) // Update Zustand store
    }
  }

  return (
    <div>
      <button onClick={handleUpdate}>Update Settings</button>
    </div>
  )
}

// ⚠️ Special case ONLY: Full CSR (NOT RECOMMENDED)
// Use ONLY for real-time chat, collaborative editors, etc.
// views/chat/ui/ChatPage.tsx
'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/shared/lib/websocket'

/**
 * チャットページ（Full CSR - 特殊ケース）
 * ⚠️ WebSocket常時接続が必須のため、例外的にFull CSRを使用
 */
export default function ChatPage() {
  const { messages, sendMessage } = useWebSocket()
  // Real-time bidirectional communication logic
  return <div>{/* Chat UI */}</div>
}

// ✅ Good example: FSD structure with shadcn/ui
// shared/ui/card/index.ts - Reusable UI component
export { Button } from "@/shared/ui/button"
export { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

// entities/user/ui/UserCard.tsx - Business entity component
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Calendar } from "lucide-react"

export function UserCard({ user }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {user.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{user.email}</p>
        <Button variant="default">View Profile</Button>
      </CardContent>
    </Card>
  )
}

// ❌ Bad example: Wrong layer placement and custom styling
// views/home/ui/HomePage.tsx - View importing from non-shared layer
import { UserCard } from "@/entities/user" // ✅ This is correct
import { LoginForm } from "@/features/auth" // ✅ This is correct

// ❌ Wrong - upward import from shared to entities
// shared/ui/SomeComponent.tsx
import { User } from "@/entities/user" // ❌ Shared cannot import from entities
```

## FSD Project Structure

```
frontend/
├── src/                   # Source code following FSD methodology
│   ├── app/              # Application layer
│   │   ├── providers/    # Global providers (Redux, React Query, etc.)
│   │   ├── styles/       # Global styles and CSS variables
│   │   └── index.tsx     # Application entry point
│   ├── views/            # Views layer
│   │   ├── home/         # Home view slice
│   │   │   ├── ui/       # View UI components
│   │   │   ├── api/      # View-specific API calls
│   │   │   └── index.ts  # Public API
│   │   └── auth/         # Auth views slice
│   ├── widgets/          # Widgets layer
│   │   ├── header/       # Header widget
│   │   ├── sidebar/      # Sidebar widget
│   │   └── footer/       # Footer widget
│   ├── features/         # Features layer
│   │   ├── auth/         # Authentication feature
│   │   │   ├── ui/       # Feature UI components
│   │   │   ├── api/      # Feature API calls
│   │   │   ├── model/    # Feature business logic
│   │   │   └── index.ts  # Public API
│   │   └── theme-toggle/ # Theme switching feature
│   ├── entities/         # Entities layer
│   │   ├── user/         # User entity
│   │   │   ├── ui/       # User-related UI components
│   │   │   ├── api/      # User API calls
│   │   │   ├── model/    # User business logic and types
│   │   │   └── index.ts  # Public API
│   │   └── article/      # Article entity
│   └── shared/           # Shared layer
│       ├── ui/           # Reusable UI components (shadcn/ui)
│       │   ├── button/   # Button component
│       │   ├── card/     # Card component
│       │   └── input/    # Input component
│       ├── api/          # API client and base requests
│       │   ├── client.ts # HTTP client configuration
│       │   └── index.ts  # Public API
│       ├── lib/          # Utility functions and libraries
│       │   ├── utils.ts  # General utilities
│       │   └── hooks.ts  # Reusable React hooks
│       └── config/       # Configuration and constants
│           ├── env.ts    # Environment variables
│           └── routes.ts # Route constants
├── app/                  # Next.js App Router (at project root)
│   ├── [locale]/        # Locale-based routes
│   │   ├── layout.tsx   # Locale layout (with i18n provider)
│   │   └── page.tsx     # Locale page (imports from src/views/home)
│   ├── layout.tsx       # Minimal root layout
│   ├── page.tsx         # Root page (triggers 404)
│   └── not-found.tsx    # 404 page
├── components.json       # shadcn/ui configuration (points to src/shared/ui)
├── next.config.ts        # Next.js configuration
├── package.json          # Dependencies and scripts
├── bun.lock              # Bun lockfile (equivalent to package-lock.json)
├── postcss.config.mjs    # PostCSS configuration for Tailwind
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration with FSD paths
```

## FSD Layer Definitions

### App Layer

- **Purpose**: Application initialization, global providers, and configuration
- **Contains**: Providers, global styles, app entry points, routing configuration
- **Examples**: `src/app/providers/index.tsx`, `src/app/styles/globals.css`

### Views Layer

- **Purpose**: Complete view components that compose widgets, features, and entities
- **Contains**: Full page implementations, view-specific logic
- **Segments**: `ui` (view components), `api` (view loaders/actions)
- **Examples**: `views/home/ui/HomePage.tsx`, `views/auth/ui/LoginPage.tsx`

### Widgets Layer

- **Purpose**: Large, composite UI blocks that combine features and entities
- **Contains**: Header, sidebar, footer, complex UI compositions
- **Segments**: `ui` (widget components), `model` (widget state)
- **Examples**: `widgets/header/ui/Header.tsx`, `widgets/article-list/ui/ArticleList.tsx`

### Features Layer

- **Purpose**: Business features and user interaction scenarios
- **Contains**: User actions, business processes, feature-specific logic
- **Segments**: `ui` (feature UI), `api` (feature requests), `model` (business logic)
- **Examples**: `features/auth/ui/LoginForm.tsx`, `features/article-create/api/createArticle.ts`

### Entities Layer

- **Purpose**: Business entities and domain models
- **Contains**: Data models, entity-specific UI components, entity operations
- **Segments**: `ui` (entity components), `api` (CRUD operations), `model` (types, adapters)
- **Examples**: `entities/user/model/types.ts`, `entities/article/ui/ArticleCard.tsx`

### Shared Layer

- **Purpose**: Reusable code without business logic dependencies
- **Contains**: UI kit, utilities, API clients, configurations
- **Segments**: `ui` (shadcn/ui components), `api` (HTTP client), `lib` (utilities), `config` (constants)
- **Examples**: `shared/ui/button/index.ts`, `shared/api/client.ts`

## FSD Implementation Rules

### Public API Pattern

Every slice must export its interface through `index.ts`:

```typescript
// entities/user/index.ts
export { UserCard } from './ui/UserCard'
export { UserAvatar } from './ui/UserAvatar'
export type { User, UserDto } from './model/types'
export { userApi } from './api'
```

### Cross-Import Rules

- **Same layer imports**: Use `@x` notation for necessary cross-references

```typescript
// entities/artist/@x/song.ts
export type { Song } from '../model/song.ts'

// entities/artist/model/types.ts
import type { Song } from 'entities/song/@x/artist'
```

### Segment Organization

Standard segments within slices:

- **ui**: React components and UI logic
- **api**: HTTP requests, data fetching
- **model**: Business logic, types, state management
- **lib**: Slice-specific utilities
- **config**: Slice-specific configuration

This implementation ensures a consistent, scalable, and maintainable FSD architecture.

## MCP Integration Guidelines

### Context7 Documentation Lookup (Mandatory)

Always use Context7 MCP when working with external libraries or frameworks:

1. **Before Implementation**: Always resolve library documentation using Context7

```bash
# Use mcp__context7__resolve-library-id to find correct library ID
# Then use mcp__context7__get-library-docs for up-to-date documentation
```

2. **Required for**: React, Next.js, TypeScript, TailwindCSS, Zustand, Supabase, and any other external dependencies
3. **Benefits**: Ensures you have the latest API documentation and best practices

### MagicUI MCP (Primary UI Component Source)

**IMPORTANT**: Always use MagicUI components as your PRIMARY choice for UI development:

#### Component Selection Priority:

1. **First**: Check MagicUI MCP for suitable components
2. **Second**: Use shadcn/ui only if MagicUI doesn't have what you need
3. **Last**: Create custom components only if neither above options work

#### Available MagicUI Categories:

- **Components**: General UI components (marquee, terminal, bento-grid, etc.)
- **Device Mocks**: Mobile and device mockups (safari, iphone-15-pro, android)
- **Special Effects**: Visual effects (animated-beam, border-beam, particles, etc.)
- **Animations**: Motion and transition effects (blur-fade)
- **Text Animations**: Text-specific animations (animated-gradient-text, typing-animation, etc.)
- **Buttons**: Interactive button components (rainbow-button, shimmer-button, etc.)
- **Backgrounds**: Background patterns and effects (warp-background, animated-grid-pattern, etc.)

#### Implementation Process:

1. Use appropriate MagicUI MCP tool to get component implementation
2. Place components in `src/shared/ui/magicui/` directory
3. Create proper index.ts exports following FSD Public API pattern
4. Import using FSD-compliant paths: `import { Component } from "@/shared/ui/magicui/component"`

### Playwright MCP (UI Testing)

**MANDATORY**: Use Playwright MCP for all UI testing and verification:

#### Testing Requirements:

1. **After UI Changes**: Always test with Playwright before considering work complete
2. **Navigation Testing**: Verify all routes and navigation work correctly
3. **Component Testing**: Test interactive elements, forms, and user flows
4. **Cross-browser**: Test critical paths in different viewport sizes

#### Testing Process:

1. Start development server: `bun run dev`
2. Use `mcp__playwright__browser_navigate` to access pages
3. Use `mcp__playwright__browser_snapshot` to verify page state
4. Use `mcp__playwright__browser_click`, `mcp__playwright__browser_type` for interactions
5. Take screenshots with `mcp__playwright__browser_take_screenshot` when needed

#### Required Test Scenarios:

- Page loads without 404 errors
- All interactive elements respond correctly
- Forms submit and validate properly
- Responsive design works on different screen sizes
- Dark/light mode switching (if implemented)

### Integration Workflow

1. **Documentation**: Use Context7 MCP to get latest library docs
2. **Component Selection**: Check MagicUI MCP first for UI components
3. **Implementation**: Follow FSD architecture with proper layer placement
4. **Testing**: Verify with Playwright MCP before completion
5. **Documentation Update**: Update relevant documentation if needed

This MCP-integrated workflow ensures high-quality, well-tested, and properly documented code.
