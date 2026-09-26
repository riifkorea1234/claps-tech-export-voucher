import "server-only";
import { verificationRequest } from "../../contracts/verification";
import { parseJobInput, type JobInput } from "../../contracts/jobs";
import { AppError } from "../errors/http";
import { WorkspaceService } from "../projects/service";
import { JobService, jobDto } from "../jobs/service";
import type { JobRow } from "../jobs/types";
import { activeGuide } from "./guards";
export class VerificationService {
  constructor(readonly workspace: WorkspaceService, readonly jobs: JobService) {}
  async request(raw: string | undefined, sessionId: string, data: unknown) {
    const d = verificationRequest.parse(data), assetIds = [...d.assetIds].sort();
    return this.workspace.run(raw, async (c, owner) => {
      const session = await this.workspace.sessionRow(c, owner, sessionId);
      const { rows: [existing] } = await c.query<JobRow>("SELECT * FROM jobs WHERE owner_id=$1 AND kind='verification' AND idempotency_key=$2", [owner, d.idempotencyKey]);
      if (existing) {
        const i = existing.input;
        if (i.kind !== "verification" || i.snapshot?.sessionId !== sessionId || i.guideId !== d.guideId || i.outputLocale !== d.outputLocale || JSON.stringify(i.assetIds) !== JSON.stringify(assetIds)) throw new AppError("IDEMPOTENCY_CONFLICT");
        return jobDto(existing, this.jobs.policy);
      }
      if (!this.jobs.registry.get("verification")) throw new AppError("SERVICE_UNAVAILABLE");
      const guide = await activeGuide(c, owner, d.guideId, session.project_id);
      const assets = [];
      for (const id of assetIds) {
        const a = await this.workspace.assetRow(c, owner, id);
        if (a.session_id !== sessionId || !a.adopted || a.finalized_at) throw new AppError("STATE_CONFLICT");
        assets.push({ id, version: a.version });
      }
      const busy = await c.query("SELECT 1 FROM jobs WHERE owner_id=$1 AND kind='verification' AND status IN ('queued','running') AND input->'assetIds' ?| $2::text[] LIMIT 1", [owner, assetIds]);
      if (busy.rowCount) throw new AppError("STATE_CONFLICT");
      const input: JobInput = parseJobInput({ schemaVersion: 1, kind: "verification", assetIds, guideId: d.guideId, outputLocale: d.outputLocale, snapshot: { sessionId, guideVersion: guide.version, rules: guide.rules, assets } });
      return jobDto(await this.jobs.insert(c, owner, input, d.idempotencyKey, session.project_id), this.jobs.policy);
    });
  }
}
