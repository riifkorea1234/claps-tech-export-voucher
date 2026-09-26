import { randomUUID, randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, beforeEach, afterAll, afterEach, it, expect } from "vitest";
import { createDatabase } from "../../lib/server/db";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { AuthService, digest } from "../../lib/server/auth/service";
import { WorkspaceService } from "../../lib/server/projects/service";
import { StorageService } from "../../lib/server/storage/service";
import { MonitoringService } from "../../lib/server/monitoring/service";
import { monitoringHandler } from "../../lib/server/monitoring/handler";
import { JobService } from "../../lib/server/jobs/service";
import { JobQueue } from "../../lib/server/jobs/queue";
import { HandlerRegistry, JobFailure } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { runClaimedJob } from "../../lib/server/jobs/runner";
import { AdminAccess } from "../../lib/server/admin/access";
import { AdminService } from "../../lib/server/admin/service";
import type { MonitoringResult } from "../../lib/contracts/monitoring-result";
const { pool } = createDatabase(getTestDatabaseUrl(), 8), auth = new AuthService(pool, async () => {}, "http://localhost:3000"), workspace = new WorkspaceService(auth), storage = new StorageService(workspace);
let result: MonitoringResult = { state: "empty", sources: [{ name: "fixture", status: "succeeded" }], items: [] };
const registry = new HandlerRegistry().register("monitoring", monitoringHandler(auth, { name: "isolated-fixture", search: async bytes => { expect(bytes).toEqual(png); return result; } })), jobs = new JobService(auth, registry, developmentQueuePolicy), queue = new JobQueue(jobs), service = new MonitoringService(workspace, jobs);
const unavailable = new MonitoringService(workspace, new JobService(auth, new HandlerRegistry(), developmentQueuePolicy));
const owners: string[] = []; let raw: string, owner: string, directory: string, png: Buffer;
async function account(admin = false) {
  const id = randomUUID(), token = randomBytes(32).toString("hex"); owners.push(id);
  await pool.query("INSERT INTO users(id,email,name,email_verified,status,app_role) VALUES($1,$2,'Fixture',true,'active',$3)", [id, `${id}@example.test`, admin ? "admin" : "member"]);
  await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at,admin_verified_until) VALUES($1,$2,$3,now()+interval '1 day',now()+interval '15 minutes')", [randomUUID(), id, digest(token)]); return { id, token };
}
async function create(name = "Reference") {
  const t = await storage.reserveMonitoring(raw, { name: "ref.png", mime: "image/png", size: png.length });
  await storage.upload(raw, t.ticket, png, "image/png");
  return service.create(raw, { name, source: { kind: "upload", ticket: t.ticket } });
}
const scan = (id: string, key: string = randomUUID()) => service.request(raw, id, { outputLocale: "ko", idempotencyKey: key });
async function run() { const job = await queue.claim("phase10"); expect(job).not.toBeNull(); await runClaimedJob(queue, job!); return job!; }
beforeAll(async () => { await migrateDatabase(pool); directory = await mkdtemp(join(tmpdir(), "claps-p10-")); process.env.UPLOADS_DIR = directory; png = await sharp({ create: { width: 12, height: 12, channels: 3, background: "red" } }).png().toBuffer(); });
beforeEach(async () => { const a = await account(); raw = a.token; owner = a.id; result = { state: "empty", sources: [{ name: "fixture", status: "succeeded" }], items: [] }; });
afterEach(async () => { await pool.query("UPDATE jobs SET status='canceled' WHERE owner_id=ANY($1) AND status IN ('queued','running')", [owners]); });
afterAll(async () => {
  await pool.query("DELETE FROM admin_audit_logs WHERE actor_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM monitoring_records WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM assets WHERE session_id IN (SELECT id FROM asset_sessions WHERE owner_id=ANY($1))", [owners]);
  await pool.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM asset_sessions WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM projects WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)", [owners]); await pool.query("DELETE FROM users WHERE id=ANY($1)", [owners]); await pool.end(); if (directory) await rm(directory, { recursive: true });
});
it("preserves decoded original, ownership, ticket single-use and optimistic archive/restore", async () => {
  const a = await create(), b = await account(); expect((await service.image(raw, a.id)).bytes).toEqual(png);
  for (const action of [() => service.get(b.token, a.id), () => service.image(b.token, a.id), () => service.history(b.token, a.id), () => service.patch(b.token, a.id, { version: 1, name: "stolen" })]) await expect(action()).rejects.toMatchObject({ code: "NOT_FOUND" });
  const updates = await Promise.allSettled([service.patch(raw, a.id, { version: 1, name: "one" }), service.patch(raw, a.id, { version: 1, name: "two" })]); expect(updates.filter(x => x.status === "fulfilled")).toHaveLength(1);
  const archived = await service.patch(raw, a.id, { version: 2, archived: true }); expect(archived.archivedAt).not.toBeNull(); await expect(service.image(raw, a.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect((await service.list(raw)).total).toBe(0); expect((await service.list(raw, { archived: "true" })).total).toBe(1);
  await service.patch(raw, a.id, { version: 3, archived: false }); expect((await service.image(raw, a.id)).bytes).toEqual(png);
  const ticket = await storage.reserveMonitoring(raw, { name: "ref.png", mime: "image/png", size: png.length });
  await expect(storage.upload(b.token, ticket.ticket, png, "image/png")).rejects.toMatchObject({ code: "NOT_FOUND" });
  await storage.upload(raw, ticket.ticket, png, "image/png");
  await expect(service.create(b.token, { name: "foreign", source: { kind: "upload", ticket: ticket.ticket } })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await service.create(raw, { name: "one", source: { kind: "upload", ticket: ticket.ticket } });
  await expect(service.create(raw, { name: "again", source: { kind: "upload", ticket: ticket.ticket } })).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("paginates 20 records, searches literal characters and orders full UTC years", async () => {
  const first = await create("100%_literal");
  const file = (await pool.query("SELECT source_file FROM monitoring_records WHERE id=$1", [first.id])).rows[0].source_file;
  for (let i = 0; i < 21; i++) await pool.query("INSERT INTO monitoring_records(id,owner_id,name,source_file,created_at) VALUES($1,$2,$3,$4,$5)", [randomUUID(), owner, `ref-${i}`, file, i === 0 ? "2025-12-31T23:59:59Z" : "2026-01-01T00:00:00Z"]);
  expect((await service.list(raw)).items).toHaveLength(20); expect((await service.list(raw, { page: 2 })).items).toHaveLength(2);
  expect((await service.list(raw, { q: "%_" })).items.map(x => x.id)).toEqual([first.id]);
  expect((await service.list(raw, { sort: "created" })).items[0].name).toBe("ref-0");
});
it("unconfigured scan returns unavailable without creating jobs; rejects foreign sources and expired tickets", async () => {
  const a = await create(); await expect(unavailable.request(raw, a.id, { outputLocale: "ko", idempotencyKey: "unavailable" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  expect((await service.history(raw, a.id)).total).toBe(0); expect((await unavailable.get(raw, a.id)).scanAvailable).toBe(false);
  const t = await storage.reserveMonitoring(raw, { name: "bad.png", mime: "image/png", size: 3 }); await expect(storage.upload(raw, t.ticket, Buffer.from("bad"), "image/png")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  const expired = await storage.reserveMonitoring(raw, { name: "ref.png", mime: "image/png", size: png.length }); await storage.upload(raw, expired.ticket, png, "image/png"); await pool.query("UPDATE storage_tickets SET expires_at=now()-interval '1 second' WHERE id=$1", [digest(expired.ticket)]);
  await expect(service.create(raw, { name: "expired", source: { kind: "upload", ticket: expired.ticket } })).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("preserves separate success/empty/partial/failed attempts, idempotency and previous successful summary", async () => {
  const a = await create(); const first = await scan(a.id, "same"); expect((await scan(a.id, "same")).id).toBe(first.id); await expect(scan(a.id)).rejects.toMatchObject({ code: "STATE_CONFLICT" }); await run();
  expect((await service.history(raw, a.id)).items[0].result?.state).toBe("empty");
  result = { state: "partial", sources: [{ name: "fixture", status: "succeeded" }, { name: "other", status: "failed" }], items: [{ url: "https://public.com/a", source: "fixture", similarity: 80, discoveredAt: new Date().toISOString() }] };
  const second = await scan(a.id); await run(); expect((await service.get(raw, a.id)).latestResultCount).toBe(1);
  const third = await scan(a.id); const claim = await queue.claim("failure"); expect(claim!.id).toBe(third.id); await queue.fail(claim!, new JobFailure("INVALID_RESULT"));
  expect((await service.get(raw, a.id)).latestJobId).toBe(second.id); const history = await service.history(raw, a.id); expect(history.total).toBe(3); expect(history.items.map(x => x.job.status)).toEqual(["failed", "succeeded", "succeeded"]);
  expect(history.items[2].result?.state).toBe("empty");
  result = { ...result, state: "results", sources: [{ name: "fixture", status: "succeeded" }] }; await scan(a.id); await run();
  expect((await service.history(raw, a.id)).items[0].result?.state).toBe("results");
});
it("archive cancels queued work and fences a late completion, preserving the original", async () => {
  const a = await create(); const queued = await scan(a.id); await service.patch(raw, a.id, { version: 1, archived: true }); expect((await jobs.get(raw, queued.id)).status).toBe("canceled");
  await service.patch(raw, a.id, { version: 2, archived: false }); await scan(a.id); const claim = await queue.claim("late");
  await service.patch(raw, a.id, { version: 3, archived: true }); await runClaimedJob(queue, claim!);
  expect((await service.get(raw, a.id)).latestJobId).toBeNull(); expect((await jobs.get(raw, claim!.id)).status).not.toBe("succeeded");
  await service.patch(raw, a.id, { version: 4, archived: false }); expect((await service.image(raw, a.id)).bytes).toEqual(png);
});
it("guards asset ownership and parent lifecycle without requiring an upload", async () => {
  const a = await create(), session = await workspace.createSession(raw, { title: "source" }), file = (await pool.query("SELECT source_file FROM monitoring_records WHERE id=$1", [a.id])).rows[0].source_file, asset = randomUUID();
  const generation = randomUUID();
  await pool.query("INSERT INTO jobs(id,owner_id,kind,status,input,idempotency_key,request_hash) VALUES($1,$2,'generation','succeeded',$3,$1,$4)", [generation, owner, { schemaVersion: 1, kind: "generation", sessionId: session.id, prompt: "fixture", outputLocale: "ko" }, "a".repeat(64)]);
  await pool.query("INSERT INTO assets(id,session_id,generation_job_id,file) VALUES($1,$2,$3,$4)", [asset, session.id, generation, file]);
  const b = await account(); await expect(service.create(b.token, { name: "foreign", source: { kind: "asset", assetId: asset } })).rejects.toMatchObject({ code: "NOT_FOUND" });
  const linked = await service.create(raw, { name: "owned", source: { kind: "asset", assetId: asset } }); expect((await service.image(raw, linked.id)).bytes).toEqual(png);
  await workspace.patchSession(raw, session.id, { version: 1, archived: true }); expect((await service.get(raw, linked.id)).sourceAvailable).toBe(false); await expect(scan(linked.id)).rejects.toThrow();
});
it("requires admin role/reauth, audits archive/restore and denies unavailable rescan", async () => {
  const a = await create(), admin = await account(true), svc = new AdminService(new AdminAccess(auth), unavailable.jobs);
  await expect(svc.detail(raw, "monitoring-records", a.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  const detail = await svc.detail(admin.token, "monitoring-records", a.id); expect(detail.record.sourceName).toBe("ref.png"); expect(JSON.stringify(detail)).not.toContain("storageKey");
  await svc.monitoring(admin.token, a.id, { action: "archive", version: 1, reason: "Test archive" });
  await svc.monitoring(admin.token, a.id, { action: "restore", version: 2, reason: "Test restore" });
  await expect(svc.monitoring(admin.token, a.id, { action: "scan", version: 3, reason: "Test scan", idempotencyKey: "test" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  expect((await svc.monitoringHistory(admin.token, a.id, {})).total).toBe(0);
  const audits = (await pool.query("SELECT action FROM admin_audit_logs WHERE actor_id=$1", [admin.id])).rows.map(r => r.action); expect(audits).toContain("monitoring.archive"); expect(audits).toContain("monitoring.restore");
  const connected = new AdminService(new AdminAccess(auth), jobs);
  await connected.monitoring(admin.token, a.id, { action: "scan", version: 3, reason: "Fixture adapter only", idempotencyKey: "admin-test" }); await run();
  expect((await service.history(raw, a.id)).items[0].job.status).toBe("succeeded");
  expect((await pool.query("SELECT 1 FROM admin_audit_logs WHERE actor_id=$1 AND action='monitoring.scan'", [admin.id])).rowCount).toBe(1);
  await pool.query("UPDATE auth_sessions SET admin_verified_until=NULL WHERE user_id=$1", [admin.id]); await expect(svc.detail(admin.token, "monitoring-records", a.id)).rejects.toMatchObject({ code: "ADMIN_REAUTH_REQUIRED" });
});
it("does not overwrite a newer summary with an older completion and enforces request limits", async () => {
  const a = await create(); const first = await scan(a.id); await run(); const old = (await pool.query("SELECT * FROM jobs WHERE id=$1", [first.id])).rows[0];
  const second = await scan(a.id); await run();
  await auth.transaction(c => registry.get("monitoring")!.apply!(c, old, { output: old.output }));
  expect((await service.get(raw, a.id)).latestJobId).toBe(second.id);
  const limited = new MonitoringService(workspace, new JobService(auth, registry, { ...developmentQueuePolicy, requestsPerHour: 2 }));
  await expect(limited.request(raw, a.id, { outputLocale: "ko", idempotencyKey: "limited" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await pool.query("UPDATE users SET status='withdrawal_pending' WHERE id=$1", [owner]); await expect(service.get(raw, a.id)).rejects.toThrow();
});
it("recovers dispatched worker loss without automatic external rescan or history mutation", async () => {
  const a = await create(); await scan(a.id); const claim = await queue.claim("lost");
  await queue.dispatch(claim!, "fixture"); await pool.query("UPDATE jobs SET lease_until=now()-interval '1 second' WHERE id=$1", [claim!.id]);
  expect(await queue.recoverExpired()).toBeGreaterThanOrEqual(1);
  const history = await service.history(raw, a.id); expect(history.total).toBe(1); expect(history.items[0].job).toMatchObject({ status: "failed", errorCode: "PROVIDER_UNKNOWN", canRetry: false });
  expect((await service.get(raw, a.id)).latestJobId).toBeNull();
});
