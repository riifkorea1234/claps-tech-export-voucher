import "server-only";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { resolve } from "node:path";
import type { Pool } from "pg";

export async function migrateDatabase(pool: Pool) {
  const client = await pool.connect();
  try {
    // A dedicated connection holds the lock for the entire migration transaction.
    await client.query("SELECT pg_advisory_lock(173624, 1)");
    await migrate(drizzle(client), { migrationsFolder: resolve(process.cwd(), "db/migrations") });
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(173624, 1)"); } finally { client.release(); }
  }
}
