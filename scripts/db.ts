import { loadEnvConfig } from "@next/env";
import { createDatabase } from "../lib/server/db";
import { getEnvironment, ConfigurationError } from "../lib/server/config/env";
import { migrateDatabase } from "../lib/server/db/migrate";
import { seedDatabase } from "../lib/server/db/seed";

loadEnvConfig(process.cwd());
async function main() {
  const action = process.argv[2];
  if (action !== "migrate" && action !== "seed") throw new Error("INVALID_DB_COMMAND");
  const { db, pool } = createDatabase(getEnvironment().DATABASE_URL, 1);
  try {
    if (action === "migrate") await migrateDatabase(pool);
    else await seedDatabase(db);
    console.log(JSON.stringify({ event: `db_${action}_complete` }));
  } finally { await pool.end(); }
}
main().catch((error) => {
  console.error(error instanceof ConfigurationError ? error.message : "Database command failed; check configuration and database availability.");
  process.exitCode = 1;
});
