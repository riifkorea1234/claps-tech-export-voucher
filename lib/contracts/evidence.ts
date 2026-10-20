import { z } from "zod";
import { idSchema } from "./common";
import { verificationSchema } from "./metadata";
import { jobFailureCodes } from "./jobs";
export const evidenceKinds = ["session.created", "generate.requested", "generate.succeeded", "generate.failed", "generate.canceled", "asset.adopted", "asset.unadopted", "verify.run", "final.added", "final.removed", "asset.deleted"] as const;
export const guideProvenanceSchema = z.strictObject({ id: idSchema, version: z.number().int().positive(), checksum: z.string().regex(/^[a-f0-9]{64}$/) });
const base = { schemaVersion: z.literal(1), actorType: z.enum(["user", "worker", "admin"]) };
export const evidencePayloadSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...base, kind: z.literal("session.created") }),
  z.strictObject({ ...base, kind: z.literal("generate.requested"), guide: guideProvenanceSchema.nullable() }),
  z.strictObject({ ...base, kind: z.literal("generate.succeeded"), resultCount: z.number().int().nonnegative().max(100) }),
  z.strictObject({ ...base, kind: z.literal("generate.failed"), errorCode: z.enum(jobFailureCodes) }),
  z.strictObject({ ...base, kind: z.literal("generate.canceled"), errorCode: z.literal("CANCELED") }),
  z.strictObject({ ...base, kind: z.literal("asset.adopted"), assetVersion: z.number().int().positive() }),
  z.strictObject({ ...base, kind: z.literal("asset.unadopted"), assetVersion: z.number().int().positive() }),
  z.strictObject({ ...base, kind: z.literal("verify.run"), verification: z.union([verificationSchema, z.strictObject({ jobId: idSchema, verdict: verificationSchema.shape.verdict, engineVersion: z.string().min(1).max(100), checkedAt: z.iso.datetime(), ruleCount: z.number().int().nonnegative().max(200) })]), guide: guideProvenanceSchema }),
  z.strictObject({ ...base, kind: z.literal("final.added"), assetVersion: z.number().int().positive(), verificationJobId: idSchema, guide: guideProvenanceSchema }),
  z.strictObject({ ...base, kind: z.literal("final.removed"), assetVersion: z.number().int().positive() }),
  z.strictObject({ ...base, kind: z.literal("asset.deleted"), assetVersion: z.number().int().positive() }),
]);
export type EvidencePayload = z.infer<typeof evidencePayloadSchema>;
export const evidenceQuery = z.strictObject({ cursor: z.string().regex(/^[1-9][0-9]{0,9}$/).refine(v => Number(v) <= 2147483647).optional(), limit: z.string().regex(/^[1-9][0-9]{0,2}$/).transform(Number).refine(v => v <= 100).optional().transform(v => v ?? 30) });
export const evidenceEventSchema = z.strictObject({ id: idSchema, sessionId: idSchema, assetId: idSchema.nullable(), jobId: idSchema.nullable(), kind: z.enum(evidenceKinds), actorId: idSchema.nullable(), at: z.iso.datetime(), sequence: z.number().int().positive(), origin: z.literal("native"), payload: evidencePayloadSchema });
export const evidencePageSchema = z.strictObject({ items: z.array(evidenceEventSchema), nextCursor: z.string().nullable(), history: z.enum(["native", "partial", "unrecorded"]) });
export const certificateSchema = z.strictObject({
  assetId: idSchema, sessionId: idSchema, projectId: idSchema.nullable(), createdAt: z.iso.datetime(), deletedAt: z.iso.datetime().nullable(), archived: z.boolean(), checksum: z.string().regex(/^[a-f0-9]{64}$/),
  generation: z.strictObject({ jobId: idSchema, origin: z.enum(["native", "legacy-derived"]), status: z.string(), prompt: z.string().nullable(), outputLocale: z.string().nullable(), candidateCount: z.number().int().nonnegative().nullable(), guide: guideProvenanceSchema.nullable() }),
  selection: z.strictObject({ history: z.enum(["complete", "partial", "unrecorded"]), userSelectionCount: z.number().int().nonnegative().nullable(), recordedSelectionCount: z.number().int().nonnegative(), adopted: z.boolean() }),
  verification: z.strictObject({ origin: z.enum(["native", "legacy-derived"]), data: verificationSchema, stale: z.boolean(), guide: guideProvenanceSchema.nullable() }).nullable(),
  finalization: z.strictObject({ finalizedAt: z.iso.datetime().nullable(), guideId: idSchema.nullable(), origin: z.enum(["native", "legacy-derived", "unrecorded"]) }),
});
export type CertificateDto = z.infer<typeof certificateSchema>;
