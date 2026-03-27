#!/bin/sh
set -e

echo "Running Prisma db push..."
if npx prisma db push --schema=packages/db/prisma/schema.prisma --skip-generate --accept-data-loss; then
  echo "Prisma db push succeeded."
else
  echo "ERROR: Prisma db push failed (exit code $?). Starting server anyway — schema may be out of sync."
fi

echo "Starting API server..."
exec node packages/api/dist/index.js
