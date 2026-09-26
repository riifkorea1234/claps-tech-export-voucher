import "server-only";
import { z } from "zod";

const databaseUrl = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) && !!url.hostname && url.pathname.length > 1 && !url.hash;
  } catch { return false; }
});
const envSchema = z.object({
  DATABASE_URL: databaseUrl,
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  WORKER_HEARTBEAT_PATH: z.string().startsWith("/").default("/tmp/claps-worker-heartbeat"),
});
export class ConfigurationError extends Error {
  constructor(public readonly fields: string[]) { super(`Invalid server configuration: ${fields.join(", ")}`); this.name = "ConfigurationError"; }
}
export function parseEnvironment(source: Record<string, string | undefined>) {
  const result = envSchema.safeParse(source);
  if (!result.success) throw new ConfigurationError([...new Set(result.error.issues.map((issue) => String(issue.path[0])))]);
  return result.data;
}
// Lazy evaluation keeps runtime secrets out of build-time configuration.
export function getEnvironment() { return parseEnvironment(process.env); }

export function getTestDatabaseUrl(source: Record<string, string | undefined> = process.env) {
  const result = databaseUrl.safeParse(source.TEST_DATABASE_URL);
  if (!result.success) throw new ConfigurationError(["TEST_DATABASE_URL"]);
  const test = new URL(result.data);
  const development = source.DATABASE_URL ? new URL(source.DATABASE_URL) : undefined;
  if (!/^claps_test(?:_[a-z0-9]+)?$/.test(test.pathname.slice(1)) ||
      (development && test.pathname === development.pathname)) {
    throw new ConfigurationError(["TEST_DATABASE_URL (must be a separate claps_test database)"]);
  }
  return result.data;
}
