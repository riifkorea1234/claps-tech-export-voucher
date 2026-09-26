import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { idSchema } from "../../contracts/common";
import { enqueueSchema, jobDtoSchema, parseJobInput, type JobDto, type JobInput } from "../../contracts/jobs";
import { AuthService } from "../auth/service";
import { AppError } from "../errors/http";
import { lockJobParents } from "./parents";
import { HandlerRegistry, type JobRow } from "./types";
import { queuePolicySchema, type QueuePolicy } from "./policy";
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const requestHash = (input: JobInput) => createHash("sha256").update(canonical(input)).digest("hex");
export function jobDto(row: JobRow, policy: QueuePolicy): JobDto {
  return jobDtoSchema.parse({
    id: row.id, kind: row.kind, status: row.status, attempt: row.attempt, retryOfId: row.retry_of_id, retryJobId: row.retry_job_id ?? null,
    cancelRequested: !!row.cancel_requested_at, errorCode: row.error_code,
    canRetry: row.status === "failed" && !row.dispatched_at && !row.cancel_requested_at && !row.retry_job_id && row.attempt < policy.kinds[row.kind].maxRetries && ["TRANSIENT", "TIMEOUT", "WORKER_LOST"].includes(row.error_code ?? ""),
    costState: row.cost_state, createdAt: row.created_at.toISOString(), startedAt: row.started_at?.toISOString() ?? null, finishedAt: row.finished_at?.toISOString() ?? null,
  });
}
export class JobService {
  readonly policy: QueuePolicy;
  constructor(readonly auth: AuthService, readonly registry: HandlerRegistry, policy: QueuePolicy) { this.policy = queuePolicySchema.parse(policy); }
  async limits(c: PoolClient, owner: string) {
    const { rows: [counts] } = await c.query(`SELECT count(*) FILTER(WHERE status='queued')::int queued,
      count(*) FILTER(WHERE created_at>now()-interval '1 hour')::int requests FROM jobs WHERE owner_id=$1`, [owner]);
    if (counts.queued >= this.policy.queuedPerUser || counts.requests >= this.policy.requestsPerHour) throw new AppError("RATE_LIMITED");
  }
  async insert(c: PoolClient, owner: string, input: JobInput, key: string, parent: string | null, retry?: JobRow) {
    await this.limits(c, owner);
    const { rows: [row] } = await c.query<JobRow>(`INSERT INTO jobs(id,owner_id,project_id,kind,input,request_hash,idempotency_key,attempt,retry_of_id,next_run_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+$10*interval '1 millisecond') RETURNING *`,
    [randomUUID(), owner, parent, input.kind, input, requestHash(input), key, retry ? retry.attempt + 1 : 0, retry?.id ?? null, retry ? this.policy.kinds[input.kind].retryDelayMs * 2 ** retry.attempt : 0]);
    return row;
  }
  async enqueue(raw: string | undefined, data: unknown) {
    const parsed = enqueueSchema.parse(data), input = parseJobInput(parsed.input);
    return this.auth.authenticated(raw, async (c, u) => {
      if (u.status !== "active") throw new AppError("FORBIDDEN");
      const { rows: [existing] } = await c.query<JobRow>("SELECT j.*, (SELECT id FROM jobs WHERE retry_of_id=j.id) retry_job_id FROM jobs j WHERE owner_id=$1 AND kind=$2 AND idempotency_key=$3", [u.id, input.kind, parsed.idempotencyKey]);
      if (existing) {
        if (existing.request_hash !== requestHash(input)) throw new AppError("IDEMPOTENCY_CONFLICT");
        return jobDto(existing, this.policy);
      }
      if (!this.registry.get(input.kind)) throw new AppError("SERVICE_UNAVAILABLE");
      const parent = await lockJobParents(c, u.id, input);
      return jobDto(await this.insert(c, u.id, input, parsed.idempotencyKey, parent), this.policy);
    });
  }
  async get(raw: string | undefined, id: string) {
    idSchema.parse(id);
    return this.auth.authenticated(raw, async (c, u) => {
      if (u.status !== "active") throw new AppError("FORBIDDEN");
      const { rows: [row] } = await c.query<JobRow>("SELECT j.*, (SELECT id FROM jobs WHERE retry_of_id=j.id) retry_job_id FROM jobs j WHERE j.id=$1 AND owner_id=$2", [id, u.id]);
      if (!row) throw new AppError("NOT_FOUND"); return jobDto(row, this.policy);
    });
  }
  async cancel(raw: string | undefined, id: string) {
    idSchema.parse(id);
    return this.auth.authenticated(raw, async (c, u) => {
      if (u.status !== "active") throw new AppError("FORBIDDEN");
      const { rows: [row] } = await c.query<JobRow>("SELECT * FROM jobs WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, u.id]);
      if (!row) throw new AppError("NOT_FOUND");
      if (row.status === "queued" || row.status === "running") await c.query(`UPDATE jobs SET cancel_requested_at=COALESCE(cancel_requested_at,now()),
        status=CASE WHEN status='queued' THEN 'canceled' ELSE status END,
        finished_at=CASE WHEN status='queued' THEN now() ELSE finished_at END,
        error_code=CASE WHEN status='queued' THEN 'CANCELED' ELSE error_code END,updated_at=now() WHERE id=$1`, [id]);
      const updated = await c.query<JobRow>("SELECT j.*, (SELECT id FROM jobs WHERE retry_of_id=j.id) retry_job_id FROM jobs j WHERE id=$1", [id]);
      return jobDto(updated.rows[0], this.policy);
    });
  }
  async retryLocked(c: PoolClient, row: JobRow) {
    const child = await c.query<JobRow>("SELECT * FROM jobs WHERE retry_of_id=$1", [row.id]);
    if (child.rows[0]) return child.rows[0];
    if (!jobDto(row, this.policy).canRetry) throw new AppError("STATE_CONFLICT");
    if (!this.registry.get(row.kind)) throw new AppError("SERVICE_UNAVAILABLE");
    const parent = await lockJobParents(c, row.owner_id, parseJobInput(row.input));
    return this.insert(c, row.owner_id, row.input, `retry_${row.id}`, parent, row);
  }
  async retry(raw: string | undefined, id: string) {
    idSchema.parse(id);
    return this.auth.authenticated(raw, async (c, u) => {
      if (u.status !== "active") throw new AppError("FORBIDDEN");
      const { rows: [row] } = await c.query<JobRow>("SELECT * FROM jobs WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, u.id]);
      if (!row) throw new AppError("NOT_FOUND");
      return jobDto(await this.retryLocked(c, row), this.policy);
    });
  }
}
