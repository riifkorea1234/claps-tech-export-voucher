import "server-only";
import type { PoolClient } from "pg";
import type { z } from "zod";
import type { fileSchema, usageSchema } from "../../contracts/metadata";
import type { JobDto, JobInput, JobOutput, JobKind, JobFailureCode, JobStatus } from "../../contracts/jobs";
export type JobRow = {
  id: string; owner_id: string; project_id: string | null; kind: JobKind; status: JobStatus;
  input: JobInput; output: JobOutput | null; request_hash: string; idempotency_key: string;
  attempt: number; retry_of_id: string | null; retry_job_id?: string | null;
  lease_token: string | null; lease_until: Date | null; deadline_at: Date | null;
  dispatched_at: Date | null; provider_request_id: string | null; provider: string | null;
  cost_state: JobDto["costState"]; error_code: JobFailureCode | null;
  cancel_requested_at: Date | null; created_at: Date; started_at: Date | null; finished_at: Date | null;
};
export type JobUsage = z.infer<typeof usageSchema>;
export type JobFile = z.infer<typeof fileSchema>;
export type JobContext = {
  job: JobRow; signal: AbortSignal;
  // MUST commit this before any external request. A lost response is then never blindly retried.
  dispatch: (provider: string, requestId?: string) => Promise<void>;
  providerRequest: (requestId: string) => Promise<void>;
  // Reserve planned file metadata BEFORE IO, even if the handler later times out or crashes.
  reserveFile: (file: JobFile) => Promise<void>;
};
export type JobResult = { output: JobOutput; usage?: JobUsage };
export type JobHandler = {
  run: (context: JobContext) => Promise<JobResult>;
  // Only database writes; invoked inside the guarded completion transaction. No external IO here.
  apply?: (client: PoolClient, job: JobRow, result: JobResult) => Promise<void>;
};
export class JobFailure extends Error {
  constructor(readonly code: JobFailureCode, readonly retryable = false) { super(code); }
}
export class HandlerRegistry {
  private handlers = new Map<JobKind, JobHandler>();
  register(kind: JobKind, handler: JobHandler) { if (this.handlers.has(kind)) throw new Error("DUPLICATE_HANDLER"); this.handlers.set(kind, handler); return this; }
  get(kind: JobKind) { return this.handlers.get(kind); }
  kinds() { return [...this.handlers.keys()]; }
}
