import { z } from "zod";
import { localeCodeSchema, idSchema, versionSchema } from "./common";
import { jobDtoSchema } from "./jobs";
export const monitoringCreate = z.strictObject({ name: z.string().trim().min(1).max(200), source: z.discriminatedUnion("kind", [z.strictObject({ kind: z.literal("upload"), ticket: z.string().regex(/^[a-f0-9]{64}$/) }), z.strictObject({ kind: z.literal("asset"), assetId: idSchema })]) });
export const monitoringPatch = z.strictObject({ version: versionSchema, name: z.string().trim().min(1).max(200).optional(), archived: z.boolean().optional() });
export const monitoringQuery = z.strictObject({ page: z.coerce.number().int().min(1).max(1000000).default(1), q: z.string().trim().max(200).default(""), archived: z.enum(["true", "false"]).default("false"), sort: z.enum(["recent", "created"]).default("recent") });
export const scanRequest = z.strictObject({ outputLocale: localeCodeSchema, idempotencyKey: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) });
export type MonitoringRecord = { id: string; name: string; version: number; sourceAssetId: string | null; sourceName: string; sourceAvailable: boolean; imageUrl: string | null; createdAt: string; updatedAt: string; archivedAt: string | null; firstScannedAt: string | null; lastScannedAt: string | null; latestResultCount: number; latestJobId: string | null; scanAvailable: boolean };
export type ScanEntry = { job: z.infer<typeof jobDtoSchema>; result: import('./monitoring-result').MonitoringResult | null };
