#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL environment variable is required."
  exit 1
fi

case "$DATABASE_URL" in
  *"@localhost"*)
    export DATABASE_URL=$(printf "%s" "$DATABASE_URL" | sed 's/@localhost/@postgres/')
    echo "DATABASE_URL host rewritten from 'localhost' to 'postgres' for Docker network."
    ;;
  *"@127.0.0.1"*)
    export DATABASE_URL=$(printf "%s" "$DATABASE_URL" | sed 's/@127\.0\.0\.1/@postgres/')
    echo "DATABASE_URL host rewritten from '127.0.0.1' to 'postgres' for Docker network."
    ;;
esac

echo "Running Prisma migrations..."
pnpm prisma migrate deploy

if [ "${SKIP_PRISMA_SEED:-0}" != "1" ]; then
  echo "Seeding database..."
  pnpm prisma db seed || echo "Seed step failed (continuing)." >&2
fi

echo "Starting application: $*"
exec "$@"
