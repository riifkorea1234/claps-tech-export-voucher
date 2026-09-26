import { expect, it } from "vitest";
import { parseEnvironment, getTestDatabaseUrl } from "../../lib/server/config/env";
it("validates runtime configuration without echoing secret values", () => {
  expect(parseEnvironment({ DATABASE_URL: "postgresql://user:secret@localhost/claps" }).DB_POOL_MAX).toBe(10);
  for (const source of [{}, { DATABASE_URL: "https://user:do-not-log@example.org/db" }, { DATABASE_URL: "postgresql://localhost/db", DB_POOL_MAX: "0" }]) {
    try { parseEnvironment(source); expect.fail("must reject"); } catch (error) { expect(String(error)).toContain("Invalid server configuration"); expect(String(error)).not.toContain("do-not-log"); }
  }
});
it("requires a distinct explicitly named test database", () => {
  expect(() => getTestDatabaseUrl({})).toThrow();
  expect(() => getTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://localhost/production" })).toThrow();
  expect(() => getTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://user:one@localhost/claps_test", DATABASE_URL: "postgresql://other:two@localhost/claps_test" })).toThrow();
  expect(() => getTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://127.0.0.1:5432/claps_test", DATABASE_URL: "postgresql://localhost/claps_test" })).toThrow();
  expect(getTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://localhost/claps_test" })).toContain("claps_test");
});
