#!/bin/sh

set -eu

psql -v ON_ERROR_STOP=1 -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
"

for migration_path in /migrations/migrations/[0-9][0-9][0-9]_*.sql; do
  migration_name="$(basename "$migration_path")"
  if ! printf '%s' "$migration_name" | grep -Eq '^[0-9]{3}_[a-z0-9_]+\.sql$'; then
    echo "Invalid migration filename: $migration_name" >&2
    exit 1
  fi

  already_applied="$(
    psql -v ON_ERROR_STOP=1 -Atc \
      "SELECT 1 FROM schema_migrations WHERE filename = '$migration_name';"
  )"

  if [ "$already_applied" = "1" ]; then
    echo "Migration already applied: $migration_name"
    continue
  fi

  echo "Applying migration: $migration_name"
  psql -v ON_ERROR_STOP=1 --single-transaction -f "$migration_path"
  psql -v ON_ERROR_STOP=1 -c \
    "INSERT INTO schema_migrations (filename) VALUES ('$migration_name');"
done

echo "All database migrations are up to date."
