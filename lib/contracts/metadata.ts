import { monitoringResultSchema } from "./monitoring-result";
import { z } from "zod";
import { matchingSnapshotSchema, matchingOutputSchema } from "./matching-data";
import { idSchema, localeCodeSchema, MAX_METADATA_BYTES } from "./common";

const schemaVersion = z.literal(1);
const shortText = z.string().max(500);
const description = z.string().max(10_000);
const ids = z.array(idSchema).max(100);
const storageKey = z.string().min(1).max(255).regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/)
  .refine((key) => !key.split("/").some((part) => part === "." || part === ".."));
export const fileSchema = z.strictObject({
  schemaVersion, storageKey, originalName: z.string().min(1).max(255),
  mimeType: z.string().max(100).regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/),
  size: z.number().int().nonnegative().safe(), checksum: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().positive().max(100_000).optional(),
  height: z.number().int().positive().max(100_000).optional(), thumbnailKey: storageKey.optional(),
});
export const preferencesSchema = z.strictObject({
  schemaVersion, locale: localeCodeSchema.optional(), matching: z.strictObject({
    revision: z.number().int().positive().optional(), ipName: shortText.optional(), category: shortText.optional(), licensee: shortText.optional(), revenue: shortText.optional(), references: z.array(z.strictObject({ id: idSchema, file: fileSchema })).max(3).optional(),
    industries: z.array(shortText).max(50).optional(), styles: z.array(shortText).max(50).optional(),
    worldView: description.optional(), collaborationHistory: description.optional(),
  }).optional(),
});
export const coverSchema = z.discriminatedUnion("kind", [
  z.strictObject({ schemaVersion, kind: z.literal("default") }),
  z.strictObject({ schemaVersion, kind: z.literal("upload"), file: fileSchema }),
  z.strictObject({ schemaVersion, kind: z.literal("asset"), assetId: idSchema }),
]);
export const partnerProfileSchema = z.strictObject({
  schemaVersion, description, tags: z.array(shortText).max(50),
  ipNames: z.array(shortText).max(50), marketDescription: description.optional(), imageAlt: shortText.optional(), images: z.array(fileSchema).max(20),
});
export const guideRulesSchema = z.strictObject({ schemaVersion, rules: z.array(z.strictObject({
  ruleId: idSchema, title: shortText, description,
  condition: z.strictObject({ field: shortText, operator: z.enum(["equals", "contains", "excludes", "min", "max"]), value: z.union([shortText, z.number().finite(), z.boolean()]) }),
  evidence: z.strictObject({ page: z.number().int().positive().max(100_000), excerpt: shortText }),
})).max(200) });
export const verdict = z.enum(["pass", "warn", "reject", "unknown", "fail", "review"]);
export const ruleResultSchema = z.strictObject({ ruleId: idSchema, verdict, reason: shortText.min(1), evidence: shortText.min(1).optional() });
export const assetVersionSchema = z.strictObject({ id: idSchema, version: z.number().int().positive() });
export const verificationSchema = z.strictObject({
  schemaVersion, verdict, ruleResults: z.array(ruleResultSchema).max(200),
  guideId: idSchema, guideVersion: z.number().int().positive().optional(), jobId: idSchema, engineVersion: z.string().min(1).max(100), checkedAt: z.iso.datetime(),
});
export const jobKinds = ["generation", "guide_extraction", "verification", "matching", "monitoring", "export"] as const;
const inputBase = { schemaVersion, outputLocale: localeCodeSchema };
export const jobInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...inputBase, kind: z.literal("generation"), sessionId: idSchema, prompt: description, guideId: idSchema.optional() }),
  z.strictObject({ ...inputBase, kind: z.literal("guide_extraction"), guideId: idSchema }),
  z.strictObject({ ...inputBase, kind: z.literal("verification"), assetIds: ids, guideId: idSchema, snapshot: z.strictObject({ sessionId: idSchema, guideVersion: z.number().int().positive(), rules: guideRulesSchema, assets: z.array(assetVersionSchema).min(1).max(10) }).optional() }),
  z.strictObject({ ...inputBase, kind: z.literal("matching"), preferences: preferencesSchema, snapshot: matchingSnapshotSchema.optional() }),
  z.strictObject({ ...inputBase, kind: z.literal("monitoring"), recordId: idSchema }),
  z.strictObject({ ...inputBase, kind: z.literal("export"), assetIds: ids, assets: z.array(assetVersionSchema).min(1).max(50).optional() }),
]);
// Output contracts are deliberately small references. Provider payloads and limits are defined in their owning Phase.
export const jobOutputSchema = z.discriminatedUnion("kind", [
  z.strictObject({ schemaVersion, kind: z.literal("generation"), assetIds: ids }),
  z.strictObject({ schemaVersion, kind: z.literal("guide_extraction"), guideId: idSchema }),
  z.strictObject({ schemaVersion, kind: z.literal("verification"), assetIds: ids, results: z.array(z.strictObject({ assetId: idSchema, verification: verificationSchema })).max(10).optional() }),
  z.strictObject({ schemaVersion, kind: z.literal("matching"), partnerIds: ids, evaluation: matchingOutputSchema.optional() }),
  z.strictObject({ schemaVersion, kind: z.literal("monitoring"), recordId: idSchema, resultFile: fileSchema.optional(), result: monitoringResultSchema.optional() }),
  z.strictObject({ schemaVersion, kind: z.literal("export"), file: fileSchema, expiresAt: z.iso.datetime().optional() }),
]);
const translatedRule = z.strictObject({ ruleId: idSchema, title: shortText, description });
export const localizedContentSchema = z.discriminatedUnion("resourceType", [
  z.strictObject({ schemaVersion, resourceType: z.literal("partner"), name: shortText, description, ipNames: z.array(shortText).max(50).optional(), marketDescription: description.optional(), imageAlt: shortText.optional() }),
  z.strictObject({ schemaVersion, resourceType: z.literal("guide"), rules: z.array(translatedRule).max(200) }),
]);
export const auditChangesSchema = z.strictObject({ schemaVersion, fields: z.array(z.strictObject({
  field: z.enum(["name", "visibility", "status", "appRole", "enabled", "fallbackCode", "published", "archivedAt", "draftVersion", "publishedVersion", "locale", "sessionsRevoked", "ipName", "descriptionChanged", "sourceRevision", "contactEmail", "tags", "ipNames", "description", "retryId", "nativeName", "displayName", "direction", "sortOrder", "imageCount"]),
  before: z.union([shortText, z.boolean(), z.null()]), after: z.union([shortText, z.boolean(), z.null()]),
})).max(30) });
export const usageSchema = z.strictObject({ schemaVersion, units: z.number().finite().nonnegative(), unit: z.string().max(50) });

export function parseMetadata<T>(schema: z.ZodType<T>, input: unknown): T {
  let serialized: string | undefined;
  try { serialized = JSON.stringify(input); } catch { throw new Error("INVALID_METADATA"); }
  if (!serialized || new TextEncoder().encode(serialized).byteLength > MAX_METADATA_BYTES) throw new Error("METADATA_TOO_LARGE");
  return schema.parse(input);
}
