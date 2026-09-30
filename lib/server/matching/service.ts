import "server-only";
import { z } from "zod";
import { preferencesSchema, fileSchema, parseMetadata } from "../../contracts/metadata";
import { criteriaDtoSchema, saveCriteriaSchema, matchRequestSchema, latestMatchesSchema, matchingCriteriaSchema } from "../../contracts/matching";
import { parseJobInput } from "../../contracts/jobs";
import { WorkspaceService } from "../projects/service";
import { JobService, jobDto } from "../jobs/service";
import type { JobRow } from "../jobs/types";
import { AppError } from "../errors/http";
import { publicPartner } from "../partners/service";
import { scoreMatches } from "./engine";
import { reserveCleanup } from "../storage/service";
import type { PoolClient } from "pg";
async function current(c: PoolClient, owner: string) {
  const { rows: [u] } = await c.query("SELECT preferences FROM users WHERE id=$1", [owner]);
  return preferencesSchema.parse(u.preferences);
}
function dto(p: z.infer<typeof preferencesSchema>) {
  const { revision = 0, references = [], ...criteria } = p.matching ?? {};
  return criteriaDtoSchema.parse({ revision, criteria: matchingCriteriaSchema.parse(criteria), references: references.map(r => ({ id: r.id, name: r.file.originalName, url: `/api/me/matching-images/${r.id}` })) });
}
export class MatchingService {
  constructor(readonly workspace: WorkspaceService, readonly jobs: JobService) {}
  get(raw: string | undefined) { return this.workspace.run(raw, async (c, owner) => dto(await current(c, owner))); }
  async save(raw: string | undefined, input: unknown) {
    const d = saveCriteriaSchema.parse(input);
    return this.workspace.run(raw, async (c, owner) => {
      const p = await current(c, owner);
      if ((p.matching?.revision ?? 0) !== d.revision) throw new AppError("VERSION_CONFLICT");
      const references = [];
      for (const id of d.referenceIds) {
        const previous = p.matching?.references?.find(r => r.id === id);
        if (previous) { references.push(previous); continue; }
        const { rows: [ticket] } = await c.query("SELECT id,metadata FROM storage_tickets WHERE owner_id=$1 AND target_type='matching' AND target_id=$2 AND kind='upload' AND state='ready' AND expires_at>now() FOR UPDATE", [owner, id]);
        if (!ticket) throw new AppError("NOT_FOUND");
        references.push({ id, file: fileSchema.parse(ticket.metadata) });
        await c.query("UPDATE storage_tickets SET state='claimed',updated_at=now() WHERE id=$1", [ticket.id]);
      }
      for (const old of p.matching?.references ?? []) if (!d.referenceIds.includes(old.id)) await reserveCleanup(c, owner, "matching", old.id, old.file);
      p.matching = { ...d.criteria, references, revision: d.revision + 1 };
      parseMetadata(preferencesSchema, p);
      await c.query("UPDATE users SET preferences=$2,updated_at=now() WHERE id=$1", [owner, p]);
      return dto(p);
    });
  }
  async request(raw: string | undefined, data: unknown) {
    const d = matchRequestSchema.parse(data);
    return this.workspace.run(raw, async (c, owner) => {
      const { rows: [existing] } = await c.query<JobRow>("SELECT * FROM jobs WHERE owner_id=$1 AND kind='matching' AND idempotency_key=$2", [owner, d.idempotencyKey]);
      if (existing) {
        if (existing.input.kind !== "matching" || existing.input.snapshot?.revision !== d.revision || existing.input.outputLocale !== d.outputLocale) throw new AppError("IDEMPOTENCY_CONFLICT");
        return jobDto(existing, this.jobs.policy);
      }
      if (!this.jobs.registry.get("matching")) throw new AppError("SERVICE_UNAVAILABLE");
      const p = await current(c, owner);
      if (p.matching?.revision !== d.revision) throw new AppError("VERSION_CONFLICT");
      const busy = await c.query("SELECT 1 FROM jobs WHERE owner_id=$1 AND kind='matching' AND status IN ('queued','running')", [owner]);
      if (busy.rowCount) throw new AppError("STATE_CONFLICT");
      const rows = (await c.query("SELECT id,name,profile,version FROM partners WHERE visibility='public' AND archived_at IS NULL ORDER BY id LIMIT 201")).rows;
      if (rows.length > 200) throw new AppError("VALIDATION_ERROR");
      const criteria = dto(p).criteria;
      const payload = { schemaVersion: 1, kind: "matching", outputLocale: d.outputLocale, preferences: { schemaVersion: 1, matching: p.matching }, snapshot: { revision: d.revision, engineVersion: "rules-v1", criteria, candidates: rows.map(r => ({ id: r.id, version: r.version, name: r.name, description: r.profile.description, tags: r.profile.tags, ipNames: r.profile.ipNames, marketDescription: r.profile.marketDescription ?? "" })) } };
      let input;
      try { input = parseJobInput(payload); } catch { throw new AppError("VALIDATION_ERROR"); }
      if (input.kind !== "matching") throw new AppError("VALIDATION_ERROR");
      try { scoreMatches(input.snapshot); } catch { throw new AppError("VALIDATION_ERROR"); }
      return jobDto(await this.jobs.insert(c, owner, input, d.idempotencyKey, null), this.jobs.policy);
    });
  }
  latest(raw: string | undefined, locale: string) {
    return this.workspace.run(raw, async (c, owner) => {
      const { rows: [attempt] } = await c.query<JobRow>("SELECT * FROM jobs WHERE owner_id=$1 AND kind='matching' ORDER BY created_at DESC,id DESC LIMIT 1", [owner]);
      const { rows: [success] } = await c.query<JobRow>("SELECT * FROM jobs WHERE owner_id=$1 AND kind='matching' AND status='succeeded' AND output->'evaluation' IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1", [owner]);
      let result = null;
      if (success?.input.kind === "matching" && success.input.snapshot && success.output?.kind === "matching" && success.output.evaluation) {
        const items = [];
        for (const r of success.output.evaluation.results) {
          const { rows: [partner] } = await c.query("SELECT * FROM partners WHERE id=$1 AND visibility='public' AND archived_at IS NULL", [r.partnerId]);
          if (partner) items.push({ ...r, partner: await publicPartner(c, partner, locale) });
        }
        result = { jobId: success.id, outputLocale: success.input.outputLocale, engineVersion: success.output.evaluation.engineVersion, revision: success.input.snapshot.revision, createdAt: success.created_at.toISOString(), items };
      }
      return latestMatchesSchema.parse({ attempt: attempt ? jobDto(attempt, this.jobs.policy) : null, result });
    });
  }
}
