import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import type { PoolClient } from "pg";
import { authService, type AuthService } from "../auth/service";
import { fileSchema, guideRulesSchema } from "../../contracts/metadata";
import { AppError } from "../errors/http";
import { storagePath, storageRoot } from "../storage/config";
import { readStoredFile } from "../storage/read-file";
import { verificationHandler } from "../verifications/handler";
import { monitoringHandler } from "../monitoring/handler";
import { JobFailure, type JobHandler, type JobContext, type HandlerRegistry } from "../jobs/types";

export const SAMPLE_PROVIDER = "claps-evidence-sample-NO-AI-NO-WEB-SEARCH";
export const evidenceEmail = (email: string) => /^evidence\.v1\.(?:0[1-9]|10)@example\.com$/.test(email);
export async function authorizeEvidence(c: PoolClient, owner: string) {
  const u = (await c.query("SELECT email FROM users WHERE id=$1", [owner])).rows[0];
  if (process.env.EVIDENCE_SAMPLE_MODE !== "claps-evidence-v1" || !u || !evidenceEmail(u.email)) throw new AppError("SERVICE_UNAVAILABLE");
}
export const sampleRules = () => guideRulesSchema.parse({ schemaVersion: 1, rules: [
  { ruleId: "sample-palette", title: "SAMPLE: palette", description: "Evidence fixture: use navy, mint and warm yellow.", condition: { field: "palette", operator: "contains", value: "navy" }, evidence: { page: 1, excerpt: "SAMPLE RULE: navy / mint / yellow" } },
  { ruleId: "sample-label", title: "SAMPLE: disclosure", description: "Evidence fixture must carry a SAMPLE label.", condition: { field: "label", operator: "contains", value: "SAMPLE" }, evidence: { page: 1, excerpt: "SAMPLE RULE: disclose synthetic artwork" } },
] });
export async function sampleImage(index: number, title = "CLAPS EVIDENCE SAMPLE") {
  const colors = ["#a8e4d1", "#ffe4a3", "#cfc8ef"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768"><rect width="768" height="768" fill="${colors[index % 3]}"/><circle cx="384" cy="350" r="210" fill="#fff9eb"/><path d="M250 250 Q210 100 330 190 M450 190 Q570 100 520 250" stroke="#183745" stroke-width="24" fill="#fff9eb"/><ellipse cx="315" cy="325" rx="18" ry="25" fill="#183745"/><ellipse cx="455" cy="325" rx="18" ry="25" fill="#183745"/><path d="M355 385 Q385 415 415 385" fill="none" stroke="#183745" stroke-width="12"/><rect x="126" y="590" width="516" height="94" rx="24" fill="#183745"/><text x="384" y="631" font-size="24" font-family="sans-serif" text-anchor="middle" fill="white">${title.replace(/[^A-Za-z0-9 :_-]/g, "")}</text><text x="384" y="664" font-size="18" font-family="sans-serif" text-anchor="middle" fill="#a8e4d1">SYNTHETIC - NO AI MODEL - ${index + 1}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
export function registerEvidenceHandlers(registry: HandlerRegistry, injected?: AuthService) {
  const auth = () => injected ?? authService();
  function guarded(factory: () => JobHandler): JobHandler {
    return {
      authorize: authorizeEvidence,
      async run(ctx) { await auth().transaction(c => authorizeEvidence(c, ctx.job.owner_id)); return factory().run(ctx); },
      async apply(c, job, result) { await authorizeEvidence(c, job.owner_id); await factory().apply?.(c, job, result); },
    };
  }
  registry.register("generation", guarded(() => ({
    async run(ctx) {
      if (ctx.job.input.kind !== "generation") throw new JobFailure("INVALID_RESULT");
      // Explicit evidence-only failure scenario before dispatch; retry child succeeds.
      if (ctx.job.input.prompt.includes("[sample-fail]") && !ctx.job.retry_of_id) throw new JobFailure("TRANSIENT");
      await ctx.dispatch(SAMPLE_PROVIDER);
      // Enough time to exercise genuine running/cancellation states.
      await new Promise<void>((resolve, reject) => { const t = setTimeout(resolve, 1200); ctx.signal.addEventListener("abort", () => { clearTimeout(t); reject(new JobFailure("CANCELED")); }, { once: true }); });
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const id = randomUUID(), bytes = await sampleImage(i), thumbnail = await sharp(bytes).resize(320, 320).webp().toBuffer();
        const file = fileSchema.parse({ schemaVersion: 1, storageKey: `${id}-original`, thumbnailKey: `${id}-thumbnail`, originalName: `SAMPLE-${i + 1}.png`, mimeType: "image/png", size: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex"), width: 768, height: 768 });
        await ctx.reserveFile(file); await mkdir(storageRoot(), { recursive: true, mode: 0o700 });
        await writeFile(storagePath(file.storageKey), bytes, { flag: "wx", mode: 0o600, signal: ctx.signal });
        await writeFile(storagePath(file.thumbnailKey!), thumbnail, { flag: "wx", mode: 0o600, signal: ctx.signal }); ids.push(id);
      }
      return { output: { schemaVersion: 1, kind: "generation", assetIds: ids }, usage: { schemaVersion: 1, units: 0, unit: "synthetic-no-ai" } };
    },
    async apply(c, job, result) {
      if (job.input.kind !== "generation" || result.output.kind !== "generation") throw new JobFailure("INVALID_RESULT");
      for (const id of result.output.assetIds) {
        const row = (await c.query("SELECT metadata FROM storage_tickets WHERE target_type='job' AND target_id=$1 AND metadata->>'storageKey'=$2", [job.id, `${id}-original`])).rows[0];
        if (!row) throw new JobFailure("INVALID_RESULT");
        await c.query("INSERT INTO assets(id,session_id,generation_job_id,file) VALUES($1,$2,$3,$4)", [id, job.input.sessionId, job.id, fileSchema.parse(row.metadata)]);
      }
    },
  })));
  registry.register("guide_extraction", guarded(() => ({
    async run(ctx) {
      if (ctx.job.input.kind !== "guide_extraction") throw new JobFailure("INVALID_RESULT");
      const g = (await auth().pool.query("SELECT file FROM brand_guides WHERE id=$1", [ctx.job.input.guideId])).rows[0];
      const bytes = await readStoredFile(fileSchema.parse(g.file), 10 * 1024 * 1024);
      if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new JobFailure("INVALID_RESULT");
      await ctx.dispatch(SAMPLE_PROVIDER);
      return { output: { schemaVersion: 1, kind: "guide_extraction", guideId: ctx.job.input.guideId }, usage: { schemaVersion: 1, units: 0, unit: "synthetic-no-ai" } };
    },
    async apply(c, job) { if (job.input.kind !== "guide_extraction") throw new JobFailure("INVALID_RESULT"); await c.query("UPDATE brand_guides SET rules=$2,status='draft',source_revision=source_revision+1 WHERE id=$1 AND status IN ('uploaded','extracting','draft')", [job.input.guideId, sampleRules()]); },
  })));
  registry.register("verification", guarded(() => verificationHandler(auth(), {
    name: SAMPLE_PROVIDER,
    verify: async input => ({ engineVersion: "evidence-sample-v1-NO-AI", results: input.assets.map((a, i) => ({ assetId: a.id, rules: input.rules.rules.map(rule => ({ ruleId: rule.ruleId, verdict: (["pass", "warn", "reject"] as const)[i % 3], reason: "SYNTHETIC evidence scenario; no model assessment.", evidence: "Explicit sample provider; deterministic pass / review / reject fixtures." })) })) }),
  })));
  registry.register("monitoring", guarded(() => monitoringHandler(auth(), {
    name: SAMPLE_PROVIDER,
    search: async bytes => {
      // Uploaded sample originals select known scenarios. Never fetch these illustrative URLs.
      const marker = bytes.subarray(-32).toString();
      if (marker.includes("SAMPLE_ERROR")) throw new JobFailure("TRANSIENT");
      const empty = marker.includes("SAMPLE_EMPTY"), partial = marker.includes("SAMPLE_PARTIAL");
      return { state: partial ? "partial" : empty ? "empty" : "results", sources: [{ name: "SAMPLE corpus (no web search)", status: "succeeded" }, ...(partial ? [{ name: "SAMPLE unavailable source", status: "failed" as const }] : [])], items: empty ? [] : [94, 84, 64].map((similarity, i) => ({ url: `https://claps.arcreation.work/?evidence-sample=${i + 1}`, source: "SAMPLE corpus (no web search)", similarity, discoveredAt: new Date().toISOString(), factors: { provider: SAMPLE_PROVIDER, engineVersion: "evidence-sample-v1", meaning: "similarity_percent", character: similarity, color: similarity - 5, composition: similarity - 10, logo: null } })) };
    },
  })));
  return registry;
}
