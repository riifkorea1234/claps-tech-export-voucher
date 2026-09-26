import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { expect, type APIRequestContext } from "@playwright/test";
import { Pool } from "pg";
export const fixturePassword = "eight888";
export const fixtureEmail = () => `p3-e2e-${randomUUID()}@example.test`;
export async function post(request: APIRequestContext, baseURL: string, action: string, data: unknown) {
  return request.post(`/api/auth/${action}`, { headers: { Origin: baseURL }, data });
}
export async function mailToken(email: string, kind: "verify" | "reset") {
  const directory = process.env.E2E_MAIL_DIR;
  if (!directory) throw new Error("E2E_MAIL_DIR must point to the isolated sandbox");
  let token = "";
  await expect.poll(async () => {
    for (const file of await readdir(directory)) {
      const mail = JSON.parse(await readFile(`${directory}/${file}`, "utf8"));
      if (mail.to === email && mail.kind === kind) token = new URL(mail.url).searchParams.get("token")!;
    }
    return !!token;
  }).toBe(true);
  return token;
}
export async function createAccount(request: APIRequestContext, baseURL: string, profile = true) {
  const email = fixtureEmail();
  expect((await post(request, baseURL, "sign-up", { email, password: fixturePassword })).status()).toBe(200);
  expect((await post(request, baseURL, "verify-email", { token: await mailToken(email, "verify") })).status()).toBe(200);
  if (profile) expect((await request.patch("/api/me", { headers: { Origin: baseURL }, data: { name: "Fixture", org: "Test company", role: "design" } })).status()).toBe(200);
  return email;
}
export async function cleanupAccounts() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/claps_test") throw new Error("Isolated TEST_DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query("SELECT id FROM users WHERE email LIKE 'p3-e2e-%@example.test'"); const ids = rows.map(r => r.id);
    await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [ids]);
    await pool.query("UPDATE projects SET cover='{\"schemaVersion\":1,\"kind\":\"default\"}',active_guide_id=NULL WHERE owner_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM monitoring_records WHERE owner_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM assets WHERE session_id IN(SELECT id FROM asset_sessions WHERE owner_id=ANY($1))", [ids]);
    await pool.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM asset_sessions WHERE owner_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM projects WHERE owner_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM admin_audit_logs WHERE entity_id=ANY($1) OR actor_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM auth_verifications WHERE identifier=ANY($1)", [ids.flatMap(id => [`verify:${id}`, `reset:${id}`])]);
    for (const table of ["auth_sessions", "auth_accounts"]) await pool.query(`DELETE FROM ${table} WHERE user_id=ANY($1)`, [ids]);
    await pool.query("DELETE FROM users WHERE id=ANY($1)", [ids]);
  } finally { await pool.end(); }
}
