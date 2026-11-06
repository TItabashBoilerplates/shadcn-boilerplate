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

すべて devenv の **scripts** (PATH 直結) または **tasks** (`devenv tasks run <name>`) を使用する。Makefile は **deprecated**（削除済み）。直接 `bun run` / `npx` / `cd frontend && ...` での実行は禁止。

```bash
# Lint / Format / Type-check (scripts on PATH)
lint-frontend           # Oxlint (auto-fix)
format-frontend         # Biome format + import assist (auto-fix)
type-check-frontend     # tsrs --noEmit (全 workspace)
lint-fsd                # FSD boundary check (web + mobile + desktop)

# Test
test-frontend           # Vitest
```

正典: `/.claude/rules/commands.md`

JS/TS lint は Oxlint への統一を目標とする。移行中の未対応規則は
`docs/designs/rust-toolchain-migration.md` の移行表・検証結果を確認する。
Biome はフォーマットと import 整理を担当し、lint の重複実行は行わない。
