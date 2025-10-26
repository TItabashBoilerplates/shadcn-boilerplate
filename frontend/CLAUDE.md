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
bun run lint                # Run ESLint

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

- ESLint with Next.js recommended configuration
- TypeScript strict mode enabled
- TailwindCSS 4 for styling with CSS variables
- shadcn/ui component library with "New York" style

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

### Rendering Strategy Guidelines

**IMPORTANT**: Always use the appropriate rendering strategy based on the page requirements:

1. **Public Pages (No Authentication Required)**: **SSG/SSR (Server Components)**
   - DO NOT use `'use client'` directive
   - Implement as `async` functions
   - Use `getTranslations` from `next-intl/server` (NOT `useTranslations`)
   - Benefits: Best performance, SEO optimization, works without JavaScript
   - Example: Home page, About page, Blog posts

2. **Authenticated Pages**: **SSR (Server Components)**
   - DO NOT use `'use client'` directive
   - Fetch user-specific data on the server
   - Implement as `async` functions
   - Benefits: Latest data, SEO support, secure data access

3. **Interactive Components**: **CSR (Client Components)**
   - USE `'use client'` directive
   - Use React Hooks (useState, useEffect, etc.)
   - Handle user interactions
   - Example: Forms, real-time updates, animations

4. **Hybrid Approach** (Recommended):
   - Server Component for main page logic
   - Extract interactive parts into separate Client Components
   - Example: HomePage (Server) + LanguageSwitcher (Client)

**Build Output Indicators:**
- `●  (SSG)`: Static Site Generation - Optimal for public pages
- `ƒ  (Dynamic)`: Server-Side Rendering - For authenticated pages
- `○  (Static)`: Static content

For detailed guidelines, see `docs/rendering-strategy.md`

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
