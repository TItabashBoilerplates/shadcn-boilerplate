# Frontend

Modern full-stack frontend monorepo built with Next.js 16, React 19, and Feature-Sliced Design architecture.

## Architecture Overview

This frontend follows **Feature-Sliced Design (FSD)**, an architectural methodology that organizes code by business value and technical purpose.

### Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Design System**: shadcn/ui (Radix UI + TailwindCSS 4)
- **Package Manager**: Bun 1.2.8
- **Build System**: Turbo (monorepo management)
- **State Management**: Zustand
- **Internationalization**: next-intl
- **Code Quality**: Biome (linting & formatting)

## Project Structure

```
frontend/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # Next.js App Router
│       │   ├── [locale]/       # Internationalized routes
│       │   ├── layout.tsx
│       │   └── page.tsx
│       └── src/                # Feature-Sliced Design layers
│           ├── app/            # Application layer (providers, global styles)
│           ├── views/          # Views layer (full-page components)
│           ├── widgets/        # Widgets layer (composite UI blocks)
│           ├── features/       # Features layer (business features)
│           ├── entities/       # Entities layer (business entities)
│           └── shared/         # Shared layer (reusable code)
│
├── packages/                   # Shared packages
│   ├── ui/                     # shadcn/ui component library
│   ├── auth/                   # Authentication package
│   ├── types/                  # Supabase type definitions
│   ├── client/                 # Supabase client
│   ├── api-client/             # API client
│   └── utils/                  # Utilities
│
└── tooling/                    # Development tools
    ├── eslint/
    ├── typescript/
    └── tailwind/
```

## Feature-Sliced Design (FSD)

FSD organizes code into **layers** and **slices**, promoting maintainability and scalability.

### Layers (Top to Bottom)

1. **App** (`src/app/`) - Application initialization, providers, global styles
2. **Views** (`src/views/`) - Full-page components (HomePage, LoginPage, etc.)
3. **Widgets** (`src/widgets/`) - Composite UI blocks (Header, Footer, AuthStatus)
4. **Features** (`src/features/`) - Business features (auth, locale-switcher, user-menu)
5. **Entities** (`src/entities/`) - Business entities (user, chat, etc.)
6. **Shared** (`src/shared/`) - Reusable code (UI components, utils, API clients)

### Segments (Within Each Slice)

- **ui** - React components
- **api** - API calls
- **model** - Business logic, types, state management
- **lib** - Utilities
- **config** - Configuration

### Layer Rules

- **Higher layers can import from lower layers** (e.g., Features can import from Entities)
- **Lower layers cannot import from higher layers** (e.g., Entities cannot import from Features)
- **Slices within the same layer cannot import from each other directly** (use lower layers)

## Design System

### shadcn/ui Components

This project uses **shadcn/ui**, a collection of accessible, customizable components built on Radix UI.

#### Adding New Components

```bash
cd frontend
bun run ui:add button card input dialog
```

#### Available Components

- Button, Card, Input, Label
- Dialog, Dropdown Menu, Select
- Avatar, Separator, Navigation Menu
- And more...

### TailwindCSS 4 with CSS Variables

**Use CSS variables for colors** (supports dark mode automatically):

```tsx
// ✅ Good: Using CSS variables
<Card className="border-border bg-background">
  <h2 className="text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</Card>

// ❌ Bad: Hardcoded colors
<Card className="border-gray-200 bg-white">
  <h2 className="text-black">Title</h2>
  <p className="text-gray-600">Description</p>
</Card>
```

#### Available CSS Variables

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`, `--radius`

Theme configuration: `packages/ui/styles/globals.css`

## Development

### Getting Started

```bash
# Install dependencies (from project root)
make init

# Start development server
make frontend
# or
cd frontend
bun run dev
```

### Common Commands

```bash
# Development
bun run dev              # Start Next.js dev server (Turbo)
bun run build            # Build all packages
bun run type-check       # TypeScript type checking

# Code Quality
bun run lint             # Biome lint (auto-fix)
bun run lint:ci          # Biome lint (CI mode, no fix)
bun run format           # Biome format (auto-fix)

# UI Components
bun run ui:add <name>    # Add shadcn/ui component

# Type Generation
bun run generate:types   # Generate Supabase types
```

### Makefile Commands (from project root)

```bash
make lint-frontend           # Biome lint (auto-fix)
make lint-frontend-ci        # Biome lint (CI, no fix)
make format-frontend         # Biome format (auto-fix)
make format-frontend-check   # Biome format check
make type-check-frontend     # TypeScript type check
make build-model-frontend    # Generate Supabase types
```

## Internationalization (i18n)

This project uses **next-intl** for internationalization.

### Supported Locales

- `en` - English
- `ja` - Japanese

### Adding Translations

Edit message files:
- `src/shared/config/i18n/messages/en.json`
- `src/shared/config/i18n/messages/ja.json`

### Usage in Components

```tsx
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('HomePage');

  return <h1>{t('title')}</h1>;
}
```

## Authentication

Authentication is managed through the **@workspace/auth** package.

### Usage

```tsx
import { AuthProvider, useAuth } from '@workspace/auth';

// Wrap your app with AuthProvider
<AuthProvider>
  <App />
</AuthProvider>

// Use authentication in components
function MyComponent() {
  const { user, signIn, signOut } = useAuth();

  if (!user) return <button onClick={signIn}>Sign In</button>;

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Date and Time Handling

**IMPORTANT**: Always handle dates in client components to avoid hydration errors.

### Best Practices

1. **Store dates in UTC** (database timestamps with timezone)
2. **Format dates in client components** (use `'use client'`)
3. **Use `useEffect` for timezone-dependent rendering**

### Example

```tsx
'use client';

import { useEffect, useState } from 'react';

interface DateDisplayProps {
  utcDate: string; // ISO string from server
}

export function DateDisplay({ utcDate }: DateDisplayProps) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    const date = new Date(utcDate);
    const formatted = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    setFormatted(formatted);
  }, [utcDate]);

  if (!formatted) return <time>Loading...</time>;

  return <time dateTime={utcDate}>{formatted}</time>;
}
```

## Code Style

### Biome Configuration

- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quote Style**: Single quotes
- **Semicolons**: As needed
- **Trailing Commas**: ES5

### TypeScript

- **Strict mode**: Enabled
- **Path aliases**:
  - `@/*` → `apps/web/src/*`
  - `@workspace/ui/*` → `packages/ui/*`

## Testing

This project uses **Vitest** for unit testing.

```bash
bun run test              # Run tests
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report
```

## Package Management

This is a **Bun workspace** monorepo. Each package has its own `package.json`.

### Workspace Dependencies

Packages can reference each other using `@workspace/` prefix:

```json
{
  "dependencies": {
    "@workspace/ui": "workspace:*",
    "@workspace/auth": "workspace:*",
    "@workspace/types": "workspace:*"
  }
}
```

### Adding Dependencies

```bash
# Add to specific package
cd apps/web
bun add <package-name>

# Add to workspace root (dev dependencies)
bun add -D <package-name>
```

## Environment Variables

Frontend environment variables are managed in `env/frontend/local.env`.

### Required Variables

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note**: All public variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

## Best Practices

### Component Organization

1. **Use Feature-Sliced Design layers** appropriately
2. **Co-locate related code** (ui, api, model in the same feature slice)
3. **Keep components small** and focused on a single responsibility
4. **Extract reusable components** to the Shared layer

### Styling

1. **Use CSS variables** for colors (dark mode support)
2. **Use shadcn/ui components** as building blocks
3. **Follow TailwindCSS conventions** for utility classes
4. **Avoid inline styles** unless absolutely necessary

### State Management

1. **Use Zustand** for global state (authentication, theme, etc.)
2. **Use React hooks** (useState, useReducer) for local state
3. **Avoid prop drilling** (use context or state management)

### Performance

1. **Use Server Components** by default (Next.js 16)
2. **Add `'use client'`** only when necessary (interactivity, hooks)
3. **Lazy load heavy components** with `dynamic` imports
4. **Optimize images** with Next.js `<Image>` component

## Troubleshooting

### Hydration Errors

If you see hydration errors related to dates or times:
1. Move date formatting to client components (`'use client'`)
2. Use `useEffect` to format dates on the client side
3. See "Date and Time Handling" section above

### Type Errors

If Supabase types are out of sync:
```bash
make build-model-frontend
```

### Build Errors

Clear cache and rebuild:
```bash
bun run clean
bun install
bun run build
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [Feature-Sliced Design](https://feature-sliced.design)
- [next-intl Documentation](https://next-intl-docs.vercel.app)

For project-specific guidelines, see `/CLAUDE.md` in the project root.
