// Manual Docker persistence smoke, synthetic isolated environment only.
import { request } from "@playwright/test";
import { readFile, writeFile, chmod, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { createAccount, cleanupAccounts } from "./auth-fixture";
import { createProject, createSession, assetFixture } from "./workspace-fixture";
const path = "/tmp/claps-phase4-persistence.json", origin = process.env.E2E_BASE_URL!;
function hash(bytes: Buffer) { return createHash("sha256").update(bytes).digest("hex"); }
async function main() {
  if (origin !== "http://127.0.0.1:3104" || !process.env.TEST_DATABASE_URL || new URL(process.env.TEST_DATABASE_URL).pathname !== "/claps_test") throw new Error("Isolated phase4 fixture environment required");
  const command = process.argv[2];
  if (command === "prepare") {
    const api = await request.newContext({ baseURL: origin });
    try {
      await createAccount(api, origin);
      const project = await createProject(api, origin, "Persistence fixture"), session = await createSession(api, origin, project.id, "Persistence session");
      const assetId = await assetFixture(api, origin, project, session.id);
      const asset = (await (await api.get(`/api/assets/${assetId}`)).json()).data;
      const original = await api.get(`${asset.imageUrl}?download=1`), thumbnail = await api.get(asset.thumbnailUrl);
      assert.equal(original.status(), 200); assert.equal(thumbnail.status(), 200);
      assert.match(original.headers()["content-disposition"], /^attachment/); assert.equal(original.headers()["cache-control"], "private, no-store");
      const state = { cookies: await api.storageState(), projectId: project.id, sessionId: session.id, assetId, originalHash: hash(await original.body()), thumbnailHash: hash(await thumbnail.body()) };
      assert.notEqual(state.originalHash, state.thumbnailHash);
      await writeFile(path, JSON.stringify(state), { mode: 0o600 }); await chmod(path, 0o600);
      console.log("PASS prepare: server IDs, authenticated original/thumbnail, distinct checksums and private headers");
    } finally { await api.dispose(); }
  } else if (command === "verify") {
    const state = JSON.parse(await readFile(path, "utf8")); const api = await request.newContext({ baseURL: origin, storageState: state.cookies });
    try {
      const project = (await (await api.get(`/api/projects/${state.projectId}`)).json()).data;
      const session = (await (await api.get(`/api/asset-sessions/${state.sessionId}`)).json()).data;
      assert.equal(project.name, "Persistence fixture"); assert.equal(session.title, "Persistence session"); assert.equal(session.projectId, project.id);
      const asset = (await (await api.get(`/api/assets/${state.assetId}`)).json()).data;
      assert.equal(hash(await (await api.get(asset.imageUrl)).body()), state.originalHash); assert.equal(hash(await (await api.get(asset.thumbnailUrl)).body()), state.thumbnailHash);
      console.log("PASS restart: same account/session/project/asset IDs and both file checksums after PostgreSQL + web restart");
      const archived = await api.patch(`/api/projects/${project.id}`, { headers: { Origin: origin }, data: { version: project.version, archived: true } }); assert.equal(archived.status(), 200);
      assert.equal((await api.get(asset.imageUrl)).status(), 404);
      const restored = await api.patch(`/api/projects/${project.id}`, { headers: { Origin: origin }, data: { version: (await archived.json()).data.version, archived: false } }); assert.equal(restored.status(), 200);
      assert.equal(hash(await (await api.get(asset.imageUrl)).body()), state.originalHash);
      console.log("PASS lifecycle: previously issued file link blocked by parent archive and restored without file loss");
    } finally { await api.dispose(); }
  } else if (command === "cleanup") { await cleanupAccounts(); await unlink(path); console.log("PASS cleanup: synthetic account/DB fixture and private session state removed"); }
  else throw new Error("Expected prepare, verify or cleanup");
}
main().catch(() => { console.error("Persistence smoke failed; inspect isolated fixture environment"); process.exitCode = 1; });
