import "server-only";
import { z } from "zod";
import { jobKinds } from "../../contracts/metadata";
import type { JobKind } from "../../contracts/jobs";
const kindPolicy = z.strictObject({ timeoutMs: z.number().int().min(50).max(3_600_000), maxRetries: z.number().int().min(0).max(5), retryDelayMs: z.number().int().min(0).max(3_600_000) });
export const queuePolicySchema = z.strictObject({
  runningPerUser: z.number().int().min(1).max(20), queuedPerUser: z.number().int().min(1).max(100), requestsPerHour: z.number().int().min(1).max(10000),
  leaseMs: z.number().int().min(100).max(300_000), kinds: z.record(z.enum(jobKinds), kindPolicy),
});
export type QueuePolicy = z.infer<typeof queuePolicySchema>;
export type KindPolicy = QueuePolicy["kinds"][JobKind];
// Approved development limits. Real provider budgets/SLAs must be reviewed in their owning Phase.
export const developmentQueuePolicy: QueuePolicy = queuePolicySchema.parse({
  runningPerUser: 2, queuedPerUser: 10, requestsPerHour: 60, leaseMs: 30_000,
  kinds: Object.fromEntries(jobKinds.map(kind => [kind, { timeoutMs: kind === "matching" ? 30_000 : 300_000, maxRetries: 2, retryDelayMs: 5_000 }])),
});
