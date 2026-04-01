#!/bin/sh
set -e

echo "Running Prisma db push..."
if npx prisma db push --schema=packages/db/prisma/schema.prisma --skip-generate 2>&1; then
  echo "Prisma db push succeeded."
else
  echo "WARNING: Prisma db push failed. Schema may already be in sync. Starting server anyway."
fi

echo "Starting API server..."
exec node packages/api/dist/index.js
