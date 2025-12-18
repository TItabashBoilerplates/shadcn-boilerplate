---
description: "Frontend code standards for Next.js, React, and FSD architecture"
alwaysApply: false
globs: ["frontend/**/*.ts", "frontend/**/*.tsx"]
---
# Frontend Code Standards

## Architecture

- Feature Sliced Design (FSD)
- Segments: api, model, ui

## Components

- Server Components by default
- Client Components only when necessary

## State Management

- TanStack Query for server state
- Zustand for global client state

## Styling

- TailwindCSS 4 with CSS variables
- shadcn/ui components
- Biome for formatting
