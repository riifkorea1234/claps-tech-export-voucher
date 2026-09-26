import "server-only";
import { z } from "zod";
import type { AuthService } from "../auth/service";
import { ruleResultSchema, fileSchema, verificationSchema } from "../../contracts/metadata";
import { aggregateVerdict, type RuleResult } from "../../contracts/verification";
import { JobFailure, type JobHandler } from "../jobs/types";
import { checkVerificationSnapshot } from "./guards";
import { lockJobParents } from "../jobs/parents";
import { readStoredFile } from "../storage/read-file";
import { MAX_UPLOAD_BYTES } from "../storage/config";
export type VerificationProvider = {
  name: string;
  verify: (input: { assets: { id: string; bytes: Buffer; mimeType: string }[]; rules: import("zod").infer<typeof import("../../contracts/metadata").guideRulesSchema>; outputLocale: string; signal: AbortSignal }) => Promise<{
    engineVersion: string; results: { assetId: string; rules: RuleResult[] }[];
  }>;
};
// A provider is explicitly injected. Production does not register a mock or a fallback verdict.
export function verificationHandler(auth: AuthService, provider: VerificationProvider): JobHandler {
  return {
    async run(context) {
      const input = context.job.input;
      if (input.kind !== "verification" || !input.snapshot) throw new JobFailure("INVALID_RESULT");
      const snapshot = input.snapshot;
      const rows = await auth.transaction(async c => {
        await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [context.job.owner_id]);
        await lockJobParents(c, context.job.owner_id, input);
        return checkVerificationSnapshot(c, context.job.owner_id, input, context.job.project_id);
      });
      const assets = [];
      for (const row of rows) {
        context.signal.throwIfAborted();
        const file = fileSchema.parse(row.file);
        assets.push({ id: row.id as string, bytes: await readStoredFile(file, MAX_UPLOAD_BYTES), mimeType: file.mimeType });
      }
      await context.dispatch(provider.name);
      const response = await provider.verify({ assets, rules: snapshot.rules, outputLocale: input.outputLocale, signal: context.signal });
      const parsed = z.strictObject({ engineVersion: z.string().min(1).max(100), results: z.array(z.strictObject({ assetId: z.string(), rules: z.array(ruleResultSchema).max(200) })).max(10) }).parse(response);
      if (parsed.results.length !== input.assetIds.length || new Set(parsed.results.map(r => r.assetId)).size !== input.assetIds.length) throw new JobFailure("INVALID_RESULT");
      const ruleIds = snapshot.rules.rules.map(r => r.ruleId);
      const results = parsed.results.map(r => {
        if (!input.assetIds.includes(r.assetId) || r.rules.length !== ruleIds.length || new Set(r.rules.map(x => x.ruleId)).size !== ruleIds.length || r.rules.some(x => !ruleIds.includes(x.ruleId) || !x.evidence)) throw new JobFailure("INVALID_RESULT");
        return { assetId: r.assetId, verification: verificationSchema.parse({ schemaVersion: 1, verdict: aggregateVerdict(r.rules), ruleResults: r.rules, guideId: input.guideId, guideVersion: snapshot.guideVersion, jobId: context.job.id, engineVersion: parsed.engineVersion, checkedAt: new Date().toISOString() }) };
      });
      return { output: { schemaVersion: 1, kind: "verification", assetIds: input.assetIds, results } };
    },
    async apply(c, job, result) {
      if (job.input.kind !== "verification" || result.output.kind !== "verification" || !result.output.results) throw new JobFailure("INVALID_RESULT");
      await checkVerificationSnapshot(c, job.owner_id, job.input, job.project_id);
      for (const r of result.output.results) await c.query("UPDATE assets SET verification_job_id=$2,verification=$3,version=version+1,updated_at=now() WHERE id=$1", [r.assetId, job.id, r.verification]);
    },
  };
}
