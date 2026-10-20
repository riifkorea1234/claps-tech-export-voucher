import { z } from "zod";
import { rawSession, assertOrigin } from "@/lib/server/auth/http";
import { withApi, jsonResponse, AppError } from "@/lib/server/errors/http";
import { jobService } from "@/lib/server/jobs/runtime";
import { WorkspaceService } from "@/lib/server/projects/service";
import { EvidenceSampleService } from "@/lib/server/evidence-sample/service";
import { readJson } from "@/lib/server/errors/validation";
import { idSchema } from "@/lib/contracts/common";
export const GET = withApi(async (request, context) => {
  const jobs = jobService(), service = new EvidenceSampleService(new WorkspaceService(jobs.auth), jobs), raw = await rawSession(), project = new URL(request.url).searchParams.get("project");
  return jsonResponse(project ? await service.list(raw, project) : await service.enabled(raw), context);
});
export const POST = withApi(async (request, context) => {
  assertOrigin(request);
  const jobs = jobService(), service = new EvidenceSampleService(new WorkspaceService(jobs.auth), jobs), raw = await rawSession();
  if (!(await service.enabled(raw)).enabled) throw new AppError("SERVICE_UNAVAILABLE");
  if (request.headers.get("content-type")?.startsWith("application/pdf")) {
    const project = idSchema.parse(new URL(request.url).searchParams.get("project"));
    // Read the stream with a bound, rather than trusting Content-Length.
    const { readUpload } = await import("@/lib/server/storage/service");
    return jsonResponse(await service.upload(raw, project, "SAMPLE-brand-guide.pdf", await readUpload(request)), context);
  }
  const d = await readJson(request, z.discriminatedUnion("action", [
    z.strictObject({ action: z.literal("publish"), guideId: idSchema }),
    z.strictObject({ action: z.literal("extract"), guideId: idSchema, outputLocale: z.enum(["en", "ja"]), idempotencyKey: idSchema }),
    z.strictObject({ action: z.literal("generate"), sessionId: idSchema, prompt: z.string().min(1).max(10000), guideId: idSchema.optional(), outputLocale: z.enum(["en", "ja"]), idempotencyKey: idSchema }),
    z.strictObject({ action: z.literal("retry"), jobId: idSchema }),
  ]));
  if (d.action === "publish") return jsonResponse(await service.publish(raw, d.guideId), context);
  if (d.action === "retry") return jsonResponse(await jobs.retry(raw, d.jobId), context);
  const { action, ...rest } = d;
  if (action !== "extract" && action !== "generate") throw new AppError("VALIDATION_ERROR");
  const { idempotencyKey, ...input } = rest;
  return jsonResponse(await jobs.enqueue(raw, { input: { schemaVersion: 1, kind: action === "extract" ? "guide_extraction" : "generation", ...input }, idempotencyKey }), context, 202);
});
