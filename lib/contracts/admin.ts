import { z } from "zod";
import {
  idSchema,
  localeCodeSchema,
  paginationSchema,
  versionSchema,
} from "./common";
import { localizedContentSchema } from "./metadata";
export const reasonSchema = z.string().trim().min(1).max(500);
export const adminQuery = paginationSchema
  .extend({
    q: z.string().trim().max(200).default(""),
    status: z.string().max(40).optional(),
    kind: z.string().max(40).optional(),
    ownerId: idSchema.optional(),
    projectId: idSchema.optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    archived: z.enum(["active", "archived", "all"]).default("active"),
    entityType: z.string().max(40).optional(),
    entityId: idSchema.optional(),
    actorId: idSchema.optional(),
    action: z.string().max(100).optional(),
    sort: z.enum(["created_at", "name"]).default("created_at"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    path: ["to"],
    message: "Invalid date range",
  });
export const partnerSchema = z.strictObject({
  name: z.string().trim().min(1).max(500),
  description: z.string().max(10000),
  marketDescription: z.string().max(10000).optional(),
  imageAlt: z.string().max(500).optional(),
  contactEmail: z.email().max(320).nullable(),
  visibility: z.enum(["private", "public"]),
  tags: z.array(z.string().trim().min(1).max(100)).max(50),
  ipNames: z.array(z.string().trim().min(1).max(500)).max(50),
  reason: reasonSchema,
});
export const partnerPatchSchema = partnerSchema.extend({
  version: versionSchema,
});
export const localeSchema = z.strictObject({
  code: localeCodeSchema,
  nativeName: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(100),
  direction: z.enum(["ltr", "rtl"]),
  fallbackCode: localeCodeSchema.nullable(),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
  reason: reasonSchema,
});
export const localePatchSchema = localeSchema
  .omit({ code: true })
  .extend({ version: versionSchema });
export const translationSchema = z
  .strictObject({
    resourceType: z.enum(["partner", "guide"]),
    resourceKey: idSchema,
    locale: localeCodeSchema,
    version: z.number().int().nonnegative(),
    sourceRevision: versionSchema,
    content: localizedContentSchema,
  })
  .refine((v) => v.resourceType === v.content.resourceType);
export const importSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    entries: z.array(translationSchema).min(1).max(100),
    reason: reasonSchema,
  })
  .superRefine((v, ctx) => {
    const keys = v.entries.map(
      (e) => `${e.resourceType}/${e.resourceKey}/${e.locale}`,
    );
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: "custom", message: "Duplicate translation" });
  });
