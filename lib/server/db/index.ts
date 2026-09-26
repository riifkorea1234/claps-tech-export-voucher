import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../../db/schema";
import { getEnvironment } from "../config/env";

export function createDatabase(connectionString: string, max = 10) {
  const pool = new Pool({ connectionString, max, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000, statement_timeout: 10_000 });
  // Never emit driver errors: they can contain connection strings and SQL values.
  pool.on("error", () => console.error(JSON.stringify({ level: "error", event: "db_pool_error" })));
  return { pool, db: drizzle(pool, { schema }) };
}
type Database = ReturnType<typeof createDatabase>;
const globalDatabase = globalThis as typeof globalThis & { clapsDatabase?: Database };
export function getDatabase(): Database {
  if (!globalDatabase.clapsDatabase) {
    const env = getEnvironment();
    globalDatabase.clapsDatabase = createDatabase(env.DATABASE_URL, env.DB_POOL_MAX);
  }
  return globalDatabase.clapsDatabase;
}
