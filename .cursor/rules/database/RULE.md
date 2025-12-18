---
description: "Database schema standards for Drizzle ORM and RLS policies"
alwaysApply: false
globs: ["drizzle/**/*.ts"]
---
# Database Schema Standards

## ORM

- Drizzle ORM for schema definition
- pgPolicy for RLS policies

## Conventions

- UUID primary keys (uuid_generate_v4())
- created_at/updated_at timestamps

## Migration

- User approval required
- Use: make migrate-dev
