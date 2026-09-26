import { z } from "zod";
import { idSchema, localeCodeSchema } from "./common";
export const MAX_EXPORT_FILES = 50;
export const MAX_EXPORT_BYTES = 100 * 1024 * 1024;
export const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;
export const exportRequest = z.strictObject({
  assetIds: z.array(idSchema).min(1).max(MAX_EXPORT_FILES).refine(a => new Set(a).size === a.length),
  outputLocale: localeCodeSchema,
  idempotencyKey: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
});
