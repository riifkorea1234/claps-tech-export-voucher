import { z } from "zod";
import { idSchema } from "./common";
const text = z.string().trim().max(500);
const chips = z.array(z.string().trim().min(1).max(80)).max(20).refine(v => new Set(v.map(x => x.toLocaleLowerCase())).size === v.length);
export const matchingCriteriaSchema = z.strictObject({
  ipName: text.default(""), category: text.default(""), licensee: text.default(""), revenue: text.default(""),
  industries: chips.default([]), styles: chips.default([]), worldView: text.default(""), collaborationHistory: text.default(""),
});
export const factorCodes = ["ip", "world", "brand", "industry"] as const;
export const matchingCandidateSchema = z.strictObject({ id: idSchema, version: z.number().int().positive(), name: z.string().max(500), description: z.string().max(10000), tags: z.array(z.string().max(500)).max(50), ipNames: z.array(z.string().max(500)).max(50), marketDescription: z.string().max(10000) });
export const matchingSnapshotSchema = z.strictObject({ revision: z.number().int().positive(), engineVersion: z.literal("rules-v1"), criteria: matchingCriteriaSchema, candidates: z.array(matchingCandidateSchema).max(200) });
export const matchingResultSchema = z.strictObject({ partnerId: idSchema, partnerVersion: z.number().int().positive(), score: z.number().int().min(0).max(100), factors: z.array(z.strictObject({ code: z.enum(factorCodes), score: z.number().int().min(0).max(100).nullable(), matched: z.array(z.string()), total: z.number().int().nonnegative() })).length(4) });
export const matchingOutputSchema = z.strictObject({ engineVersion: z.literal("rules-v1"), results: z.array(matchingResultSchema).max(20) });
