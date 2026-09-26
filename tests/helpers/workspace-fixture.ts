import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import sharp from "sharp";
import { expect, type APIRequestContext } from "@playwright/test";
export async function createProject(request: APIRequestContext, origin: string, name = "원문 프로젝트", status = "verifying") {
  const response = await request.post("/api/projects", { headers: { Origin: origin }, data: { name, ip: "Original IP", status } }); expect(response.status()).toBe(201); return (await response.json()).data;
}
export async function createSession(request: APIRequestContext, origin: string, projectId: string, title = "Original session") {
  const response = await request.post("/api/asset-sessions", { headers: { Origin: origin }, data: { title, projectId } }); expect(response.status()).toBe(201); return (await response.json()).data;
}
export async function coverFixture(request: APIRequestContext, origin: string, project: { id: string; version: number }) {
  const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#ee4499" } }).png().toBuffer();
  const response = await request.post("/api/uploads", { headers: { Origin: origin }, data: { projectId: project.id, name: "fixture.png", mime: "image/png", size: png.length } }); expect(response.status()).toBe(201);
  const ticket = (await response.json()).data;
  expect((await request.put(ticket.uploadUrl, { headers: { Origin: origin, "Content-Type": "image/png" }, data: png })).status()).toBe(200);
  const patched = await request.patch(`/api/projects/${project.id}`, { headers: { Origin: origin }, data: { version: project.version, cover: { kind: "upload", ticket: ticket.ticket } } }); expect(patched.status()).toBe(200); return { project: (await patched.json()).data, png };
}
export async function assetFixture(request: APIRequestContext, origin: string, project: { id: string; version: number }, sessionId: string) {
  await coverFixture(request, origin, project);
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/claps_test") throw new Error("Isolated test DB required");
  const pool = new Pool({ connectionString: url }); const assetId = randomUUID(), jobId = randomUUID();
  try {
    const { rows: [p] } = await pool.query("SELECT owner_id,cover FROM projects WHERE id=$1", [project.id]);
    await pool.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES($1,$2,$3,'generation','succeeded',$4,$5)", [jobId, p.owner_id, project.id, { schemaVersion: 1, kind: "generation", sessionId, prompt: "Test fixture", outputLocale: "ko" }, "f".repeat(64)]);
    await pool.query("INSERT INTO assets(id,session_id,generation_job_id,file) VALUES($1,$2,$3,$4)", [assetId, sessionId, jobId, p.cover.file]);
  } finally { await pool.end(); } return assetId;
}
