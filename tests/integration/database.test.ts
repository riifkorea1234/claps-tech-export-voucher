import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { loadEnvConfig } from "@next/env";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { createDatabase } from "../../lib/server/db";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { seedDatabase } from "../../lib/server/db/seed";
import * as schema from "../../db/schema";

loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { pool } = createDatabase(getTestDatabaseUrl(), 2);
let client: PoolClient;
let manualTransaction = false;
const a = randomUUID(), b = randomUUID(), pa = randomUUID(), pb = randomUUID();
const file = JSON.stringify({ schemaVersion: 1, storageKey: "test/file.png", originalName: "file.png", mimeType: "image/png", size: 1, checksum: "a".repeat(64) });
beforeAll(async () => { await migrateDatabase(pool); await seedDatabase(drizzle(pool, { schema })); });
afterAll(async () => { await pool.end(); });
beforeEach(async () => {
  client = await pool.connect(); await client.query("BEGIN"); manualTransaction = true;
  await client.query("INSERT INTO users(id,email,name) VALUES ($1,$2,'A'),($3,$4,'B')", [a, `${a}@example.test`, b, `${b}@example.test`]);
  await client.query("INSERT INTO projects(id,owner_id,name,ip_name) VALUES ($1,$2,'A','IP'),($3,$4,'B','IP')", [pa, a, pb, b]);
});
afterEach(async () => { if (manualTransaction) await client.query("ROLLBACK"); client.release(); });
async function rejects(sql: string, args: unknown[], code: string) {
  await client.query("SAVEPOINT invalid_write");
  try { await expect(client.query(sql, args)).rejects.toMatchObject({ code }); }
  finally { await client.query("ROLLBACK TO SAVEPOINT invalid_write"); }
}
it("creates exactly the sixteen application tables and required timestamp/index types", async () => {
  const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  expect(rows.map(r => r.tablename).sort()).toEqual(["storage_tickets", "auth_rate_limits", "users", "projects", "partners", "asset_sessions", "assets", "brand_guides", "jobs", "monitoring_records", "admin_audit_logs", "locales", "localized_contents", "auth_sessions", "auth_accounts", "auth_verifications"].sort());
  const times = await client.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND column_name='created_at'");
  expect(times.rows).toHaveLength(15); expect(times.rows.every(r => r.data_type === "timestamp with time zone")).toBe(true);
  const indexes = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
  for (const name of ["jobs_queue", "jobs_lease", "projects_owner_updated", "sessions_project_created", "assets_session_finalized", "audit_entity"]) expect(indexes.rows.map(r => r.indexname)).toContain(name);
});
it("enforces normalized unique email, roles and positive version", async () => {
  await rejects("INSERT INTO users(id,email,name) VALUES ($1,$2,'duplicate')", [randomUUID(), `${a}@example.test`], "23505");
  await rejects("INSERT INTO users(id,email,name) VALUES ($1,' UPPER@example.test ','bad')", [randomUUID()], "23514");
  await rejects("UPDATE users SET app_role='superadmin' WHERE id=$1", [a], "23514");
  await rejects("UPDATE projects SET version=0 WHERE id=$1", [pa], "23514");
});
it("enforces owner matching for sessions and jobs, while allowing project-free drafts", async () => {
  await rejects("INSERT INTO asset_sessions(id,owner_id,project_id,title) VALUES ($1,$2,$3,'bad')", [randomUUID(), b, pa], "23503");
  await client.query("INSERT INTO asset_sessions(id,owner_id,title) VALUES ($1,$2,'draft')", [randomUUID(), a]);
  await rejects("INSERT INTO jobs(id,owner_id,project_id,kind,input,request_hash) VALUES ($1,$2,$3,'matching',$4,$5)", [randomUUID(), b, pa, JSON.stringify({ schemaVersion: 1, kind: "matching" }), "a".repeat(64)], "23503");
});
it("handles circular guide FKs and prevents cross-project active guides", async () => {
  const guide = randomUUID();
  await client.query("INSERT INTO brand_guides(id,project_id,version,file) VALUES ($1,$2,1,$3)", [guide, pa, file]);
  await client.query("UPDATE projects SET active_guide_id=$1 WHERE id=$2", [guide, pa]);
  await rejects("UPDATE projects SET active_guide_id=$1 WHERE id=$2", [guide, pb], "23503");
  await rejects("INSERT INTO brand_guides(id,project_id,version,file) VALUES ($1,$2,1,$3)", [randomUUID(), pa, file], "23505");
  await rejects("DELETE FROM brand_guides WHERE id=$1", [guide], "23503");
});
it("scopes idempotency to owner and kind, and restricts invalid job states", async () => {
  const insert = "INSERT INTO jobs(id,owner_id,kind,input,request_hash,idempotency_key) VALUES ($1,$2,'matching',$3,$4,'key')";
  const input = JSON.stringify({ schemaVersion: 1, kind: "matching", outputLocale: "ko", preferences: { schemaVersion: 1 } });
  await client.query(insert, [randomUUID(), a, input, "a".repeat(64)]);
  await rejects(insert, [randomUUID(), a, input, "a".repeat(64)], "23505");
  await client.query(insert, [randomUUID(), b, input, "a".repeat(64)]);
  await rejects("UPDATE jobs SET status='finished' WHERE owner_id=$1", [a], "23514");
  await rejects("UPDATE jobs SET input='{}' WHERE owner_id=$1", [a], "23514");
});
it("guards JSONB envelopes, schema versions and byte limits in direct SQL writes", async () => {
  for (const json of ["[]", "{}", '{"schemaVersion":2}', '{"schemaVersion":null}', JSON.stringify({ schemaVersion: 1, blob: "x".repeat(65_536) })]) await rejects("UPDATE users SET preferences=$1 WHERE id=$2", [json, a], "23514");
});
it("keeps seeds idempotent and preserves existing locale settings, users and published content", async () => {
  // Let Drizzle own this transaction so nested seed calls use SAVEPOINTs, not a COMMIT of a manual BEGIN.
  await client.query("ROLLBACK"); manualTransaction = false;
  const rollback = new Error("ROLLBACK_FIXTURE");
  await expect(drizzle(client, { schema }).transaction(async (tx) => {
    const seedUser = randomUUID();
    await tx.update(schema.locales).set({ enabled: false, version: 3 }).where(eq(schema.locales.code, "en"));
    await tx.insert(schema.users).values({ id: seedUser, email: `${seedUser}@example.test`, name: "Seed fixture" });
    await tx.update(schema.locales).set({ enabled: true, displayName: "Reviewed Korean", version: 7 }).where(eq(schema.locales.code, "ko"));
    const translated = { schemaVersion: 1 as const, resourceType: "partner" as const, name: "Published", description: "kept" };
    const translation = randomUUID();
    await tx.insert(schema.localizedContents).values({ id: translation, resourceType: "partner", resourceKey: "fixture", localeCode: "ko", sourceRevision: 1, draft: translated, published: translated, updatedBy: seedUser });
    await seedDatabase(tx); await seedDatabase(tx);
    const result = await tx.select().from(schema.locales);
    expect(result).toHaveLength(2);
    expect(result.find(r => r.code === "ko")).toMatchObject({ enabled: true, displayName: "Reviewed Korean", version: 7 });
    expect(result.find(r => r.code === "en")).toMatchObject({ enabled: false, fallbackCode: "ko" });
    const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, seedUser));
    expect(user).toMatchObject({ appRole: "member", profileCompletedAt: null });
    const [content] = await tx.select().from(schema.localizedContents).where(eq(schema.localizedContents.id, translation));
    expect(content.published).toEqual(translated);
    throw rollback;
  })).rejects.toBe(rollback);
});
it("enforces language FK, translation uniqueness, permitted resource types and monitoring source choice", async () => {
  await rejects("UPDATE locales SET fallback_code='ko' WHERE code='ko'", [], "23514");
  await rejects("UPDATE locales SET fallback_code='missing' WHERE code='en'", [], "23503");
  const draft = JSON.stringify({ schemaVersion: 1, resourceType: "partner", name: "n", description: "d" });
  const insert = "INSERT INTO localized_contents(id,resource_type,resource_key,locale_code,source_revision,draft,updated_by) VALUES ($1,$2,'key','ko',1,$3,$4)";
  await client.query(insert, [randomUUID(), "partner", draft, a]);
  await rejects(insert, [randomUUID(), "partner", draft, a], "23505");
  await rejects(insert, [randomUUID(), "ui", draft, a], "23514");
  await rejects("INSERT INTO monitoring_records(id,owner_id,name) VALUES ($1,$2,'no source')", [randomUUID(), a], "23514");
});
it("provides auth token/provider uniqueness and prevents cascading user deletion", async () => {
  const insert = "INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES ($1,$2,'synthetic-token',now()+interval '1 hour')";
  await client.query(insert, [randomUUID(), a]); await rejects(insert, [randomUUID(), b], "23505");
  const account = "INSERT INTO auth_accounts(id,user_id,provider_id,account_id,password) VALUES ($1,$2,'credential','fixture','synthetic-hash')";
  await client.query(account, [randomUUID(), a]); await rejects(account, [randomUUID(), b], "23505");
  await rejects("DELETE FROM users WHERE id=$1", [a], "23503");
});
it("replays migrations without adding journal rows or changing seed records", async () => {
  const before = await pool.query('SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id');
  await migrateDatabase(pool); await migrateDatabase(pool);
  const after = await pool.query('SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id');
  expect(after.rows).toEqual(before.rows); expect(after.rows.length).toBeGreaterThan(0);
});
