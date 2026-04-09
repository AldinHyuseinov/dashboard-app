#!/bin/sh

echo "Waiting for SQL Server to be ready..."
sleep 15 

echo "Running Prisma Sync..."
npx prisma migrate deploy

echo "Starting Next.js..."
node server.js

