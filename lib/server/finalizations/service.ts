import "server-only";
import { isDeepStrictEqual } from "node:util";
import type { PoolClient, QueryResultRow } from "pg";
import { finalizationRequest, aggregateVerdict, type VerificationView } from "../../contracts/verification";
import { verificationSchema, guideRulesSchema } from "../../contracts/metadata";
import { AppError } from "../errors/http";
import { WorkspaceService } from "../projects/service";
import type { JobRow } from "../jobs/types";
import { requestHash } from "../jobs/service";
export class FinalizationService {
  constructor(readonly workspace: WorkspaceService) {}
  async view(c: PoolClient, owner: string, row: QueryResultRow): Promise<VerificationView> {
    const s = await this.workspace.sessionRow(c, owner, row.session_id);
    const p = s.project_id ? await this.workspace.projectRow(c, owner, s.project_id) : null;
    const parsed = verificationSchema.safeParse(row.verification), verification = parsed.success ? parsed.data : null;
    const currentGuideId = p?.active_guide_id ?? null;
    let canFinalize = false;
    if (verification && row.adopted && !row.finalized_at && verification.guideId === currentGuideId && row.verification_job_id === verification.jobId && verification.verdict === "pass" && aggregateVerdict(verification.ruleResults) === "pass") {
      const { rows: [job] } = await c.query<JobRow>("SELECT * FROM jobs WHERE id=$1 AND owner_id=$2 AND status='succeeded' AND kind='verification'", [verification.jobId, owner]);
      const { rows: [g] } = await c.query("SELECT * FROM brand_guides WHERE id=$1 AND project_id=$2 AND status='published'", [currentGuideId, p.id]);
      const rules = guideRulesSchema.safeParse(g?.rules);
      const input = job?.input;
      const output = job?.output;
      const snapshot = input?.kind === "verification" ? input.snapshot : undefined;
      const stored = output?.kind === "verification" ? output.results?.find(r => r.assetId === row.id)?.verification : null;
      const busy = await c.query("SELECT 1 FROM jobs WHERE owner_id=$1 AND kind='verification' AND status IN ('queued','running') AND input->'assetIds' ? $2 LIMIT 1", [owner, row.id]);
      const matchingAsset = snapshot && snapshot.sessionId === row.session_id && snapshot.assets.some(a => a.id === row.id && a.version + 1 === row.version);
      const matchingGuide = g && g.version === verification.guideVersion && snapshot?.guideVersion === g.version;
      const matchingRules = rules.success && input?.kind === "verification" && snapshot &&
        requestHash({ ...input, snapshot: { ...snapshot, rules: rules.data } }) === requestHash(input) &&
        verification.ruleResults.length === rules.data.rules.length &&
        new Set(verification.ruleResults.map(r => r.ruleId)).size === rules.data.rules.length &&
        rules.data.rules.every(r => verification.ruleResults.some(v => v.ruleId === r.ruleId && !!v.evidence));
      canFinalize = !!(job && job.project_id === p.id && input?.kind === "verification" &&
        input.assetIds.includes(row.id) && input.guideId === currentGuideId && matchingAsset && matchingGuide &&
        matchingRules && stored && isDeepStrictEqual(stored, verification) && !busy.rowCount);
    }
    return { verification, currentGuideId, stale: !!verification && verification.guideId !== currentGuideId, canFinalize };
  }
  get(raw: string | undefined, id: string) { return this.workspace.run(raw, async (c, owner) => this.view(c, owner, await this.workspace.assetRow(c, owner, id))); }
  async set(raw: string | undefined, id: string, data: unknown, finalized: boolean) {
    const d = finalizationRequest.parse(data);
    return this.workspace.run(raw, async (c, owner) => {
      const a = await this.workspace.assetRow(c, owner, id);
      this.workspace.checkVersion(a, d.version);
      if (!!a.finalized_at === finalized) return this.workspace.assetDto(c, owner, a);
      let guide: string | null = null;
      if (finalized) {
        const view = await this.view(c, owner, a);
        if (!view.canFinalize) throw new AppError("STATE_CONFLICT");
        guide = view.verification!.guideId;
      }
      const { rows: [updated] } = await c.query("UPDATE assets SET finalized_at=$2,finalized_guide_id=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *", [id, finalized ? new Date() : null, guide]);
      // Past verification remains in jobs and assets. Cancellation only changes the final marker.
      if (!finalized) await c.query(`UPDATE projects SET cover='{"schemaVersion":1,"kind":"default"}',version=version+1,updated_at=now() WHERE owner_id=$1 AND cover->>'assetId'=$2`, [owner, id]);
      return this.workspace.assetDto(c, owner, updated);
    });
  }
}
