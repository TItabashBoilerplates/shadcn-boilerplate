#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ENV="${ENV:-}"

if [ "$ENV" = "local" ] || [ -z "$ENV" ]; then
    echo "⚠️  Skipping for local environment"
    exit 0
fi

echo "🔐 Setting Secrets..."
cd "$PROJECT_ROOT"

# Apply env/backend/.env.{ENV}
dotenvx run -f "env/backend/.env.${ENV}" -- \
    bash -c 'supabase secrets set --env-file env/backend/.env.${ENV} --project-ref $SUPABASE_PROJECT_REF'

# Apply env/.env.secrets
dotenvx run -f "env/backend/.env.${ENV}" -- \
    bash -c 'supabase secrets set --env-file env/.env.secrets --project-ref $SUPABASE_PROJECT_REF'
