# Environment Configuration

Environment files are organized by component in the `env/` directory:

```
env/
├── backend/local.env         # Backend service (Supabase URL, etc.)
├── frontend/local.env        # Frontend (Next.js environment variables)
├── migration/local.env       # Database migration (DATABASE_URL)
├── secrets.env               # Secrets (.gitignore, created from example)
└── secrets.env.example       # Template for secrets
```

## Environment File Roles

- **`env/secrets.env`**: Copy from `env/secrets.env.example` and configure with actual credentials (git-ignored)
- **`env/backend/local.env`**: Backend service configuration (Supabase URL, API keys, etc.)
- **`env/frontend/local.env`**: Frontend environment variables (Next.js public variables)
- **`env/migration/local.env`**: Database migration settings (DATABASE_URL for Drizzle)

## Environment Variable Management

Environment variables are loaded using dotenvx for secure management.
