#!/bin/sh
# start.sh

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set. Check Azure App Settings."
  exit 1
fi

echo "Waiting for SQL Server to be ready..."
sleep 15 

echo "Push to db..."
npx prisma db push --accept-data-loss

echo "Starting Next.js..."
node server.js

