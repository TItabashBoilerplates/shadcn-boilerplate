#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ENV="${ENV:-}"

if [ "$ENV" = "local" ] || [ -z "$ENV" ]; then
    echo "⚠️  deploy-supabase is for remote environments only."
    echo ""
    echo "Usage: ENV=stg make deploy-supabase"
    echo "       ENV=prod make deploy-supabase"
    exit 0
fi

echo "🚀 Deploying Supabase resources to $ENV..."
echo ""

# Step 1: Link
"$SCRIPT_DIR/link.sh"

# Step 2: Config
"$SCRIPT_DIR/deploy-config.sh"

# Step 3: Buckets
"$SCRIPT_DIR/deploy-buckets.sh"

# Step 4: Functions
"$SCRIPT_DIR/deploy-functions.sh"

# Step 5: Secrets
"$SCRIPT_DIR/deploy-secrets.sh"

echo ""
echo "✅ Supabase deployment complete!"
