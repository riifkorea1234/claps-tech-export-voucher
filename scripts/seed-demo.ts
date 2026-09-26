import { loadEnvConfig } from "@next/env";
import { createDatabase } from "../lib/server/db";
import { getEnvironment } from "../lib/server/config/env";
import { AuthService } from "../lib/server/auth/service";
import { seedDemo } from "../lib/server/demo/seed";
loadEnvConfig(process.cwd());
async function main() {
  const url = getEnvironment().DATABASE_URL;
  if (!/^\/(claps_demo|claps_test(?:_[a-z0-9]+)?)$/.test(new URL(url).pathname)) throw new Error("DEMO_DATABASE_REQUIRED");
  const email = process.env.DEMO_EMAIL, password = process.env.DEMO_PASSWORD;
  if (!email || !password) throw new Error("DEMO_CREDENTIALS_REQUIRED");
  const { pool } = createDatabase(url, 5);
  const auth = new AuthService(pool, async () => { throw new Error("DEMO_SEED_DOES_NOT_SEND_MAIL"); }, process.env.APP_ORIGIN || "http://localhost:3000");
  let raw: string | undefined;
  try {
    raw = (await auth.login({ email, password, locale: "ko" })).token;
    console.log(JSON.stringify({ event: "demo_seed_complete", ...await seedDemo(auth, raw) }));
  } finally { if (raw) await auth.logout(raw); await pool.end(); }
}
main().catch(() => { console.error("Demo seed failed. Use a claps_demo/claps_test database and an existing active account via DEMO_EMAIL/DEMO_PASSWORD."); process.exitCode = 1; });
