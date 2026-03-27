#!/bin/sh
set -e

echo "Running Prisma db push..."
npx prisma db push --schema=packages/db/prisma/schema.prisma --skip-generate --accept-data-loss

echo "Starting API server..."
exec node packages/api/dist/index.js
