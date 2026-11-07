import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createUser } from "./fixtures";
import { testDatabase } from "./test-database";

// Checks the test harness itself, not domain behaviour, so it may look at storage.
describe("Test database", () => {
  it("connects the app to the dedicated test database", async () => {
    const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`SELECT DB_NAME() AS name`;
    expect(name).toBe(testDatabase.name);
  });

  it("holds data created during a test", async () => {
    await createUser("Ivan");
    expect(await prisma.user.count()).toBe(1);
  });

  it("is empty again at the start of the next test", async () => {
    expect(await prisma.user.count()).toBe(0);
  });
});
