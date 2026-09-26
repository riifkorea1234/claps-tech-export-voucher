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
import { MatchingService } from "../../lib/server/matching/service";
import { matchingHandler } from "../../lib/server/matching/handler";
import { JobService } from "../../lib/server/jobs/service";
import { JobQueue } from "../../lib/server/jobs/queue";
import { HandlerRegistry, JobFailure } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { runClaimedJob } from "../../lib/server/jobs/runner";
import { hasStoredFileReferences } from "../../lib/server/assets/lifecycle";
const testUrl = getTestDatabaseUrl();
const { pool } = createDatabase(testUrl, 8), auth = new AuthService(pool, async () => {}, "http://localhost:3000"), workspace = new WorkspaceService(auth), storage = new StorageService(workspace);
const registry = new HandlerRegistry().register("matching", matchingHandler()), jobs = new JobService(auth, registry, developmentQueuePolicy), queue = new JobQueue(jobs), service = new MatchingService(workspace, jobs);
const owners: string[] = [], partners: string[] = []; let raw: string, owner: string, directory: string, png: Buffer;
async function account() {
  const id = randomUUID(), token = randomBytes(32).toString("hex"); owners.push(id);
  await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Fixture',true,'active')", [id, `${id}@example.test`]);
  await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')", [randomUUID(), id, digest(token)]); return { id, token };
}
async function partner(word: string, visibility = "public") {
  const id = randomUUID(); partners.push(id);
  await pool.query("INSERT INTO partners(id,name,contact_email,visibility,profile) VALUES($1,$2,'contact@example.test',$3,$4)", [id, word, visibility, { schemaVersion: 1, description: word, tags: [word], ipNames: [word], marketDescription: word, images: [] }]); return id;
}
const save = (criteria: unknown = { styles: ["cute"] }, revision = 0, referenceIds: string[] = []) => service.save(raw, { criteria, revision, referenceIds });
const request = (revision = 1, key: string = randomUUID()) => service.request(raw, { revision, outputLocale: "ko", idempotencyKey: key });
async function run() { const job = await queue.claim("phase9"); expect(job).not.toBeNull(); await runClaimedJob(queue, job!); return job!; }
beforeAll(async () => {
  await migrateDatabase(pool); directory = await mkdtemp(join(tmpdir(), "claps-p9-")); process.env.UPLOADS_DIR = directory;
  png = await sharp({ create: { width: 12, height: 12, channels: 3, background: "red" } }).png().toBuffer();
  await pool.query("INSERT INTO locales(code,native_name,display_name,enabled) VALUES('ko','한국어','Korean',true),('en','English','English',true) ON CONFLICT(code) DO UPDATE SET enabled=true");
});
beforeEach(async () => { const a = await account(); raw = a.token; owner = a.id; });
afterEach(async () => { await pool.query("UPDATE jobs SET status='canceled' WHERE owner_id=ANY($1) AND status IN ('queued','running')", [owners]); await pool.query("UPDATE partners SET visibility='private' WHERE id=ANY($1)", [partners]); });
afterAll(async () => {
  await pool.query("DELETE FROM localized_contents WHERE resource_type='partner' AND resource_key=ANY($1)", [partners]);
  await pool.query("DELETE FROM partners WHERE id=ANY($1)", [partners]); await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [owners]); await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)", [owners]); await pool.query("DELETE FROM users WHERE id=ANY($1)", [owners]); await pool.end(); if (directory) await rm(directory, { recursive: true });
});
it("saves/restores all criteria and protects locale, revisions, strict inputs and account isolation", async () => {
  await pool.query("UPDATE users SET preferences=$2 WHERE id=$1", [owner, { schemaVersion: 1, locale: "en" }]);
  const criteria = { ipName: "Cute", category: "character", worldView: "friend", styles: ["cute"], licensee: "stationery", industries: ["paper"], revenue: "100", collaborationHistory: "brand" };
  const saved = await save(criteria); expect((await service.get(raw)).criteria).toEqual(criteria); expect(saved.revision).toBe(1);
  expect((await pool.query("SELECT preferences FROM users WHERE id=$1", [owner])).rows[0].preferences.locale).toBe("en");
  await expect(save(criteria)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  const b = await account(); expect((await service.get(b.token)).revision).toBe(0);
  await expect(service.save(raw, { revision: 1, criteria, referenceIds: [], ownerId: b.id })).rejects.toThrow();
  const concurrent = await Promise.allSettled([save(criteria, 1), save(criteria, 1)]); expect(concurrent.filter(r => r.status === "fulfilled")).toHaveLength(1);
});
it("persists decoded owned images, rejects foreign/expired/invalid uploads, retains job file references after removal", async () => {
  const ticket = await storage.reserveMatching(raw, { name: "ref.png", mime: "image/png", size: png.length });
  const b = await account(); await expect(storage.upload(b.token, ticket.ticket, png, "image/png")).rejects.toMatchObject({ code: "NOT_FOUND" });
  await storage.upload(raw, ticket.ticket, png, "image/png");
  expect((await storage.matchingImage(raw, ticket.referenceId)).bytes).toEqual(png);
  await expect(service.save(b.token, { revision: 0, criteria: {}, referenceIds: [ticket.referenceId] })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await save(undefined, 0, [ticket.referenceId]); expect((await service.get(raw)).references[0].name).toBe("ref.png");
  await request(); await run();
  const file = (await pool.query("SELECT preferences FROM users WHERE id=$1", [owner])).rows[0].preferences.matching.references[0].file;
  await save(undefined, 1); await expect(storage.matchingImage(raw, ticket.referenceId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(await auth.transaction(c => hasStoredFileReferences(c, file.storageKey))).toBe(true);
  expect(await auth.transaction(c => hasStoredFileReferences(c, file.thumbnailKey))).toBe(true);
  const invalid = await storage.reserveMatching(raw, { name: "bad.png", mime: "image/png", size: 3 });
  await expect(storage.upload(raw, invalid.ticket, Buffer.from("bad"), "image/png")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  const expired = await storage.reserveMatching(raw, { name: "old.png", mime: "image/png", size: png.length });
  await pool.query("UPDATE storage_tickets SET expires_at=now()-interval '1 second' WHERE id=$1", [digest(expired.ticket)]);
  await expect(storage.upload(raw, expired.ticket, png, "image/png")).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("runs real rules with input/candidate/version snapshots and hides private partners including old results", async () => {
  const id = await partner("cute"), privateId = await partner("cute", "private"); await save();
  const j = await request(); await pool.query("UPDATE partners SET profile=jsonb_set(profile,'{description}','\"changed\"'),version=version+1 WHERE id=$1", [id]);
  await run(); const latest = await service.latest(raw, "ko"); expect(latest.result?.items.map(x => x.partnerId)).toEqual([id]);
  expect(latest.result?.items[0]).toMatchObject({ score: 100, partnerVersion: 1 });
  const row = (await pool.query("SELECT * FROM jobs WHERE id=$1", [j.id])).rows[0];
  expect(row.input.snapshot.candidates.map((x: { id: string }) => x.id)).not.toContain(privateId); expect(row.output.evaluation.engineVersion).toBe("rules-v1"); expect(row.cost_state).toBe("none");
  await pool.query("UPDATE partners SET visibility='private' WHERE id=$1", [id]); expect((await service.latest(raw, "ko")).result?.items).toEqual([]);
  expect((await pool.query("SELECT output FROM jobs WHERE id=$1", [j.id])).rows[0].output).toEqual(row.output);
});
it("deduplicates requests, rejects revision/key conflicts, busy jobs, empty inputs and unavailable handlers", async () => {
  await save(); const [a, b] = await Promise.all([request(1, "same"), request(1, "same")]); expect(a.id).toBe(b.id);
  await expect(request()).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await expect(request(2, "same")).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }); await run();
  await expect(request(2)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  const unavailable = new MatchingService(workspace, new JobService(auth, new HandlerRegistry(), developmentQueuePolicy));
  await expect(unavailable.request(raw, { revision: 1, outputLocale: "ko", idempotencyKey: "unavailable" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  await save({}, 1); await expect(request(2)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
});
it("keeps previous success while pending, failed or canceled, then replaces it on success", async () => {
  const a = await partner("cute"), b = await partner("sport"); await save(); const first = await request(); await run();
  await save({ styles: ["sport"] }, 1); const second = await request(2);
  expect((await service.latest(raw, "en")).result?.items[0].partnerId).toBe(a);
  const claim = await queue.claim("phase9-fail"); expect(claim!.id).toBe(second.id); await queue.fail(claim!, new JobFailure("INVALID_RESULT"));
  expect((await service.latest(raw, "en")).result?.jobId).toBe(first.id);
  const canceled = await request(2); await jobs.cancel(raw, canceled.id); expect((await service.latest(raw, "ko")).result?.jobId).toBe(first.id);
  await request(2); await run(); expect((await service.latest(raw, "ko")).result?.items[0].partnerId).toBe(b);
});
it("enforces per-owner result/job isolation, suspension, hourly and upload admission limits", async () => {
  await save(); const j = await request(); await run(); const b = await account();
  expect((await service.latest(b.token, "ko")).result).toBeNull(); await expect(jobs.get(b.token, j.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  const limited = new MatchingService(workspace, new JobService(auth, registry, { ...developmentQueuePolicy, requestsPerHour: 1 }));
  await expect(limited.request(raw, { revision: 1, outputLocale: "ko", idempotencyKey: "limited" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  for (let i = 0; i < 20; i++) await storage.reserveMatching(raw, { name: "ref.png", mime: "image/png", size: 1 });
  await expect(storage.reserveMatching(raw, { name: "ref.png", mime: "image/png", size: 1 })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await pool.query("UPDATE users SET status='suspended' WHERE id=$1", [owner]); await expect(service.latest(raw, "ko")).rejects.toThrow();
});
it("serves only published translations with original contact, and preserves result language", async () => {
  const id = await partner("cute"); await save(); await request(); await run();
  const content = { schemaVersion: 1, resourceType: "partner", name: "Published English", description: "Public English description" };
  await pool.query("INSERT INTO localized_contents(id,resource_type,resource_key,locale_code,source_revision,draft,published,published_version,published_at,updated_by) VALUES($1,'partner',$2,'en',1,$3,$4,1,now(),$5)", [randomUUID(), id, { ...content, name: "SECRET DRAFT" }, content, owner]);
  const en = await service.latest(raw, "en"), ko = await service.latest(raw, "ko");
  expect(en.result?.items[0].partner).toMatchObject({ name: "Published English", contactEmail: "contact@example.test", resolvedLocale: "en", fallbackUsed: false });
  expect(JSON.stringify(en)).not.toContain("SECRET DRAFT"); expect(en.result?.outputLocale).toBe("ko"); expect(en.result?.jobId).toBe(ko.result?.jobId);
  await pool.query("UPDATE localized_contents SET published_at=NULL WHERE resource_key=$1", [id]);
  expect((await service.latest(raw, "en")).result?.items[0].partner).toMatchObject({ name: "cute", resolvedLocale: "ko", fallbackUsed: true });
});

it("does not invent a contact email when a public partner has none", async () => {
  const id = await partner("cute"); await pool.query("UPDATE partners SET contact_email=NULL WHERE id=$1", [id]);
  await save(); await request(); await run();
  expect((await service.latest(raw, "ko")).result?.items[0].partner.contactEmail).toBeNull();
});
