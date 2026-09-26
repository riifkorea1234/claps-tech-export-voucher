import { randomUUID, randomBytes } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, afterAll, beforeEach, afterEach, it, expect } from "vitest";
import { createDatabase } from "../../lib/server/db";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { AuthService, digest } from "../../lib/server/auth/service";
import { JobService } from "../../lib/server/jobs/service";
import { JobQueue } from "../../lib/server/jobs/queue";
import { HandlerRegistry, JobFailure, type JobHandler, type JobRow } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { runClaimedJob } from "../../lib/server/jobs/runner";
import { maintainStorage } from "../../lib/server/storage/maintenance";
import { WorkspaceService } from "../../lib/server/projects/service";
const { pool } = createDatabase(getTestDatabaseUrl(), 8);
const auth = new AuthService(pool, async () => {}, "http://localhost:3000");
const workspace = new WorkspaceService(auth), owners: string[] = [];
let token: string, owner: string, service: JobService, queue: JobQueue, registry: HandlerRegistry;
const input = { schemaVersion: 1, kind: "matching", outputLocale: "ko", preferences: { schemaVersion: 1 } };
const result = { output: { schemaVersion: 1 as const, kind: "matching" as const, partnerIds: [] } };
const success: JobHandler = { run: async () => result };
async function account() {
  const id = randomUUID(), raw = randomBytes(32).toString("hex"); owners.push(id);
  await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Fixture',true,'active')", [id, `${id}@example.test`]);
  await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')", [randomUUID(), id, digest(raw)]); return { id, raw };
}
const enqueue = (key: string = randomUUID()) => service.enqueue(token, { input, idempotencyKey: key });
const row = async (id: string) => (await pool.query<JobRow>("SELECT * FROM jobs WHERE id=$1", [id])).rows[0];
async function expire(id: string) { await pool.query("UPDATE jobs SET lease_until=now()-interval '1 second' WHERE id=$1", [id]); }
function configure(handler = success, timeoutMs = 2000) {
  registry = new HandlerRegistry().register("matching", handler);
  service = new JobService(auth, registry, { ...developmentQueuePolicy, leaseMs: 1000, kinds: { ...developmentQueuePolicy.kinds, matching: { timeoutMs, maxRetries: 2, retryDelayMs: 0 } } }); queue = new JobQueue(service);
}
beforeAll(async () => { await migrateDatabase(pool); });
beforeEach(async () => { ({ id: owner, raw: token } = await account()); configure(); });
afterEach(async () => { await pool.query("UPDATE jobs SET status='canceled' WHERE owner_id=ANY($1) AND status IN ('queued','running')", [owners]); });
afterAll(async () => {
  await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM assets WHERE session_id IN(SELECT id FROM asset_sessions WHERE owner_id=ANY($1))", [owners]);
  await pool.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM asset_sessions WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM projects WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM users WHERE id=ANY($1)", [owners]); await pool.end();
});
it("serializes concurrent idempotency, rejects changed payload and scopes to owner", async () => {
  const jobs = await Promise.all(Array.from({ length: 8 }, () => enqueue("same")));
  expect(new Set(jobs.map(j => j.id)).size).toBe(1);
  await expect(service.enqueue(token, { input: { ...input, outputLocale: "en" }, idempotencyKey: "same" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  const b = await account(); expect((await service.enqueue(b.raw, { input, idempotencyKey: "same" })).id).not.toBe(jobs[0].id);
});
it("enforces authentication, ownership, availability and hides internal data", async () => {
  const job = await enqueue(), b = await account();
  await expect(service.get(undefined, job.id)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  for (const action of [() => service.get(b.raw, job.id), () => service.cancel(b.raw, job.id), () => service.retry(b.raw, job.id)]) await expect(action()).rejects.toMatchObject({ code: "NOT_FOUND" });
  await pool.query("UPDATE jobs SET error_summary='private SQL/provider payload',provider_request_id='private' WHERE id=$1", [job.id]);
  expect(JSON.stringify(await service.get(token, job.id))).not.toMatch(/private|request_hash|input|provider_request/);
  await expect(new JobService(auth, new HandlerRegistry(), developmentQueuePolicy).enqueue(token, { input, idempotencyKey: "new" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
});
it("allows only one worker to claim one job and fences duplicate completion", async () => {
  const job = await enqueue(), claims = await Promise.all([queue.claim("one"), queue.claim("two")]);
  expect(claims.filter(Boolean)).toHaveLength(1); const claimed = claims.find(Boolean)!;
  expect(claimed.id).toBe(job.id);
  expect(await queue.complete({ ...claimed, lease_token: randomUUID() }, success, result)).toBe(false);
  expect(await queue.complete(claimed, success, result)).toBe(true);
  expect(await queue.complete(claimed, success, result)).toBe(false);
});
it("enforces two running jobs per owner even with competing workers", async () => {
  await Promise.all([enqueue(), enqueue(), enqueue()]);
  const claims = [];
  for (let i = 0; i < 3; i++) claims.push(await queue.claim(`worker_${i}`));
  expect(claims.filter(Boolean)).toHaveLength(2);
  await queue.complete(claims[0]!, success, result); expect(await queue.claim("next")).not.toBeNull();
});
it("enforces queue/hour quotas with concurrent registration and permits idempotent replays at quota", async () => {
  const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => enqueue(`quota_${i}`)));
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(10);
  expect(results.filter(r => r.status === "rejected").every(r => r.status === "rejected" && r.reason.code === "RATE_LIMITED")).toBe(true);
  expect((await enqueue("quota_0")).id).toBeDefined();
  await pool.query("UPDATE jobs SET status='canceled' WHERE owner_id=$1", [owner]);
  for (let i = 10; i < 60; i++) { const j = await enqueue(`hour_${i}`); await service.cancel(token, j.id); }
  await expect(enqueue()).rejects.toMatchObject({ code: "RATE_LIMITED" });
});
it("recovers an expired unstarted lease with a new linked job, never reviving the old attempt", async () => {
  const j = await enqueue(), claimed = (await queue.claim("crashed"))!; await expire(j.id);
  expect(await queue.recoverExpired()).toBe(1); expect(await queue.recoverExpired()).toBe(0);
  expect(await row(j.id)).toMatchObject({ status: "failed", error_code: "WORKER_LOST" });
  const view = await service.get(token, j.id); expect(view.retryJobId).toBeTruthy();
  expect(await row(view.retryJobId!)).toMatchObject({ attempt: 1, retry_of_id: j.id, status: "queued" });
  expect(await queue.complete(claimed, success, result)).toBe(false);
  expect(await queue.heartbeat(claimed)).toBe(false);
});
it("records dispatch/request ID and blocks all automatic and manual unknown-response retries", async () => {
  const j = await enqueue(), claimed = (await queue.claim("lost"))!; await queue.dispatch(claimed, "synthetic", "provider-123"); await expire(j.id);
  await queue.recoverExpired(); const view = await service.get(token, j.id);
  expect(view).toMatchObject({ status: "failed", errorCode: "PROVIDER_UNKNOWN", costState: "unknown", canRetry: false, retryJobId: null });
  await expect(service.retry(token, j.id)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await queue.providerRequest(claimed, "provider-123"); expect((await row(j.id)).provider_request_id).toBe("provider-123");
});
it("bounds safe automatic retries and preserves the whole attempt chain", async () => {
  configure({ run: async () => { throw new JobFailure("TRANSIENT", true); } }); const j = await enqueue();
  for (let i = 0; i < 3; i++) { const claim = (await queue.claim("retry"))!; expect(claim.attempt).toBe(i); await runClaimedJob(queue, claim); }
  expect(await queue.claim("exhausted")).toBeNull();
  const rows = await pool.query("SELECT attempt,status,retry_of_id FROM jobs WHERE owner_id=$1 ORDER BY attempt", [owner]);
  expect(rows.rows.map(r => r.attempt)).toEqual([0, 1, 2]); expect(rows.rows.every(r => r.status === "failed")).toBe(true); expect(rows.rows[1].retry_of_id).toBe(j.id);
});
it("deduplicates explicit retry creation under concurrent requests", async () => {
  const j = await enqueue(), claimed = (await queue.claim("manual"))!;
  await queue.fail(claimed, new JobFailure("TRANSIENT", false));
  const retried = await Promise.all([service.retry(token, j.id), service.retry(token, j.id)]);
  expect(retried[0].id).toBe(retried[1].id); expect(retried[0].retryOfId).toBe(j.id);
});
it("cancels queued immediately, records running cancellation and refuses a late business commit", async () => {
  const queued = await enqueue(); expect(await service.cancel(token, queued.id)).toMatchObject({ status: "canceled", cancelRequested: true });
  const j = await enqueue(), claimed = (await queue.claim("cancel"))!; await queue.dispatch(claimed, "synthetic");
  expect(await service.cancel(token, j.id)).toMatchObject({ status: "running", cancelRequested: true });
  let applied = false;
  expect(await queue.complete(claimed, { ...success, apply: async () => { applied = true; } }, { ...result, usage: { schemaVersion: 1, units: 1, unit: "synthetic" } })).toBe(false);
  expect(applied).toBe(false); expect(await service.get(token, j.id)).toMatchObject({ status: "canceled", costState: "confirmed", canRetry: false });
});
it("times out uncooperative handlers and ignores their late output while retaining usage", async () => {
  let resolveRun!: (value: typeof result & { usage?: { schemaVersion: 1; units: number; unit: string } }) => void;
  let applied = 0;
  configure({ run: async c => { await c.dispatch("synthetic"); return new Promise(resolve => { resolveRun = resolve; }); }, apply: async () => { applied++; } }, 80);
  const j = await enqueue(), claimed = (await queue.claim("timeout"))!; await runClaimedJob(queue, claimed);
  expect(await service.get(token, j.id)).toMatchObject({ status: "failed", errorCode: "PROVIDER_UNKNOWN", retryJobId: null });
  resolveRun({ ...result, usage: { schemaVersion: 1, units: 1, unit: "synthetic" } });
  await expect.poll(async () => (await row(j.id)).cost_state).toBe("confirmed"); expect(applied).toBe(0); expect((await row(j.id)).output).toBeNull();
});
it("refuses malformed/mismatched output and rolls back partially applied business writes", async () => {
  configure({ run: async () => ({ output: { schemaVersion: 1, kind: "generation", assetIds: [] } }) });
  const j = await enqueue(); await runClaimedJob(queue, (await queue.claim("invalid"))!);
  expect(await service.get(token, j.id)).toMatchObject({ status: "failed", errorCode: "INVALID_RESULT" });
  configure({ ...success, apply: async (c, job) => { await c.query("UPDATE users SET name='must rollback' WHERE id=$1", [job.owner_id]); throw new Error("private database statement"); } });
  const next = await enqueue(); await runClaimedJob(queue, (await queue.claim("rollback"))!);
  expect((await pool.query("SELECT name FROM users WHERE id=$1", [owner])).rows[0].name).toBe("Fixture");
  expect(await service.get(token, next.id)).toMatchObject({ status: "failed", errorCode: "INTERNAL" });
});
it.each(["project", "session", "withdrawal", "suspension"])("blocks late generation results after %s becomes inactive", async kind => {
  const p = await workspace.createProject(token, { name: "Parent" }), s = await workspace.createSession(token, { title: "Session", projectId: p.id });
  registry.register("generation", { run: async () => ({ output: { schemaVersion: 1, kind: "generation", assetIds: [] } }) });
  const j = await service.enqueue(token, { input: { schemaVersion: 1, kind: "generation", sessionId: s.id, prompt: "fixture", outputLocale: "ko" }, idempotencyKey: randomUUID() });
  const claimed = (await queue.claim("late"))!;
  const file = { schemaVersion: 1 as const, storageKey: `${randomUUID()}-original`, originalName: "fixture.zip", mimeType: "application/zip", size: 0, checksum: "a".repeat(64) };
  await queue.reserveFile(claimed, file);
  if (kind === "project") await workspace.patchProject(token, p.id, { version: 1, archived: true });
  else if (kind === "session") await workspace.patchSession(token, s.id, { version: 1, archived: true });
  else await pool.query("UPDATE users SET status=$2 WHERE id=$1", [owner, kind === "withdrawal" ? "withdrawal_pending" : "suspended"]);
  let applied = false;
  expect(await queue.complete(claimed, { ...success, apply: async () => { applied = true; } }, { output: { schemaVersion: 1, kind: "generation", assetIds: [] } })).toBe(false);
  expect(applied).toBe(false); expect(await row(j.id)).toMatchObject({ status: "failed", error_code: "PARENT_INACTIVE" });
  expect((await pool.query("SELECT state FROM storage_tickets WHERE target_id=$1", [j.id])).rows[0].state).toBe("cleanup_pending");
});
it("sweeps expired capabilities in bounded batches without deleting any physical or referenced file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "claps-p5-"));
  try {
    const file = join(dir, "retained.zip"); await writeFile(file, "synthetic zip");
    const ids = Array.from({ length: 5 }, () => randomUUID());
    const fixtures = [["download", "ready", "-1 hour"], ["download", "ready", "1 hour"], ["upload", "reserved", "-1 hour"], ["upload", "ready", "-1 hour"], ["cleanup", "cleanup_pending", "-1 hour"]];
    for (let i = 0; i < fixtures.length; i++) await pool.query("INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,state,metadata,expires_at) VALUES($1,$2,$3,'job',$4,$5,$6,now()+$7::interval)", [ids[i], owner, fixtures[i][0], randomUUID(), fixtures[i][1], { storageKey: "retained.zip" }, fixtures[i][2]]);
    const runs = await Promise.all([maintainStorage(pool, 1), maintainStorage(pool, 100)]);
    expect(runs.reduce((n, r) => n + r.expiredDownloads, 0)).toBe(1); expect(runs.reduce((n, r) => n + r.scheduledUploads, 0)).toBe(2);
    expect(await maintainStorage(pool)).toMatchObject({ expiredDownloads: 0, scheduledUploads: 0, physicalDeletes: 0 });
    expect(await readFile(file, "utf8")).toBe("synthetic zip");
    expect((await pool.query("SELECT id FROM storage_tickets WHERE id=ANY($1)", [ids])).rows).toHaveLength(4);
  } finally { await rm(dir, { recursive: true }); }
});
it.each(["before-dispatch", "after-dispatch"])("recovers a real worker process SIGKILL at %s without double dispatch", async mode => {
  const j = await enqueue();
  const child = fork(resolve("tests/helpers/job-worker.ts"), [mode], { execArgv: ["--conditions=react-server", "--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"], env: { ...process.env } });
  try {
    const ready = await Promise.race([once(child, "message"), once(child, "exit").then(() => { throw new Error("WORKER_EXITED_BEFORE_CLAIM"); })]);
    expect(ready[0]).toMatchObject({ ready: true, id: j.id });
    const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
    await expire(j.id); await queue.recoverExpired();
    const view = await service.get(token, j.id);
    expect(view.status).toBe("failed"); expect(view.errorCode).toBe(mode === "after-dispatch" ? "PROVIDER_UNKNOWN" : "WORKER_LOST");
    expect(!!view.retryJobId).toBe(mode !== "after-dispatch");
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); }
}, 20000);

it("renews a live lease and safely stops before dispatch on SIGTERM", async () => {
  const j = await enqueue(), claimed = (await queue.claim("heartbeat"))!;
  await pool.query("UPDATE jobs SET lease_until=now()+interval '0.2 seconds' WHERE id=$1", [j.id]);
  expect(await queue.heartbeat(claimed)).toBe(true);
  expect((await row(j.id)).lease_until!.getTime() - Date.now()).toBeGreaterThan(500);
  await queue.fail(claimed, new JobFailure("INTERNAL"));
  const next = await enqueue();
  const child = fork(resolve("tests/helpers/job-worker.ts"), ["before-dispatch"], { execArgv: ["--conditions=react-server", "--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"], env: { ...process.env } });
  try {
    const ready = await Promise.race([once(child, "message"), once(child, "exit").then(() => { throw new Error("WORKER_EXITED_BEFORE_CLAIM"); })]);
    expect(ready[0]).toMatchObject({ id: next.id });
    const exited = once(child, "exit"); child.kill("SIGTERM");
    expect((await exited)[0]).toBe(0);
    expect(await service.get(token, next.id)).toMatchObject({ status: "failed", errorCode: "WORKER_LOST" });
    expect((await service.get(token, next.id)).retryJobId).toBeTruthy();
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); }
}, 20000);
it("rolls back business writes that cross the execution deadline", async () => {
  configure({ ...success, apply: async c => { await c.query("SELECT pg_sleep(0.15)"); } }, 80);
  const j = await enqueue(); await runClaimedJob(queue, (await queue.claim("deadline"))!);
  const after = await service.get(token, j.id);
  expect(after.status).toBe("failed"); expect((await row(j.id)).output).toBeNull();
});
