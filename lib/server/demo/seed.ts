import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { AuthService, digest } from "../auth/service";
import { WorkspaceService } from "../projects/service";
import { StorageService } from "../storage/service";
import { fileSchema, partnerProfileSchema, localizedContentSchema, preferencesSchema } from "../../contracts/metadata";
import { demoPartners, demoProjects, demoCriteria } from "./data";

export const demoId = (owner: string, kind: string, index: number) => `demo-v1-${createHash("sha256").update(owner).digest("hex").slice(0, 16)}-${kind}-${index}`;
export async function seedDemo(auth: AuthService, raw: string) {
  const lock = await auth.pool.connect();
  let locked = false;
  try {
    const database = (await lock.query("SELECT current_database() AS name")).rows[0].name;
    if (!/^(claps_demo|claps_test(?:_[a-z0-9]+)?)$/.test(database)) throw new Error("DEMO_DATABASE_REQUIRED");
    await lock.query("SELECT pg_advisory_lock(hashtext('claps-demo-seed-v1'))"); locked = true;
    const workspace = new WorkspaceService(auth), storage = new StorageService(workspace);
    const owner = await workspace.run(raw, async (c, owner) => {
      for (const p of demoPartners) {
        const id = `demo-v1-partner-${p.key}`;
        const profile = partnerProfileSchema.parse({ schemaVersion: 1, description: p.koDescription, tags: p.tags, ipNames: [], marketDescription: p.marketKo, images: [] });
        const inserted = await c.query("INSERT INTO partners(id,name,visibility,profile) VALUES($1,$2,'public',$3) ON CONFLICT(id) DO NOTHING RETURNING id", [id, p.ko, profile]);
        if (!inserted.rowCount) continue; // Preserve edited master and translations together.
        for (const locale of ["ko", "en"]) {
          const content = localizedContentSchema.parse({ schemaVersion: 1, resourceType: "partner", name: locale === "ko" ? p.ko : p.en, description: locale === "ko" ? p.koDescription : p.enDescription, marketDescription: locale === "ko" ? p.marketKo : p.marketEn });
          await c.query("INSERT INTO localized_contents(id,resource_type,resource_key,locale_code,source_revision,draft,published,published_source_revision,published_version,published_at,updated_by) VALUES($1,'partner',$2,$3,1,$4,$4,1,1,now(),$5)", [`${id}-${locale}`, id, locale, content, owner]);
        }
      }
      for (const [index, p] of demoProjects.entries()) {
        const id = demoId(owner, "project", index);
        await c.query("INSERT INTO projects(id,owner_id,name,ip_name,description) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING", [id, owner, p.name, p.ip, p.description]);
        await c.query("INSERT INTO asset_sessions(id,owner_id,project_id,title) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING", [demoId(owner, "session", index), owner, id, p.session]);
      }
      const { rows: [u] } = await c.query("SELECT preferences FROM users WHERE id=$1", [owner]);
      const preferences = preferencesSchema.parse(u.preferences);
      if (!preferences.matching) {
        await c.query("UPDATE users SET preferences=$2,version=version+1,updated_at=now() WHERE id=$1", [owner, preferencesSchema.parse({ ...preferences, matching: demoCriteria })]);
      }
      return owner;
    });
    for (let index = 0; index < 2; index++) {
      const id = demoId(owner, "monitor", index);
      const exists = await workspace.run(raw, async (c, owner) => (await c.query("SELECT 1 FROM monitoring_records WHERE id=$1 AND owner_id=$2", [id, owner])).rowCount);
      if (exists) continue;
      // Simple geometric upload fixtures, not generated artwork or provider output.
      const bytes = await sharp({ create: { width: 640, height: 480, channels: 3, background: index ? "#bde0cf" : "#c7d9f5" } }).png().toBuffer();
      const ticket = await storage.reserveMonitoring(raw, { name: `sample-original-${index + 1}.png`, mime: "image/png", size: bytes.length });
      await storage.upload(raw, ticket.ticket, bytes, "image/png");
      await workspace.run(raw, async (c, owner) => {
        const { rows: [t] } = await c.query("SELECT metadata FROM storage_tickets WHERE id=$1 AND owner_id=$2 AND state='ready' AND expires_at>now() FOR UPDATE", [digest(ticket.ticket), owner]);
        if (!t) throw new Error("DEMO_UPLOAD_NOT_READY");
        await c.query("INSERT INTO monitoring_records(id,owner_id,name,source_file) VALUES($1,$2,$3,$4)", [id, owner, `샘플 원본 ${index + 1} / Sample original ${index + 1}`, fileSchema.parse(t.metadata)]);
        await c.query("UPDATE storage_tickets SET state='claimed',updated_at=now() WHERE id=$1", [digest(ticket.ticket)]);
      });
    }
    return { partners: 6, translations: 12, projects: 3, sessions: 3, monitoringOriginals: 2, ownerId: owner };
  } finally {
    try { if (locked) await lock.query("SELECT pg_advisory_unlock(hashtext('claps-demo-seed-v1'))"); }
    finally { lock.release(); }
  }
}
