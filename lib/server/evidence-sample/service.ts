import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { fileSchema, guideRulesSchema } from "../../contracts/metadata";
import { AppError } from "../errors/http";
import { WorkspaceService } from "../projects/service";
import { JobService } from "../jobs/service";
import { authorizeEvidence } from "./handlers";
import { storageRoot, storagePath } from "../storage/config";

// Separate, explicit evidence-only lifecycle. The existing production guide prototype is unchanged.
export class EvidenceSampleService {
  constructor(readonly ws: WorkspaceService, readonly jobs: JobService) {}
  enabled(raw: string | undefined) { return this.ws.run(raw, async (c, owner) => { try { await authorizeEvidence(c, owner); return { enabled: true }; } catch { return { enabled: false }; } }); }
  list(raw: string | undefined, project: string) { return this.ws.run(raw, async (c, owner) => { await authorizeEvidence(c, owner); await this.ws.projectRow(c, owner, project); return (await c.query("SELECT id,version,row_version,status,rules,extraction_job_id FROM brand_guides WHERE project_id=$1 ORDER BY version DESC", [project])).rows; }); }
  async upload(raw: string | undefined, project: string, name: string, bytes: Buffer) {
    if (!name.endsWith(".pdf") || bytes.length > 10 * 1024 * 1024 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new AppError("VALIDATION_ERROR");
    const id = randomUUID(), file = fileSchema.parse({ schemaVersion: 1, storageKey: `${id}-original`, originalName: name, mimeType: "application/pdf", size: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex") });
    await this.ws.run(raw, async (c, owner) => {
      await authorizeEvidence(c, owner); await this.ws.projectRow(c, owner, project);
      await c.query("INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,state,metadata,expires_at) VALUES($1,$2,'cleanup','project',$3,'cleanup_pending',$4,now())", [randomUUID(), owner, project, file]);
    });
    await mkdir(storageRoot(), { recursive: true, mode: 0o700 }); await writeFile(storagePath(file.storageKey), bytes, { flag: "wx", mode: 0o600 });
    return this.ws.run(raw, async (c, owner) => { await authorizeEvidence(c, owner); await this.ws.projectRow(c, owner, project); const g = (await c.query("INSERT INTO brand_guides(id,project_id,version,file,status) SELECT $1,$2,COALESCE(max(version),0)+1,$3,'uploaded' FROM brand_guides WHERE project_id=$2 RETURNING *", [id, project, file])).rows[0]; return { id: g.id, version: g.version }; });
  }
  edit(raw: string | undefined, guide: string, input: unknown) { const d = z.strictObject({ rowVersion: z.number().int().positive(), rules: guideRulesSchema }).parse(input); return this.ws.run(raw, async (c, owner) => { await authorizeEvidence(c, owner); const g = (await c.query("SELECT g.* FROM brand_guides g JOIN projects p ON p.id=g.project_id WHERE g.id=$1 AND p.owner_id=$2 FOR UPDATE OF g", [guide, owner])).rows[0]; if (!g) throw new AppError("NOT_FOUND"); if (g.status !== "draft" || g.row_version !== d.rowVersion) throw new AppError("VERSION_CONFLICT"); await c.query("UPDATE brand_guides SET rules=$2,row_version=row_version+1,source_revision=source_revision+1 WHERE id=$1", [guide, d.rules]); return { updated: true }; }); }
  publish(raw: string | undefined, guide: string) { return this.ws.run(raw, async (c, owner) => { await authorizeEvidence(c, owner); const g = (await c.query("SELECT g.* FROM brand_guides g JOIN projects p ON p.id=g.project_id WHERE g.id=$1 AND p.owner_id=$2 AND p.archived_at IS NULL FOR UPDATE OF p,g", [guide, owner])).rows[0]; if (!g) throw new AppError("NOT_FOUND"); if (!["draft", "published"].includes(g.status) || !guideRulesSchema.safeParse(g.rules).success) throw new AppError("STATE_CONFLICT"); await c.query("UPDATE brand_guides SET status='published',row_version=row_version+1 WHERE id=$1", [guide]); await c.query("UPDATE projects SET active_guide_id=$2,version=version+1,updated_at=now() WHERE id=$1", [g.project_id, guide]); return { published: true }; }); }
}
