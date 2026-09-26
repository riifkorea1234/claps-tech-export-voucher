import { z } from "zod";
import { idSchema } from "./common";
import { jobKinds, jobInputSchema, jobOutputSchema, parseMetadata } from "./metadata";
export const jobStatuses = ["queued", "running", "succeeded", "failed", "canceled"] as const;
export type JobStatus = typeof jobStatuses[number];
export type JobKind = typeof jobKinds[number];
export type JobInput = z.infer<typeof jobInputSchema>;
export type JobOutput = z.infer<typeof jobOutputSchema>;
export const terminal = (status: JobStatus) => ["succeeded", "failed", "canceled"].includes(status);
export function assertJobTransition(from: JobStatus, to: JobStatus) {
  if (!(from === "queued" && ["running", "canceled", "failed"].includes(to)) && !(from === "running" && terminal(to))) throw new Error("ILLEGAL_JOB_TRANSITION");
}
export const jobFailureCodes = ["UNAVAILABLE", "INVALID_RESULT", "TRANSIENT", "TIMEOUT", "WORKER_LOST", "PROVIDER_UNKNOWN", "PARENT_INACTIVE", "CANCELED", "INTERNAL"] as const;
export type JobFailureCode = typeof jobFailureCodes[number];
export const jobDtoSchema = z.strictObject({
  id: idSchema, kind: z.enum(jobKinds), status: z.enum(jobStatuses), attempt: z.number().int().nonnegative(),
  retryOfId: idSchema.nullable(), retryJobId: idSchema.nullable(), cancelRequested: z.boolean(),
  errorCode: z.enum(jobFailureCodes).nullable(), canRetry: z.boolean(),
  costState: z.enum(["not_started", "unknown", "confirmed", "none"]),
  createdAt: z.iso.datetime(), startedAt: z.iso.datetime().nullable(), finishedAt: z.iso.datetime().nullable(),
});
export type JobDto = z.infer<typeof jobDtoSchema>;
export const enqueueSchema = z.strictObject({ input: jobInputSchema, idempotencyKey: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) });
export const acceptedJobSchema = z.strictObject({ jobId: idSchema, status: z.enum(jobStatuses), statusUrl: z.string() });
export function parseJobInput(input: unknown) { return parseMetadata(jobInputSchema, input); }
export function parseJobOutput(kind: JobKind, output: unknown) {
  const result = parseMetadata(jobOutputSchema, output);
  if (result.kind !== kind) throw new Error("JOB_KIND_MISMATCH");
  return result;
}
