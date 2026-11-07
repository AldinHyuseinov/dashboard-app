import { execSync } from "node:child_process";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client";
import { testDatabase } from "./test-database";

const READY_TIMEOUT_MS = 90_000;
const RETRY_INTERVAL_MS = 2_000;

/**
 * Runs once before the whole test run: waits for SQL Server, creates the
 * test database if it doesn't exist, and applies every migration to it.
 */
export default async function setup() {
  const master = new PrismaClient({
    adapter: new PrismaMssql({
      server: testDatabase.host,
      port: testDatabase.port,
      user: testDatabase.user,
      password: testDatabase.password,
      database: "master",
      options: { encrypt: true, trustServerCertificate: true },
    }),
  });

  try {
    await waitForServer(master);
    await master.$executeRawUnsafe(
      `IF DB_ID(N'${testDatabase.name}') IS NULL CREATE DATABASE [${testDatabase.name}]`,
    );
  } finally {
    await master.$disconnect();
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, ...testDatabase.env },
    stdio: "inherit",
  });
}

async function waitForServer(client: PrismaClient) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    try {
      await client.$queryRawUnsafe("SELECT 1");
      return;
    } catch (error) {
      if (Date.now() > deadline) {
        throw new Error(
          `SQL Server is not reachable at ${testDatabase.host}:${testDatabase.port}. ` +
            "Start Docker Desktop, then run `npm test` (it starts the compose `sqlserver` service).",
          { cause: error },
        );
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }
}
