# Edge Functions Guidelines

## Module System

- Use `npm:` prefix for npm packages
- Shared code in `_shared/`

## Structure

- One function per directory
- `index.ts` as entry point

## Formatting

- Deno formatter
- `make lint-functions`
- `make format-functions`
