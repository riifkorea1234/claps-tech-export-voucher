import { loadEnvConfig } from "@next/env";
import { activateInitialLocales } from "../lib/i18n/activate";
import { getDatabase } from "../lib/server/db";
loadEnvConfig(process.cwd());
async function main() {
  const { db, pool } = getDatabase();
  try {
    await activateInitialLocales(db);
    console.log("Initial locale activation checked.");
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error("Locale activation failed. Check registry and file packs.");
  process.exitCode = 1;
});
