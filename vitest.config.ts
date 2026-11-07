import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { testDatabase } from "./tests/support/test-database";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"], // includes tests/support/ (harness checks)
    environment: "node",
    env: testDatabase.env,
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/reset-database.ts"],
    // Every test file shares one database, so files run one at a time.
    fileParallelism: false,
    hookTimeout: 120_000,
  },
});
