import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Empties every table (except Prisma's migration history) so each test
 * starts from the same known state: an empty, fully migrated database.
 */
async function resetDatabase() {
  const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`SELECT DB_NAME() AS name`;
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to reset "${name}": it is not a test database.`);
  }

  await prisma.$executeRawUnsafe(`
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N' NOCHECK CONSTRAINT ALL; '
      FROM sys.tables WHERE name <> N'_prisma_migrations';
    SELECT @sql += N'DELETE FROM ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N'; '
      FROM sys.tables WHERE name <> N'_prisma_migrations';
    SELECT @sql += N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N' WITH CHECK CHECK CONSTRAINT ALL; '
      FROM sys.tables WHERE name <> N'_prisma_migrations';
    EXEC sp_executesql @sql;
  `);
}

beforeEach(resetDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});
