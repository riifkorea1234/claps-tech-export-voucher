import "server-only";
import type { PoolClient, QueryResultRow } from "pg";
import { idSchema } from "../../contracts/common";
import { certificateSchema, evidenceEventSchema, evidencePageSchema, evidenceQuery, guideProvenanceSchema } from "../../contracts/evidence";
import { verificationSchema } from "../../contracts/metadata";
import { AppError } from "../errors/http";
import { strictEvidenceQuery } from "../../contracts/evidence-query";
import { verificationStale } from "../verifications/stale";
import { WorkspaceService } from "../projects/service";
// Metadata only: never invokes active-parent helpers or issues file capabilities.
export async function evidenceSession(c: PoolClient, owner: string, id: string) {
  idSchema.parse(id);
  const { rows: [s] } = await c.query(`SELECT s.*,p.archived_at project_archived_at,p.active_guide_id FROM asset_sessions s
    LEFT JOIN projects p ON p.id=s.project_id AND p.owner_id=s.owner_id WHERE s.id=$1 AND s.owner_id=$2`, [id, owner]);
  if (!s) throw new AppError("NOT_FOUND");
  return s;
}
function eventDto(r: QueryResultRow) { return evidenceEventSchema.parse({ id: r.id, sessionId: r.session_id, assetId: r.asset_id, jobId: r.job_id, kind: r.kind, actorId: r.payload.actorType === "admin" || r.actor_id !== r.owner_id ? null : r.actor_id, at: r.created_at.toISOString(), sequence: r.sequence, origin: r.origin, payload: r.payload }); }
export class EvidenceService {
  constructor(readonly workspace: WorkspaceService) {}
  list(raw: string | undefined, sessionId: string, input: unknown = {}) {
    return this.workspace.run(raw, async (c, owner) => {
      const q = evidenceQuery.parse(input instanceof URLSearchParams ? strictEvidenceQuery(input) : input);
      await evidenceSession(c, owner, sessionId);
      const { rows } = await c.query("SELECT * FROM evidence_events WHERE owner_id=$1 AND session_id=$2 AND sequence>$3 ORDER BY sequence,created_at,id LIMIT $4", [owner, sessionId, q.cursor ?? 0, q.limit + 1]);
      const coverage = (await c.query("SELECT kind FROM evidence_events WHERE owner_id=$1 AND session_id=$2 AND kind='session.created'", [owner, sessionId])).rowCount;
      const any = (await c.query("SELECT 1 FROM evidence_events WHERE owner_id=$1 AND session_id=$2 LIMIT 1", [owner, sessionId])).rowCount;
      return evidencePageSchema.parse({ items: rows.slice(0, q.limit).map(eventDto), nextCursor: rows.length > q.limit ? String(rows[q.limit - 1].sequence) : null, history: coverage ? "native" : any ? "partial" : "unrecorded" });
    });
  }
  certificate(raw: string | undefined, assetId: string) {
    return this.workspace.run(raw, async (c, owner) => {
      idSchema.parse(assetId);
      const { rows: [a] } = await c.query("SELECT a.* FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE a.id=$1 AND s.owner_id=$2", [assetId, owner]);
      if (!a) throw new AppError("NOT_FOUND");
      const s = await evidenceSession(c, owner, a.session_id);
      const { rows: [j] } = await c.query("SELECT * FROM jobs WHERE id=$1 AND owner_id=$2 AND kind='generation' AND input->>'sessionId'=$3", [a.generation_job_id, owner, a.session_id]);
      if (!j) throw new AppError("STATE_CONFLICT");
      const { rows: events } = await c.query("SELECT * FROM evidence_events WHERE owner_id=$1 AND session_id=$2 AND (asset_id=$3 OR job_id=$4 OR kind='session.created') ORDER BY sequence,created_at,id", [owner, s.id, a.id, j.id]);
      const requested = events.find(e => e.job_id === j.id && e.kind === "generate.requested");
      const success = events.find(e => e.job_id === j.id && e.kind === "generate.succeeded");
      const native = !!requested && !!success;
      const complete = native; // Every selection since this asset's native birth is recorded.
      const recorded = events.filter(e => e.asset_id === a.id && ["asset.adopted", "asset.unadopted"].includes(e.kind)).length;
      const guide = async (id: string | undefined) => {
        if (!id) return null;
        const { rows: [g] } = await c.query("SELECT g.id,g.version,g.file->>'checksum' checksum FROM brand_guides g JOIN projects p ON p.id=g.project_id WHERE g.id=$1 AND p.owner_id=$2 AND p.id=$3", [id, owner, s.project_id]);
        return g ? guideProvenanceSchema.parse(g) : null;
      };
      const v = verificationSchema.safeParse(a.verification);
      const verifyEvent = events.findLast(e => e.asset_id === a.id && e.kind === "verify.run" && e.job_id === a.verification_job_id);
      const current = s.active_guide_id ? await guide(s.active_guide_id) : null;
      const vGuide = v.success ? verifyEvent?.payload.guide ?? await guide(v.data.guideId) : null;
      const final = events.findLast(e => e.asset_id === a.id && ["final.added", "final.removed"].includes(e.kind));
      const count = (await c.query("SELECT count(*)::int n FROM assets WHERE generation_job_id=$1 AND session_id=$2", [j.id, s.id])).rows[0].n;
      return certificateSchema.parse({ assetId: a.id, sessionId: s.id, projectId: s.project_id, createdAt: a.created_at.toISOString(), deletedAt: a.deleted_at?.toISOString() ?? null, archived: !!(s.archived_at || s.project_archived_at), checksum: a.file.checksum,
        generation: { jobId: j.id, origin: native ? "native" : "legacy-derived", status: j.status, prompt: typeof j.input.prompt === "string" ? j.input.prompt : null, outputLocale: j.input.outputLocale ?? null, candidateCount: native ? success.payload.resultCount : j.status === "succeeded" ? count : null, guide: requested ? requested.payload.guide : await guide(j.input.guideId) },
        selection: { history: complete ? "complete" : recorded ? "partial" : "unrecorded", userSelectionCount: complete ? recorded : null, recordedSelectionCount: recorded, adopted: a.adopted },
        verification: v.success ? { origin: verifyEvent ? "native" : "legacy-derived", data: v.data, stale: verificationStale(v.data, current, verifyEvent?.payload.guide.checksum), guide: vGuide } : null,
        finalization: { finalizedAt: a.finalized_at?.toISOString() ?? null, guideId: a.finalized_guide_id, origin: final ? "native" : a.finalized_at ? "legacy-derived" : "unrecorded" },
      });
    });
  }
}
