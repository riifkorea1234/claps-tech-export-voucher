import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createDatabase } from "../../lib/server/db";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { AuthService, digest } from "../../lib/server/auth/service";
import { WorkspaceService } from "../../lib/server/projects/service";
import { StorageService, MAX_UPLOAD_BYTES, storagePath, readUpload } from "../../lib/server/storage/service";
import { hasStoredFileReferences, lockActiveSession } from "../../lib/server/assets/lifecycle";
const { pool } = createDatabase(getTestDatabaseUrl(), 6);
const auth = new AuthService(pool, async () => {}, "http://localhost:3000"), service = new WorkspaceService(auth), storage = new StorageService(service);
const owners: string[] = []; let a: string, b: string, directory: string, png: Buffer;
async function account() {
  const id = randomUUID(), token = randomBytes(32).toString("hex"); owners.push(id);
  await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Fixture',true,'active')", [id, `${id}@example.test`]);
  await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')", [randomUUID(), id, digest(token)]); return token;
}
async function project(token = a, name = "Original") { return service.createProject(token, { name, ip: "Test IP" }); }
async function uploaded(projectId: string, token = a) {
  const ticket = await storage.reserve(token, { projectId, name: "cover.png", mime: "image/png", size: png.length });
  await storage.upload(token, ticket.ticket, png, "image/png"); return ticket.ticket;
}
async function syntheticAsset(sessionId: string) {
  const s = (await pool.query("SELECT * FROM asset_sessions WHERE id=$1", [sessionId])).rows[0];
  const job = randomUUID(), id = randomUUID();
  const file = { schemaVersion: 1, storageKey: `${randomUUID()}-original`, thumbnailKey: `${randomUUID()}-thumbnail`, originalName: "fixture.png", mimeType: "image/png", size: png.length, checksum: createHash("sha256").update(png).digest("hex") };
  await pool.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES($1,$2,$3,'generation','succeeded',$4,$5)", [job, s.owner_id, s.project_id, { schemaVersion: 1, kind: "generation", outputLocale: "ko", sessionId, prompt: "Synthetic fixture" }, "a".repeat(64)]);
  await pool.query("INSERT INTO assets(id,session_id,generation_job_id,file) VALUES($1,$2,$3,$4)", [id, sessionId, job, file]); return { id, file };
}
beforeAll(async () => { await migrateDatabase(pool); directory = await mkdtemp(join(tmpdir(), "claps-p4-")); process.env.UPLOADS_DIR = directory; png = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#ee4488" } }).png().toBuffer(); a = await account(); b = await account(); });
afterAll(async () => {
  await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [owners]);
  await pool.query("UPDATE projects SET cover='{\"schemaVersion\":1,\"kind\":\"default\"}' WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM assets WHERE session_id IN(SELECT id FROM asset_sessions WHERE owner_id=ANY($1))", [owners]);
  await pool.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM asset_sessions WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM projects WHERE owner_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)", [owners]);
  await pool.query("DELETE FROM users WHERE id=ANY($1)", [owners]); await pool.end(); if (directory) await rm(directory, { recursive: true });
});
it("rejects anonymous, inactive and injected ownership fields", async () => {
  await expect(service.createProject(undefined, { name: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(service.createProject(a, { name: "x", ownerId: owners[1] })).rejects.toThrow();
  await expect(service.createSession(a, { title: "x", version: 1 })).rejects.toThrow();
});
it("isolates project/session/asset reads and all writes and cross-owner links", async () => {
  const p = await project(), s = await service.createSession(a, { title: "Session", projectId: p.id }), asset = await syntheticAsset(s.id);
  for (const action of [() => service.getProject(b, p.id), () => service.patchProject(b, p.id, { version: 1, name: "Stolen" }), () => service.getSession(b, s.id), () => service.patchSession(b, s.id, { version: 1, archived: true }), () => service.createSession(b, { title: "Illegal", projectId: p.id }), () => service.getAsset(b, asset.id), () => service.patchAsset(b, asset.id, { version: 1, adopted: true }), () => service.listAssets(b, s.id), () => service.listAssets(b, p.id, true)]) await expect(action()).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect((await service.listProjects(b)).total).toBe(0);
  const bs = await service.createSession(b, { title: "B" }); await expect(service.patchSession(b, bs.id, { version: 1, projectId: p.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("uses server UTC timestamps, literal search, 30-item pages, stable sort and KPI", async () => {
  const token = await account();
  for (let i = 0; i < 31; i++) await service.createProject(token, { name: `Page ${String(i).padStart(2, "0")}`, ip: i === 0 ? "Literal %_" : "Studio", status: i === 1 ? "verifying" : i === 2 ? "needs_fix" : "preparing" });
  const first = await service.listProjects(token), second = await service.listProjects(token, { page: 2 });
  expect(first.items).toHaveLength(30); expect(second.items).toHaveLength(1); expect(first.total).toBe(31); expect(first.items[0].createdAt).toMatch(/Z$/);
  expect(new Set([...first.items, ...second.items].map(p => p.id)).size).toBe(31);
  expect((await service.listProjects(token, { q: "%_" })).total).toBe(1);
  expect((await service.listProjects(token, { sort: "oldest" })).items[0].name).toBe("Page 00");
  expect(await service.stats(token)).toEqual({ activeCount: 31, inReviewCount: 1, needsFixCount: 1 });
  await expect(service.getProject(token, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("requires the displayed version and commits only one concurrent edit", async () => {
  const p = await service.createProject(a, { name: "Version", ip: "Keep IP", description: "Keep description", status: "verifying" }); const results = await Promise.allSettled([service.patchProject(a, p.id, { version: p.version, name: "A" }), service.patchProject(a, p.id, { version: p.version, name: "B" })]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "VERSION_CONFLICT" } });
  await expect(service.patchProject(a, p.id, { name: "No version" })).rejects.toThrow();
  expect(await service.getProject(a, p.id)).toMatchObject({ ip: "Keep IP", description: "Keep description", status: "verifying" });
});
it("archives parents without deleting children and restores independently archived sessions", async () => {
  const p = await project(), s = await service.createSession(a, { title: "Keep", projectId: p.id }), own = await service.createSession(a, { title: "Archived", projectId: p.id });
  await service.patchSession(a, own.id, { version: 1, archived: true });
  const archived = await service.patchProject(a, p.id, { version: 1, archived: true });
  await expect(service.getSession(a, s.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect((await service.listProjects(a, { archived: "true" })).items.some(r => r.id === p.id)).toBe(true);
  await service.patchProject(a, p.id, { version: archived.version, archived: false });
  expect((await service.getSession(a, s.id)).title).toBe("Keep"); await expect(service.getSession(a, own.id)).rejects.toThrow();
  await service.patchSession(a, own.id, { version: 2, archived: false }); expect((await service.listSessions(a, { projectId: p.id })).total).toBe(2);
});
it("permits project moves only before generation; job history also prevents moves", async () => {
  const p = await project(), s = await service.createSession(a, { title: "Move" });
  const moved = await service.patchSession(a, s.id, { version: 1, projectId: p.id }); expect(moved.projectId).toBe(p.id);
  await syntheticAsset(s.id); await expect(service.patchSession(a, s.id, { version: 2, projectId: null })).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  const renamed = await service.patchSession(a, s.id, { version: 2, title: "Renamed" }); expect((await service.getSession(a, s.id)).title).toBe(renamed.title);
});
it("adopts server assets, counts stages, preserves referenced/finalized assets", async () => {
  const p = await project(), s = await service.createSession(a, { title: "Assets", projectId: p.id }), first = await syntheticAsset(s.id), second = await syntheticAsset(s.id);
  await service.patchAsset(a, first.id, { version: 1, adopted: true }); expect((await service.getSession(a, s.id)).adopted).toBe(1);
  await expect(service.patchAsset(a, first.id, { version: 1, deleted: true })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await pool.query("UPDATE assets SET finalized_at=now() WHERE id=$1", [second.id]);
  expect((await service.listAssets(a, p.id, true))).toHaveLength(1);
  expect((await service.getSession(a, s.id)).thumbnailUrl).toMatch(/^\/api\/files\//);
  await expect(service.patchAsset(a, second.id, { version: 1, deleted: true })).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await service.patchAsset(a, first.id, { version: 2, deleted: true }); await expect(service.getAsset(a, first.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect((await service.getProject(a, p.id)).generated).toBe(1);
});
it("stores original and decoded thumbnail separately and enforces owner-bound downloads", async () => {
  const p = await project(), ticket = await uploaded(p.id);
  const updated = await service.patchProject(a, p.id, { version: 1, cover: { kind: "upload", ticket } }); expect(updated.cover).toBeDefined();
  const token = updated.cover!.value.split("/").at(-1)!;
  const thumb = await storage.download(a, token); expect(thumb.mime).toBe("image/webp"); expect((await sharp(thumb.bytes).metadata()).width).toBe(320);
  await expect(storage.download(b, token)).rejects.toMatchObject({ code: "NOT_FOUND" });
  const row = (await pool.query("SELECT cover FROM projects WHERE id=$1", [p.id])).rows[0]; const file = row.cover.file;
  expect(file.storageKey).not.toBe(file.thumbnailKey); expect(await readFile(storagePath(file.storageKey))).toEqual(png);
  expect(file.checksum).toBe(createHash("sha256").update(png).digest("hex"));
  await service.run(a, async c => expect(await hasStoredFileReferences(c, file.storageKey)).toBe(true));
  await expect(service.patchProject(a, p.id, { version: 2, cover: { kind: "upload", ticket } })).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("rejects spoofed MIME, wrong extension, paths, corrupt data and over-limit bodies", async () => {
  const p = await project();
  for (const d of [{ name: "cover.svg", mime: "image/svg+xml", size: 10 }, { name: "../cover.png", mime: "image/png", size: 10 }, { name: "cover.jpg", mime: "image/png", size: 10 }, { name: "cover.png", mime: "image/png", size: MAX_UPLOAD_BYTES + 1 }]) await expect(storage.reserve(a, { projectId: p.id, ...d })).rejects.toThrow();
  const t = await storage.reserve(a, { projectId: p.id, name: "spoof.png", mime: "image/png", size: 4 }); await expect(storage.upload(a, t.ticket, Buffer.from("nope"), "image/png")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  const jpeg = await sharp(png).jpeg().toBuffer(); const t2 = await storage.reserve(a, { projectId: p.id, name: "spoof.png", mime: "image/png", size: jpeg.length }); await expect(storage.upload(a, t2.ticket, jpeg, "image/png")).rejects.toThrow();
  expect(() => storagePath("../../etc/passwd")).toThrow();
  await expect(readUpload(new Request("http://localhost", { method: "PUT", body: Buffer.alloc(MAX_UPLOAD_BYTES + 1) }))).rejects.toThrow();
});
it("expires tickets, rejects cross-target attach and preserves files when cover changes", async () => {
  const p = await project(), other = await project(), ticket = await uploaded(p.id);
  await expect(service.patchProject(b, p.id, { version: 1, cover: { kind: "upload", ticket } })).rejects.toThrow();
  await expect(service.patchProject(a, other.id, { version: 1, cover: { kind: "upload", ticket } })).rejects.toThrow();
  await pool.query("UPDATE storage_tickets SET expires_at=now()-interval '1 second' WHERE id=$1", [digest(ticket)]);
  await expect(service.patchProject(a, p.id, { version: 1, cover: { kind: "upload", ticket } })).rejects.toThrow();
  const valid = await uploaded(p.id); const covered = await service.patchProject(a, p.id, { version: 1, cover: { kind: "upload", ticket: valid } });
  const download = covered.cover!.value.split("/").at(-1)!; await pool.query("UPDATE storage_tickets SET expires_at=now()-interval '1 second' WHERE id=$1", [digest(download)]); await expect(storage.download(a, download)).rejects.toThrow();
  const old = (await pool.query("SELECT cover FROM projects WHERE id=$1", [p.id])).rows[0].cover.file;
  await service.patchProject(a, p.id, { version: 2, cover: { kind: "default" } });
  expect(await readFile(storagePath(old.storageKey))).toEqual(png);
  expect((await pool.query("SELECT 1 FROM storage_tickets WHERE kind='cleanup' AND target_id=$1 AND state='cleanup_pending'", [p.id])).rowCount).toBe(1);
});
it("blocks inactive users and late worker writes under the same lifecycle lock", async () => {
  const token = await account(), p = await project(token), s = await service.createSession(token, { title: "Lifecycle", projectId: p.id });
  await service.run(token, c => lockActiveSession(c, owners.at(-1)!, s.id));
  await service.patchProject(token, p.id, { version: 1, archived: true });
  await expect(service.run(token, c => lockActiveSession(c, owners.at(-1)!, s.id))).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await pool.query("UPDATE users SET status='withdrawal_pending' WHERE id=$1", [owners.at(-1)]);
  await expect(service.listProjects(token)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
it("accepts decoded JPEG/WebP and rejects wrong-owner, expired and archived uploads", async () => {
  const p = await project();
  for (const format of ["jpeg", "webp"] as const) {
    const bytes = await sharp(png)[format]().toBuffer(), mime = `image/${format}`;
    const ticket = await storage.reserve(a, { projectId: p.id, name: `image.${format}`, mime, size: bytes.length });
    await expect(storage.upload(b, ticket.ticket, bytes, mime)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await storage.upload(a, ticket.ticket, bytes, mime);
  }
  const expired = await storage.reserve(a, { projectId: p.id, name: "image.png", mime: "image/png", size: png.length });
  await pool.query("UPDATE storage_tickets SET expires_at=now()-interval '1 second' WHERE id=$1", [digest(expired.ticket)]);
  await expect(storage.upload(a, expired.ticket, png, "image/png")).rejects.toThrow();
  const reserved = await storage.reserve(a, { projectId: p.id, name: "image.png", mime: "image/png", size: png.length });
  await service.patchProject(a, p.id, { version: 1, archived: true }); await expect(storage.upload(a, reserved.ticket, png, "image/png")).rejects.toThrow();
});
it("resolves manual cover before latest final asset and denies foreign/project-mismatched covers", async () => {
  const p = await project(), s = await service.createSession(a, { title: "Cover assets", projectId: p.id }), asset = await syntheticAsset(s.id);
  await pool.query("UPDATE assets SET finalized_at=now() WHERE id=$1", [asset.id]);
  const other = await project(); await expect(service.patchProject(a, other.id, { version: 1, cover: { kind: "asset", assetId: asset.id } })).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  const selected = await service.patchProject(a, p.id, { version: 1, cover: { kind: "asset", assetId: asset.id } }); expect(selected.cover).toBeDefined();
  const ticket = await uploaded(p.id); await service.patchProject(a, p.id, { version: 2, cover: { kind: "upload", ticket } });
  const { rows: [row] } = await pool.query("SELECT * FROM projects WHERE id=$1", [p.id]); expect(row.cover.kind).toBe("upload");
  const cleared = await service.patchProject(a, p.id, { version: 3, cover: { kind: "default" } }); expect(cleared.cover).toBeDefined();
  const missing = await project(); expect((await service.listAssets(a, missing.id, true))).toEqual([]); expect(missing.cover).toBeUndefined();
});
it("tracks failed IO reservations and blocks existing download links after archival/withdrawal", async () => {
  const token = await account(), p = await project(token), ticket = await uploaded(p.id, token);
  const covered = await service.patchProject(token, p.id, { version: 1, cover: { kind: "upload", ticket } }); const link = covered.cover!.value.split("/").at(-1)!;
  const archived = await service.patchProject(token, p.id, { version: 2, archived: true }); await expect(storage.download(token, link)).rejects.toThrow();
  await service.patchProject(token, p.id, { version: archived.version, archived: false }); await expect(storage.download(token, link)).resolves.toHaveProperty("mime", "image/webp");
  const bad = await storage.reserve(token, { projectId: p.id, name: "bad.png", mime: "image/png", size: 4 }); await expect(storage.upload(token, bad.ticket, Buffer.from("fail"), "image/png")).rejects.toThrow();
  expect((await pool.query("SELECT state FROM storage_tickets WHERE id=$1", [digest(bad.ticket)])).rows[0].state).toBe("cleanup_pending");
  await pool.query("UPDATE users SET status='withdrawal_pending' WHERE id=$1", [owners.at(-1)]); await expect(storage.download(token, link)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
