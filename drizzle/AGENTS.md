# Database Schema Guidelines

## ORM

- Drizzle ORM for schema definition
- pgPolicy for RLS policies

## Conventions

- UUID primary keys: `uuid_generate_v4()`
- Timestamps: `created_at`, `updated_at`

## Migration

User approval required. Use:

```bash
make migrate-dev      # Generate + apply migration
make build-model      # Regenerate types
```

## RLS

Define RLS policies using pgPolicy in schema files.
