import "server-only";
import type { AuthService } from "../auth/service";
import { WorkspaceService } from "../projects/service";
import { fileSchema, parseMetadata } from "../../contracts/metadata";
import { monitoringResultSchema, type MonitoringResult } from "../../contracts/monitoring-result";
import { readStoredFile } from "../storage/read-file";
import { MAX_UPLOAD_BYTES } from "../storage/config";
import { lockJobParents } from "../jobs/parents";
import { JobFailure, type JobContext, type JobHandler } from "../jobs/types";
// Explicit injection only; never registered in production without a real provider decision.
export type MonitoringProvider = { name: string; search: (bytes: Buffer, signal: AbortSignal) => Promise<MonitoringResult> };
export function monitoringHandler(auth: AuthService, provider: MonitoringProvider): JobHandler {
  return {
    async run(context: JobContext) {
      const input = context.job.input;
      if (input.kind !== "monitoring") throw new JobFailure("INVALID_RESULT");
      const file = await auth.transaction(async c => {
        const u = (await c.query("SELECT status FROM users WHERE id=$1 FOR UPDATE", [context.job.owner_id])).rows[0];
        if (u?.status !== "active") throw new JobFailure("PARENT_INACTIVE");
        await lockJobParents(c, context.job.owner_id, input);
        const r = (await c.query("SELECT * FROM monitoring_records WHERE id=$1", [input.recordId])).rows[0];
        return fileSchema.parse(r.source_asset_id ? (await new WorkspaceService(auth).assetRow(c, r.owner_id, r.source_asset_id)).file : r.source_file);
      });
      const bytes = await readStoredFile(file, MAX_UPLOAD_BYTES);
      await context.dispatch(provider.name);
      const result = parseMetadata(monitoringResultSchema, await provider.search(bytes, context.signal));
      return { output: { schemaVersion: 1, kind: "monitoring", recordId: input.recordId, result } };
    },
    async apply(c, job, result) {
      if (job.input.kind !== "monitoring" || result.output.kind !== "monitoring" || result.output.recordId !== job.input.recordId || !result.output.result) throw new JobFailure("INVALID_RESULT");
      const output = parseMetadata(monitoringResultSchema, result.output.result);
      // Latest successful request wins; a late older completion cannot move the summary backward.
      await c.query(`UPDATE monitoring_records r SET first_scanned_at=COALESCE(first_scanned_at,now()),last_scanned_at=now(),latest_job_id=$2,latest_result_count=$3,updated_at=now()
        WHERE r.id=$1 AND r.archived_at IS NULL AND (r.latest_job_id IS NULL OR EXISTS(SELECT 1 FROM jobs old WHERE old.id=r.latest_job_id AND (old.created_at,old.id)<($4::timestamptz,$2::text)))`, [job.input.recordId, job.id, output.items.length, job.created_at]);
    },
  };
}
