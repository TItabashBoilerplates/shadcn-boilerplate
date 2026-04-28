# Environment Configuration

Environment files are organized by component in the `env/` directory:

```
env/
├── backend/.env.local         # Backend service (Supabase URL, etc.)
├── frontend/.env.local        # Frontend (Next.js environment variables)
├── migration/.env.local       # Database migration (POSTGRES_URL)
├── .env.secrets               # Secrets (.gitignore, created from example)
└── .env.secrets.example       # Template for secrets
```

## Environment File Roles

- **`env/.env.secrets`**: Copy from `env/.env.secrets.example` and configure with actual credentials (git-ignored)
- **`env/backend/.env.local`**: Backend service configuration (Supabase URL, API keys, etc.)
- **`env/frontend/.env.local`**: Frontend environment variables (Next.js public variables)
- **`env/migration/.env.local`**: Database migration settings (POSTGRES_URL for Drizzle)

## Environment Variable Management

Environment variables are loaded using dotenvx for secure management.
