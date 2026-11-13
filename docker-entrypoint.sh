#!/bin/sh
set -eu

DB_PATH="${DATABASE_PATH:-/app/data/gitsift.db}"
DB_DIR="$(dirname "$DB_PATH")"

mkdir -p "$DB_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "No database at $DB_PATH — copying the seeded demo database."
  cp /app/seed/gitsift.db "$DB_PATH"
fi

# Fly mounts volumes as root. Fix ownership so the unprivileged app can write.
chown -R nextjs:nodejs "$DB_DIR" 2>/dev/null || true

exec gosu nextjs:nodejs "$@"
