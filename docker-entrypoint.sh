#!/bin/sh
set -e

# Seeder databasen foerste gang (hvis den er tom eller ikke findes).
# Selve seed-scriptet tjekker selv om der allerede er data og springer over i saa fald.
DB_FILE="${DATABASE_PATH:-/app/data/bygherrer.db}"

echo "🏗️  Bugherrer starter op…"

if [ ! -f "$DB_FILE" ]; then
  echo "📦 Ingen database fundet ($DB_FILE) — seeder med eksempeldata…"
  # better-sqlite3 ligger i standalone-node_modules; seed via det.
  node scripts/seed.mjs || echo "⚠️  Seed fejlede (fortsætter alligevel — DB oprettes ved foerste request)."
else
  echo "✅ Database fundet: $DB_FILE"
fi

echo "🚀 Starter Next.js-serveren…"
exec "$@"
