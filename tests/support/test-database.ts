/**
 * Connection settings for the integration-test database.
 *
 * Defaults match the `sqlserver` service in docker-compose.yml (and the CI
 * service container). Override with TEST_DATABASE_* variables if needed.
 * The DATABASE_* variables the app reads are never taken from the
 * environment here, so tests can't run against the development database.
 */
const host = process.env.TEST_DATABASE_HOST ?? "localhost";
const port = process.env.TEST_DATABASE_PORT ?? "1433";
const user = process.env.TEST_DATABASE_USER ?? "sa";
const password = process.env.TEST_DATABASE_PASSWORD ?? "YourStrong!Passw0rd";
const name = process.env.TEST_DATABASE_NAME ?? "dashboard_test";

if (!name.endsWith("_test")) {
  throw new Error(`Refusing to use "${name}" as the test database: its name must end in "_test".`);
}

export const testDatabase = {
  name,
  host,
  port: Number(port),
  user,
  password,
  /** Environment for the app code and the Prisma CLI under test. */
  env: {
    DATABASE_HOST: host,
    DATABASE_PORT: port,
    DATABASE_USER: user,
    DATABASE_PASSWORD: password,
    DATABASE_NAME: name,
    DATABASE_URL: `sqlserver://${host}:${port};database=${name};user=${user};password={${password}};encrypt=true;trustServerCertificate=true`,
  },
};
