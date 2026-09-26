import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { fileSchema, usageSchema, parseMetadata } from "../../contracts/metadata";
import { parseJobInput, parseJobOutput, type JobFailureCode } from "../../contracts/jobs";
import { AppError } from "../errors/http";
import { lockJobParents } from "./parents";
import { JobService } from "./service";
import { JobFailure, type JobRow, type JobHandler, type JobResult, type JobFile } from "./types";
const label = z.string().min(1).max(200).regex(/^[A-Za-z0-9_.:/-]+$/);
export class JobQueue {
  constructor(readonly service: JobService) {}
  async claim(workerId: string): Promise<JobRow | null> {
    label.parse(workerId);
    const { auth, registry, policy } = this.service;
    if (!registry.kinds().length) return null;
    return auth.transaction(async c => {
      // Lock owner first, as web does. SKIP LOCKED allows independent workers/users to progress.
      const { rows: [owner] } = await c.query(`SELECT u.id,u.status FROM users u WHERE EXISTS(
        SELECT 1 FROM jobs j WHERE j.owner_id=u.id AND j.status='queued' AND j.next_run_at<=now() AND j.kind=ANY($1))
        AND (SELECT count(*) FROM jobs r WHERE r.owner_id=u.id AND r.status='running')<$2
        ORDER BY (SELECT min(next_run_at) FROM jobs q WHERE q.owner_id=u.id AND q.status='queued'),u.id
        LIMIT 1 FOR UPDATE OF u SKIP LOCKED`, [registry.kinds(), policy.runningPerUser]);
      if (!owner) return null;
      // Re-read after the owner lock: the candidate SELECT snapshot may predate another commit.
      const running = await c.query("SELECT count(*)::int n FROM jobs WHERE owner_id=$1 AND status='running'", [owner.id]);
      if (running.rows[0].n >= policy.runningPerUser) return null;
      const { rows: [row] } = await c.query<JobRow>("SELECT * FROM jobs WHERE owner_id=$1 AND status='queued' AND next_run_at<=now() AND kind=ANY($2) ORDER BY next_run_at,id LIMIT 1 FOR UPDATE SKIP LOCKED", [owner.id, registry.kinds()]);
      if (!row) return null;
      try {
        if (owner.status !== "active") throw new AppError("STATE_CONFLICT");
        const parent = await lockJobParents(c, owner.id, parseJobInput(row.input));
        if (parent !== row.project_id) throw new AppError("STATE_CONFLICT");
      } catch (error) {
        if (!(error instanceof AppError || error instanceof z.ZodError)) throw error;
        await this.end(c, row, "failed", "PARENT_INACTIVE"); return null;
      }
      const { rows: [claimed] } = await c.query<JobRow>(`UPDATE jobs SET status='running',locked_by=$2,lease_token=$3,
        started_at=now(),heartbeat_at=now(),lease_until=now()+$4*interval '1 millisecond',deadline_at=now()+$5*interval '1 millisecond',updated_at=now()
        WHERE id=$1 RETURNING *`, [row.id, workerId, randomUUID(), policy.leaseMs, policy.kinds[row.kind].timeoutMs]);
      return claimed;
    });
  }
  private async locked(c: PoolClient, job: JobRow) {
    const { rows: [u] } = await c.query("SELECT status FROM users WHERE id=$1 FOR UPDATE", [job.owner_id]);
    const { rows: [row] } = await c.query<JobRow>("SELECT * FROM jobs WHERE id=$1 AND lease_token=$2 FOR UPDATE", [job.id, job.lease_token]);
    return { row, active: u?.status === "active" };
  }
  private async end(c: PoolClient, row: JobRow, status: "failed" | "canceled", code: JobFailureCode) {
    const { rows: [ended] } = await c.query<JobRow>(`UPDATE jobs SET status=$2,error_code=$3,error_summary=NULL,
      finished_at=now(),lease_until=NULL,locked_by=NULL,updated_at=now(),cost_state=CASE WHEN dispatched_at IS NOT NULL THEN cost_state ELSE 'none' END
      WHERE id=$1 AND status IN ('queued','running') RETURNING *`, [row.id, status, code]);
    return ended;
  }
  private alive(row: JobRow | undefined) {
    return !!row && row.status === "running" && !!row.lease_until && row.lease_until.getTime() > Date.now() && !!row.deadline_at && row.deadline_at.getTime() > Date.now();
  }
  async heartbeat(job: JobRow): Promise<boolean> {
    const { rowCount } = await this.service.auth.pool.query(`UPDATE jobs SET heartbeat_at=now(),lease_until=LEAST(deadline_at,now()+$3*interval '1 millisecond'),updated_at=now()
      WHERE id=$1 AND lease_token=$2 AND status='running' AND lease_until>now() AND deadline_at>now() AND cancel_requested_at IS NULL
      AND EXISTS(SELECT 1 FROM users WHERE id=jobs.owner_id AND status='active')`, [job.id, job.lease_token, this.service.policy.leaseMs]);
    return !!rowCount;
  }
  async dispatch(job: JobRow, provider: string, requestId?: string) {
    label.parse(provider); if (requestId) label.parse(requestId);
    await this.service.auth.transaction(async c => {
      const { row, active } = await this.locked(c, job);
      if (!this.alive(row) || !active || row.cancel_requested_at || row.dispatched_at) throw new JobFailure("CANCELED");
      await lockJobParents(c, row.owner_id, row.input);
      await c.query("UPDATE jobs SET provider=$2,provider_request_id=$3,dispatched_at=now(),cost_state='unknown',updated_at=now() WHERE id=$1", [row.id, provider, requestId ?? null]);
    });
  }
  async providerRequest(job: JobRow, requestId: string) {
    label.parse(requestId);
    // Correlation is useful even after timeout/cancel. It cannot change terminal state or attach results.
    await this.service.auth.pool.query("UPDATE jobs SET provider_request_id=$3,updated_at=now() WHERE id=$1 AND lease_token=$2 AND dispatched_at IS NOT NULL AND (provider_request_id IS NULL OR provider_request_id=$3)", [job.id, job.lease_token, requestId]);
  }
  async reserveFile(job: JobRow, input: JobFile) {
    const file = parseMetadata(fileSchema, input);
    await this.service.auth.transaction(async c => {
      const { row, active } = await this.locked(c, job);
      if (!active || !this.alive(row) || row.cancel_requested_at) throw new JobFailure("CANCELED");
      // A reservation must outlive worker failure. Do not turn this ledger into a physical deletion instruction.
      await c.query(`INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,state,metadata,expires_at)
        VALUES($1,$2,'cleanup','job',$3,'cleanup_pending',$4,now())`, [randomUUID(), row.owner_id, row.id, file]);
    });
  }
  async complete(job: JobRow, handler: JobHandler, result: JobResult, canCommit: () => boolean = () => true) {
    const output = parseJobOutput(job.kind, result.output), usage = result.usage ? parseMetadata(usageSchema, result.usage) : null;
    return this.service.auth.transaction(async c => {
      const { row, active } = await this.locked(c, job);
      if (!row) return false;
      // Cost evidence is preserved even if cancellation/lease expiry already blocked business writes.
      if (usage) await c.query("UPDATE jobs SET usage=$2,cost_state='confirmed',updated_at=now() WHERE id=$1", [row.id, usage]);
      if (row.status !== "running") return false;
      if (!canCommit()) {
        const code = row.cancel_requested_at ? "CANCELED" : row.dispatched_at ? "PROVIDER_UNKNOWN" : "WORKER_LOST";
        const ended = await this.end(c, row, code === "CANCELED" ? "canceled" : "failed", code);
        if (ended && active && !row.cancel_requested_at && !row.dispatched_at) await this.autoRetry(c, ended);
        return false;
      }
      if (!this.alive(row) || row.cancel_requested_at) {
        await this.end(c, row, row.cancel_requested_at ? "canceled" : "failed", row.cancel_requested_at ? "CANCELED" : row.dispatched_at ? "PROVIDER_UNKNOWN" : "TIMEOUT"); return false;
      }
      try {
        if (!active) throw new AppError("STATE_CONFLICT");
        if (await lockJobParents(c, row.owner_id, row.input) !== row.project_id) throw new AppError("STATE_CONFLICT");
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
        await this.end(c, row, "failed", "PARENT_INACTIVE"); return false;
      }
      await handler.apply?.(c, row, { output, ...(usage ? { usage } : {}) });
      if (!canCommit()) throw new JobFailure("WORKER_LOST", true);
      const committed = await c.query(`UPDATE jobs SET status='succeeded',output=$2,usage=$3,cost_state=$4,finished_at=now(),lease_until=NULL,locked_by=NULL,updated_at=now()
        WHERE id=$1 AND lease_until>clock_timestamp() AND deadline_at>clock_timestamp()`, [row.id, output, usage, usage ? "confirmed" : row.dispatched_at ? "unknown" : "none"]);
      if (!committed.rowCount) throw new JobFailure("TIMEOUT", true);
      return true;
    });
  }
  async fail(job: JobRow, error: unknown) {
    return this.service.auth.transaction(async c => {
      const { row, active } = await this.locked(c, job);
      if (!row || row.status !== "running") return;
      const failure = error instanceof JobFailure ? error : new JobFailure("INTERNAL");
      const code = row.cancel_requested_at ? "CANCELED" : !active ? "PARENT_INACTIVE" : row.dispatched_at ? "PROVIDER_UNKNOWN" : failure.code;
      const ended = await this.end(c, row, code === "CANCELED" ? "canceled" : "failed", code);
      if (ended && failure.retryable && !row.dispatched_at && active && !row.cancel_requested_at) await this.autoRetry(c, ended);
    });
  }
  private async autoRetry(c: PoolClient, row: JobRow) {
    try { await this.service.retryLocked(c, row); }
    catch (error) { if (!(error instanceof AppError)) throw error; }
  }
  async recoverExpired(limit = 100) {
    const expired = await this.service.auth.pool.query<JobRow>("SELECT * FROM jobs WHERE status='running' AND (lease_until<=now() OR deadline_at<=now()) ORDER BY lease_until,id LIMIT $1", [limit]);
    let recovered = 0;
    for (const job of expired.rows) {
      await this.service.auth.transaction(async c => {
        const { row, active } = await this.locked(c, job);
        if (!row || row.status !== "running" || this.alive(row)) return;
        const code = row.cancel_requested_at ? "CANCELED" : !active ? "PARENT_INACTIVE" : row.dispatched_at ? "PROVIDER_UNKNOWN" : "WORKER_LOST";
        const ended = await this.end(c, row, code === "CANCELED" ? "canceled" : "failed", code);
        if (ended && active && !row.cancel_requested_at && !row.dispatched_at) await this.autoRetry(c, ended);
        recovered++;
      });
    }
    return recovered;
  }
}
