import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { idSchema } from "../../contracts/common";
import { feedbackReportSchema, feedbackWithdrawSchema, resultIndexSchema, type FeedbackState } from "../../contracts/monitoring-feedback";
import { monitoringResultSchema } from "../../contracts/monitoring-result";
import { digest } from "../auth/service";
import { AppError } from "../errors/http";
import type { MonitoringService } from "./service";
export function feedbackDto(row: QueryResultRow): FeedbackState {
  return { resultId: row.result_id, reported: row.action === "reported", reason: row.reason, sequence: row.sequence, eventId: row.id, createdAt: row.created_at.toISOString() };
}
export class MonitoringFeedbackService {
  constructor(readonly monitoring: MonitoringService) {}
  write(raw: string | undefined, recordId: string, jobId: string, resultId: string, action: "reported" | "withdrawn", data: unknown) {
    // Authenticate before validating body to keep the existing authorization contract.
    return this.monitoring.workspace.run(raw, async (c, owner) => this.writeLocked(c, owner, recordId, jobId, resultId, action, data));
  }
  async writeLocked(c: PoolClient, owner: string, recordId: string, jobId: string, resultIndex: string, action: "reported" | "withdrawn", data: unknown) {
    const d = action === "reported" ? feedbackReportSchema.parse(data) : feedbackWithdrawSchema.parse(data);
    idSchema.parse(jobId); const index = resultIndexSchema.parse(resultIndex);
    await this.monitoring.row(c, owner, recordId);
    // Record/job locks, under the authenticated owner lock, serialize every result writer.
    const { rows: [job] } = await c.query("SELECT * FROM jobs WHERE id=$1 AND owner_id=$2 AND kind='monitoring' AND input->>'recordId'=$3 FOR UPDATE", [jobId, owner, recordId]);
    if (!job || job.status !== "succeeded" || job.output?.kind !== "monitoring" || job.output.recordId !== recordId || !job.output.result) throw new AppError("NOT_FOUND");
    const output = monitoringResultSchema.parse(job.output.result);
    if (index >= output.items.length) throw new AppError("NOT_FOUND");
    const resultId = `${jobId}:${index}`, reason = "reason" in d ? d.reason : null;
    const hash = digest(JSON.stringify({ schemaVersion: 1, recordId, jobId, resultId, action, reason }));
    const { rows: [previous] } = await c.query("SELECT * FROM monitoring_feedback_events WHERE owner_id=$1 AND action=$2 AND idempotency_key=$3", [owner, action, d.idempotencyKey]);
    if (previous) { if (previous.request_hash !== hash) throw new AppError("IDEMPOTENCY_CONFLICT"); return feedbackDto(previous); }
    const { rows: [event] } = await c.query(`INSERT INTO monitoring_feedback_events(id,owner_id,actor_id,record_id,job_id,result_index,result_id,action,reason,idempotency_key,request_hash,sequence)
      SELECT $1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE(max(sequence),0)+1 FROM monitoring_feedback_events WHERE job_id=$4 AND result_index=$5 RETURNING *`, [randomUUID(), owner, recordId, jobId, index, resultId, action, reason, d.idempotencyKey, hash]);
    return feedbackDto(event);
  }
}
