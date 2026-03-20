#!/usr/bin/env bash
# Run EXPLAIN (ANALYZE, BUFFERS) for the Home feed query (see explain-home-feed.sql).
# Usage: from repo root, with DATABASE_URL set:
#   chmod +x scripts/explain-home-feed.sh   # once
#   export DATABASE_URL='postgresql://...'  # or: set -a; source .env.local; set +a
#   ./scripts/explain-home-feed.sh YOUR_USER_CUID
#
# WARNING: ANALYZE executes the query for real (reads/writes buffers). Prefer dev/staging.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/scripts/explain-home-feed.sql"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL is not set (use the same connection string as the app, e.g. from .env.local)" >&2
  exit 1
fi

if [[ $# -ne 1 ]] || [[ -z "$1" ]]; then
  echo "usage: $0 <viewer_user_id>" >&2
  echo "  viewer_user_id = your User.id (cuid) — the account whose Home feed you want to profile" >&2
  exit 1
fi

VIEWER_ID="$1"

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not found. Install PostgreSQL client tools or use Supabase/Neon SQL editor with explain-home-feed.sql" >&2
  exit 1
fi

exec psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v viewer_id="$VIEWER_ID" -f "$SQL"
