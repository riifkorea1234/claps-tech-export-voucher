import { z } from "zod";
import { idSchema, localeCodeSchema, versionSchema } from "./common";
import { verificationSchema, ruleResultSchema } from "./metadata";
export const verificationRequest = z.strictObject({
  assetIds: z.array(idSchema).min(1).max(10).refine(a => new Set(a).size === a.length),
  guideId: idSchema, outputLocale: localeCodeSchema,
  idempotencyKey: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
});
export const finalizationRequest = z.strictObject({ version: versionSchema });
export type Verification = z.infer<typeof verificationSchema>;
export type RuleResult = z.infer<typeof ruleResultSchema>;
export type VerificationView = { verification: Verification | null; currentGuideId: string | null; stale: boolean; canFinalize: boolean };
export function aggregateVerdict(rules: RuleResult[]): Verification["verdict"] {
  if (!rules.length || rules.some(r => r.verdict === "unknown")) return "unknown";
  if (rules.some(r => r.verdict === "reject" || r.verdict === "fail")) return "reject";
  if (rules.some(r => r.verdict !== "pass")) return "warn";
  return "pass";
}
