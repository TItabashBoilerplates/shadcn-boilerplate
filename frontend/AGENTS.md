# Frontend Guidelines

## Architecture

- Feature Sliced Design (FSD)
- Segments: api, model, ui
- layers → slices → segments の階層構造

## Components

- Server Components by default
- Client Components: useStateが必要な場合のみ

## State Management

- TanStack Query for server state
- Zustand for global client state

## Styling

- TailwindCSS 4 with CSS variables
- shadcn/ui components
- Biome for formatting

## Commands

```bash
make lint-frontend
make format-frontend
make type-check-frontend
make test-frontend
```
