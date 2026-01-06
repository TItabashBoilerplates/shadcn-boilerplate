#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ENV="${ENV:-}"

if [ "$ENV" = "local" ] || [ -z "$ENV" ]; then
    echo "⚠️  Skipping for local environment"
    exit 0
fi

echo "📦 Deploying Edge Functions..."
cd "$PROJECT_ROOT"
npx dotenvx run -f "env/backend/${ENV}.env" -f "env/secrets.env" -- \
    bash -c 'supabase functions deploy --project-ref $SUPABASE_PROJECT_REF'
