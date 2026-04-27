#!/usr/bin/env bash
# dump-prod-to-local.sh
# Copies the production Supabase database to the local Docker instance.
#
# BEFORE RUNNING:
#   1. Get your production DB connection string from:
#      Supabase Dashboard → Project Settings → Database → Connection String → URI
#      It looks like: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
#
#   2. Set the env var:
#      export PROD_DB_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
#
#   3. Make sure local Supabase is running: npx supabase start
#
# USAGE:
#   bash scripts/dump-prod-to-local.sh
#   bash scripts/dump-prod-to-local.sh --data-only   # skip schema, only copy rows

set -euo pipefail

LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DUMP_FILE="scripts/.prod_dump_$(date +%Y%m%d_%H%M%S).sql"
DATA_ONLY=false

for arg in "$@"; do
  [[ "$arg" == "--data-only" ]] && DATA_ONLY=true
done

if [[ -z "${PROD_DB_URL:-}" ]]; then
  echo "ERROR: PROD_DB_URL not set."
  echo "  export PROD_DB_URL=\"postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres\""
  exit 1
fi

echo "==> Dumping production database..."

PG_DUMP_ARGS=(
  --no-owner
  --no-acl
  --schema=public
  --exclude-table=schema_migrations
  -f "$DUMP_FILE"
)

if [[ "$DATA_ONLY" == true ]]; then
  PG_DUMP_ARGS+=(--data-only)
  echo "     Mode: DATA ONLY (schema preserved in local Docker)"
else
  PG_DUMP_ARGS+=(--schema-only)
  echo "     Mode: SCHEMA ONLY (use --data-only to also copy rows)"
  echo ""
  echo "  TIP: Run twice:"
  echo "    bash scripts/dump-prod-to-local.sh              # schema"
  echo "    bash scripts/dump-prod-to-local.sh --data-only  # data"
fi

pg_dump "${PG_DUMP_ARGS[@]}" "$PROD_DB_URL"
echo "==> Dump saved to: $DUMP_FILE"

echo ""
echo "==> Resetting local database and applying dump..."

if [[ "$DATA_ONLY" == false ]]; then
  # Full reset: drop and recreate via Supabase CLI
  npx supabase db reset --local
  echo "==> Local DB reset with all migrations applied."
fi

# Apply the dump
psql "$LOCAL_DB_URL" -f "$DUMP_FILE"
echo ""
echo "==> Done! Production data is now available locally."
echo "    Studio: http://127.0.0.1:54323"
echo ""
echo "  Next steps:"
echo "    npm run seed:rls     # create the 4 RLS test users"
echo "    npm run test:rls     # run RLS tests against local DB"

# Remove dump file after import (comment this out to keep it)
rm "$DUMP_FILE"
echo "==> Dump file removed."
