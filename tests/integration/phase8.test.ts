import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdtemp, rm, writeFile, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { beforeAll, afterAll, beforeEach, afterEach, it, expect } from "vitest";
import { createDatabase } from "../../lib/server/db";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { AuthService, digest } from "../../lib/server/auth/service";
import { WorkspaceService } from "../../lib/server/projects/service";
import { StorageService, storagePath } from "../../lib/server/storage/service";
import { JobService } from "../../lib/server/jobs/service";
import { JobQueue } from "../../lib/server/jobs/queue";
import { HandlerRegistry, type JobRow } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { runClaimedJob } from "../../lib/server/jobs/runner";
import { verificationHandler, type VerificationProvider } from "../../lib/server/verifications/handler";
import { VerificationService } from "../../lib/server/verifications/service";
import { FinalizationService } from "../../lib/server/finalizations/service";
import { ExportService } from "../../lib/server/exports/service";
import { exportHandler } from "../../lib/server/exports/handler";
import { readStoredFile } from "../../lib/server/storage/read-file";
import { maintainStorage } from "../../lib/server/storage/maintenance";
const { pool } = createDatabase(getTestDatabaseUrl(), 8);
const auth = new AuthService(pool, async () => {}, "http://localhost:3000"), workspace = new WorkspaceService(auth), finals = new FinalizationService(workspace), storage = new StorageService(workspace);
const owners: string[] = []; let raw: string, owner: string, directory: string, png: Buffer;
let jobs: JobService, queue: JobQueue, verification: VerificationService, exports: ExportService, registry: HandlerRegistry;
let verdict: "pass" | "warn" | "reject" | "unknown", malformed = false;
const provider: VerificationProvider = { name: "test-only", verify: async input => ({ engineVersion: "test-v1", results: input.assets.map(a => ({ assetId: a.id, rules: malformed ? [] : input.rules.rules.map(r => ({ ruleId: r.ruleId, verdict, reason: "Synthetic result", evidence: "Synthetic image observation" })) })) }) };
async function account() {
  const id = randomUUID(), token = randomBytes(32).toString("hex"); owners.push(id);
  await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Fixture',true,'active')", [id, `${id}@example.test`]);
  await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')", [randomUUID(), id, digest(token)]); return { id, token };
}
async function fixture() {
  const p = await workspace.createProject(raw, { name: "Phase 8" }), s = await workspace.createSession(raw, { title: "Synthetic", projectId: p.id });
  const gid = randomUUID(), generation = randomUUID(), aid = randomUUID();
  const file = { schemaVersion: 1 as const, storageKey: `${randomUUID()}-original`, originalName: "fixture.png", mimeType: "image/png", size: png.length, checksum: createHash("sha256").update(png).digest("hex") };
  await writeFile(storagePath(file.storageKey), png);
  await pool.query("INSERT INTO brand_guides(id,project_id,version,file,rules,status) VALUES($1,$2,1,$3,$4,'published')", [gid, p.id, file, { schemaVersion: 1, rules: [{ ruleId: "rule-one", title: "Color", description: "Synthetic", condition: { field: "color", operator: "equals", value: "red" }, evidence: { page: 1, excerpt: "red" } }] }]);
  await pool.query("UPDATE projects SET active_guide_id=$2 WHERE id=$1", [p.id, gid]);
  await pool.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES($1,$2,$3,'generation','succeeded',$4,$5)", [generation, owner, p.id, { schemaVersion: 1, kind: "generation", sessionId: s.id, prompt: "Test", outputLocale: "ko" }, "a".repeat(64)]);
  await pool.query("INSERT INTO assets(id,session_id,generation_job_id,file,adopted) VALUES($1,$2,$3,$4,true)", [aid, s.id, generation, file]);
  return { p, s, gid, aid, file };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function verify(f: Fixture, key: string = randomUUID()) { return verification.request(raw, f.s.id, { assetIds: [f.aid], guideId: f.gid, outputLocale: "ko", idempotencyKey: key }); }
async function run() { const job = await queue.claim("phase8"); expect(job).not.toBeNull(); await runClaimedJob(queue, job!); return job!; }
async function finalized(f: Fixture) { await verify(f); await run(); return finals.set(raw, f.aid, { version: 2 }, true); }
async function exportOne(f: Fixture, key: string = randomUUID()) { return exports.request(raw, { assetIds: [f.aid], outputLocale: "ko", idempotencyKey: key }); }
const row = async (id: string) => (await pool.query<JobRow>("SELECT * FROM jobs WHERE id=$1", [id])).rows[0];
beforeAll(async () => { await migrateDatabase(pool); directory = await mkdtemp(join(tmpdir(), "claps-p8-")); process.env.UPLOADS_DIR = directory; png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "red" } }).png().toBuffer(); });
beforeEach(async () => {
  const a = await account(); raw = a.token; owner = a.id; verdict = "pass"; malformed = false;
  registry = new HandlerRegistry().register("verification", verificationHandler(auth, provider)).register("export", exportHandler(auth));
  jobs = new JobService(auth, registry, developmentQueuePolicy); queue = new JobQueue(jobs); verification = new VerificationService(workspace, jobs); exports = new ExportService(workspace, jobs);
});
afterEach(async () => { await pool.query("UPDATE jobs SET status='canceled' WHERE owner_id=ANY($1) AND status IN ('queued','running')", [owners]); });
afterAll(async () => {
  await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [owners]);
  await pool.query("UPDATE projects SET active_guide_id=NULL WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM assets WHERE session_id IN(SELECT id FROM asset_sessions WHERE owner_id=ANY($1))", [owners]);
  await pool.query("DELETE FROM brand_guides WHERE project_id IN(SELECT id FROM projects WHERE owner_id=ANY($1))", [owners]);
  await pool.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM asset_sessions WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM projects WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM users WHERE id=ANY($1)", [owners]); await pool.end(); if (directory) await rm(directory, { recursive: true });
});
it("refuses unconfigured verification without creating jobs and unverified final/download", async () => {
  const f = await fixture();
  const unavailable = new VerificationService(workspace, new JobService(auth, new HandlerRegistry(), developmentQueuePolicy));
  await expect(unavailable.request(raw, f.s.id, { assetIds: [f.aid], guideId: f.gid, outputLocale: "ko", idempotencyKey: "unavailable" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  expect((await pool.query("SELECT 1 FROM jobs WHERE owner_id=$1 AND kind='verification'", [owner])).rowCount).toBe(0);
  await expect(finals.set(raw, f.aid, { version: 1 }, true)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await expect(exportOne(f)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  const a = await workspace.getAsset(raw, f.aid);
  await expect(storage.download(raw, a.imageUrl.split("/").at(-1)!, true)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
});
it("deduplicates verification, rejects busy/injected/mismatched requests and foreign owners", async () => {
  const f = await fixture(), b = await account();
  const results = await Promise.all([verify(f, "same"), verify(f, "same")]); expect(results[0].id).toBe(results[1].id);
  await expect(verify(f)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await expect(verification.request(raw, f.s.id, { assetIds: [f.aid], guideId: f.gid, outputLocale: "en", idempotencyKey: "same" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  for (const action of [() => finals.get(b.token, f.aid), () => finals.set(b.token, f.aid, { version: 1 }, true), () => verification.request(b.token, f.s.id, { assetIds: [f.aid], guideId: f.gid, outputLocale: "ko", idempotencyKey: "x" }), () => exports.request(b.token, { assetIds: [f.aid], outputLocale: "ko", idempotencyKey: "x" })]) await expect(action()).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(finals.set(raw, f.aid, { version: 1, verdict: "pass" }, true)).rejects.toThrow();
  await run(); expect((await verify(f, "same")).id).toBe(results[0].id);
});
it.each(["warn", "reject", "unknown"] as const)("preserves %s evidence and refuses finalization", async value => {
  const f = await fixture(); verdict = value; await verify(f); await run();
  const v = await finals.get(raw, f.aid); expect(v).toMatchObject({ canFinalize: false, verification: { verdict: value, engineVersion: "test-v1", guideVersion: 1 } });
  await expect(finals.set(raw, f.aid, { version: 2 }, true)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
});
it("rejects missing rule evidence without attaching a result", async () => {
  const f = await fixture(); malformed = true; const j = await verify(f); await run();
  expect((await row(j.id)).status).toBe("failed"); expect((await finals.get(raw, f.aid)).verification).toBeNull();
});
it("serializes finalization, keeps history and originals on cancel, updates cover/library/counts", async () => {
  const f = await fixture(); const j = await verify(f); await run(); expect((await finals.get(raw, f.aid)).canFinalize).toBe(true);
  const changes = await Promise.allSettled([finals.set(raw, f.aid, { version: 2 }, true), finals.set(raw, f.aid, { version: 2 }, true)]);
  expect(changes.filter(x => x.status === "fulfilled")).toHaveLength(1); expect(changes.filter(x => x.status === "rejected")).toHaveLength(1);
  const a = await workspace.getAsset(raw, f.aid); expect(a.version).toBe(3);
  expect((await finals.set(raw, f.aid, { version: 3 }, true)).version).toBe(3);
  expect(await workspace.listAssets(raw, f.p.id, true)).toHaveLength(1); expect((await workspace.getProject(raw, f.p.id)).finalized).toBe(1);
  await workspace.patchProject(raw, f.p.id, { version: 1, cover: { kind: "asset", assetId: f.aid } });
  await finals.set(raw, f.aid, { version: 3 }, false);
  expect((await pool.query("SELECT cover FROM projects WHERE id=$1", [f.p.id])).rows[0].cover.kind).toBe("default");
  expect(await workspace.listAssets(raw, f.p.id, true)).toHaveLength(0);
  expect((await row(j.id)).output).toMatchObject({ kind: "verification", results: [{ assetId: f.aid }] });
  expect(await readFile(storagePath(f.file.storageKey))).toEqual(png);
  await expect(finals.set(raw, f.aid, { version: 4 }, true)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await verify(f); await run(); expect((await finals.get(raw, f.aid)).canFinalize).toBe(true);
});
it("blocks latest-guide drift, mutated rules and forged asset-only pass results", async () => {
  const f = await fixture(); await verify(f); await run();
  await pool.query("UPDATE brand_guides SET rules=jsonb_set(rules,'{rules,0,title}','\"Changed\"') WHERE id=$1", [f.gid]);
  expect((await finals.get(raw, f.aid)).canFinalize).toBe(false);
  await pool.query("UPDATE projects SET active_guide_id=NULL WHERE id=$1", [f.p.id]);
  expect(await finals.get(raw, f.aid)).toMatchObject({ stale: true, canFinalize: false });
  const fresh = await fixture(); await verify(fresh); await run();
  await pool.query("UPDATE assets SET verification=jsonb_set(verification,'{engineVersion}','\"forged\"') WHERE id=$1", [fresh.aid]);
  expect((await finals.get(raw, fresh.aid)).canFinalize).toBe(false);
});
it.each(["cancel", "asset-version", "guide", "archive"])("fences late verification on %s", async mode => {
  const f = await fixture(); const j = await verify(f), claimed = (await queue.claim("late"))!;
  const handler = registry.get("verification")!;
  const result = await handler.run({ job: claimed, signal: new AbortController().signal, dispatch: (p, id) => queue.dispatch(claimed, p, id), providerRequest: id => queue.providerRequest(claimed, id), reserveFile: file => queue.reserveFile(claimed, file) });
  if (mode === "cancel") await jobs.cancel(raw, j.id);
  if (mode === "asset-version") await pool.query("UPDATE assets SET version=version+1 WHERE id=$1", [f.aid]);
  if (mode === "guide") await pool.query("UPDATE projects SET active_guide_id=NULL WHERE id=$1", [f.p.id]);
  if (mode === "archive") await workspace.patchSession(raw, f.s.id, { version: 1, archived: true });
  expect(await queue.complete(claimed, handler, result)).toBe(false);
  expect((await pool.query("SELECT verification FROM assets WHERE id=$1", [f.aid])).rows[0].verification).toBeNull();
});
it("exports valid ZIPs, verifies checksum and rechecks owner, final state and expiry", async () => {
  const f = await fixture(); await finalized(f);
  const j = await exportOne(f, "zip"), duplicate = await exportOne(f, "zip"); expect(duplicate.id).toBe(j.id); await run();
  expect((await jobs.get(raw, j.id)).status).toBe("succeeded");
  const d = await exports.download(raw, j.id), token = d.downloadUrl.split("/").at(-1)!.split("?")[0];
  const download = await storage.download(raw, token); expect(download.mime).toBe("application/zip");
  const path = join(directory, "checked.zip"); await writeFile(path, download.bytes);
  expect(execFileSync("python3", ["-c", "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert len(z.namelist())==1; print(z.namelist()[0])", path], { encoding: "utf8" }).trim()).toBe(`${f.aid}.png`);
  const b = await account(); await expect(exports.download(b.token, j.id)).rejects.toMatchObject({ code: "NOT_FOUND" }); await expect(storage.download(b.token, token)).rejects.toMatchObject({ code: "NOT_FOUND" });
  await pool.query("UPDATE jobs SET output=jsonb_set(output,'{expiresAt}',to_jsonb('2000-01-01T00:00:00.000Z'::text)) WHERE id=$1", [j.id]);
  await expect(exports.download(raw, j.id)).rejects.toMatchObject({ code: "NOT_FOUND" }); await expect(storage.download(raw, token)).rejects.toMatchObject({ code: "NOT_FOUND" });
  const next = await exportOne(f); await run(); const valid = await exports.download(raw, next.id);
  await finals.set(raw, f.aid, { version: 3 }, false);
  await expect(exports.download(raw, next.id)).rejects.toMatchObject({ code: "STATE_CONFLICT" }); await expect(storage.download(raw, valid.downloadUrl.split("/").at(-1)!.split("?")[0])).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  expect(await readFile(storagePath(f.file.storageKey))).toEqual(png);
});
it("rejects cross-project ZIPs, oversized metadata, missing files and symlinks", async () => {
  const f = await fixture(), other = await fixture(); await finalized(f); await finalized(other);
  await expect(exports.request(raw, { assetIds: [f.aid, other.aid], outputLocale: "ko", idempotencyKey: "cross" })).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await pool.query("UPDATE assets SET file=jsonb_set(file,'{size}','10485761') WHERE id=$1", [other.aid]);
  await expect(exportOne(other)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  await rm(storagePath(f.file.storageKey)); const j = await exportOne(f); await run(); expect((await row(j.id)).status).toBe("failed");
  await expect(exports.download(raw, j.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  const target = join(directory, "symlink-target"); await writeFile(target, png); await symlink(target, storagePath(f.file.storageKey));
  await expect(readStoredFile(f.file, 10 * 1024 * 1024)).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("retains tracked ZIPs after cancellation/expired lease and rejects a late commit", async () => {
  const f = await fixture(); await finalized(f); const j = await exportOne(f), claimed = (await queue.claim("zip-late"))!;
  const handler = registry.get("export")!;
  const result = await handler.run({ job: claimed, signal: new AbortController().signal, dispatch: (p, id) => queue.dispatch(claimed, p, id), providerRequest: id => queue.providerRequest(claimed, id), reserveFile: file => queue.reserveFile(claimed, file) });
  await jobs.cancel(raw, j.id); expect(await queue.complete(claimed, handler, result)).toBe(false);
  expect((await pool.query("SELECT state FROM storage_tickets WHERE target_id=$1", [j.id])).rows[0].state).toBe("cleanup_pending");
  expect(await maintainStorage(pool)).toMatchObject({ physicalDeletes: 0 });
  if (result.output.kind !== "export") throw new Error("Expected export");
  expect(await readFile(storagePath(result.output.file.storageKey))).toHaveLength(result.output.file.size);
  await expect(exports.download(raw, j.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("recovers a ZIP lease loss with a new attempt and never publishes the stale artifact", async () => {
  const f = await fixture(); await finalized(f); const j = await exportOne(f), claimed = (await queue.claim("zip-crash"))!;
  const handler = registry.get("export")!;
  const result = await handler.run({ job: claimed, signal: new AbortController().signal, dispatch: (p, id) => queue.dispatch(claimed, p, id), providerRequest: id => queue.providerRequest(claimed, id), reserveFile: file => queue.reserveFile(claimed, file) });
  await pool.query("UPDATE jobs SET lease_until=now()-interval '1 second' WHERE id=$1", [j.id]);
  await queue.recoverExpired(); const failed = await jobs.get(raw, j.id);
  expect(failed).toMatchObject({ status: "failed", errorCode: "WORKER_LOST" }); expect(failed.retryJobId).toBeTruthy();
  expect(await queue.complete(claimed, handler, result)).toBe(false);
  await pool.query("UPDATE jobs SET next_run_at=now() WHERE id=$1", [failed.retryJobId]); await run();
  expect((await jobs.get(raw, failed.retryJobId!)).status).toBe("succeeded");
  expect((await exports.download(raw, failed.retryJobId!)).downloadUrl).toContain("/api/files/");
  await expect(exports.download(raw, j.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("blocks suspended owners and archived parents even for already-issued ZIP tickets", async () => {
  const f = await fixture(); await finalized(f); const j = await exportOne(f); await run();
  const token = (await exports.download(raw, j.id)).downloadUrl.split("/").at(-1)!.split("?")[0];
  await workspace.patchProject(raw, f.p.id, { version: 1, archived: true });
  await expect(storage.download(raw, token)).rejects.toMatchObject({ code: "NOT_FOUND" });
  await workspace.patchProject(raw, f.p.id, { version: 2, archived: false });
  await pool.query("UPDATE users SET status='suspended' WHERE id=$1", [owner]);
  await expect(exports.download(raw, j.id)).rejects.toThrow(); await expect(storage.download(raw, token)).rejects.toThrow();
});
it("detects same-size content corruption and expires download tickets without removing originals", async () => {
  const f = await fixture(); await finalized(f);
  const a = await workspace.getAsset(raw, f.aid), token = a.imageUrl.split("/").at(-1)!;
  await writeFile(storagePath(f.file.storageKey), Buffer.alloc(png.length, 1));
  await expect(storage.download(raw, token, true)).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await writeFile(storagePath(f.file.storageKey), png);
  await pool.query("UPDATE storage_tickets SET expires_at=now()-interval '1 second' WHERE id=$1", [digest(token)]);
  await expect(storage.download(raw, token, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
  await maintainStorage(pool);
  expect(await readFile(storagePath(f.file.storageKey))).toEqual(png);
});
