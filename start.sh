#!/bin/sh
# start.sh

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set. Check Azure App Settings."
  exit 1
fi

echo -z "$DATABASE_URL"

echo "Waiting for SQL Server to be ready..."
sleep 15 

echo "Running migrations..."
npx npx prisma migrate deploy --config ./prisma.config.ts

echo "Starting Next.js..."
node server.js

