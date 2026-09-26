import "server-only";
import { z } from "zod";
import { assertOrigin, rawSession } from "../auth/http";
import { AppError, jsonResponse, withApi } from "../errors/http";
import { readJson } from "../errors/validation";
import { jobService } from "./runtime";
export const jobsApi = withApi(async (request, context) => {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean), id = parts[2];
  if (!id) throw new AppError("NOT_FOUND");
  const service = jobService();
  if (request.method === "GET" && parts.length === 3) return jsonResponse(await service.get(await rawSession(), id), context);
  if (request.method === "POST" && parts[3] === "cancel" && parts.length === 4) {
    assertOrigin(request); await readJson(request, z.strictObject({}));
    return jsonResponse(await service.cancel(await rawSession(), id), context);
  }
  throw new AppError("NOT_FOUND");
});

// Future business POST handlers call this after their authenticated enqueue transaction.
// An idempotent replay can already be terminal, so preserve its actual status.
export function acceptedJobResponse(job: import("../../contracts/jobs").JobDto, context: import("../errors/http").RequestContext) {
  return jsonResponse({ jobId: job.id, status: job.status, statusUrl: `/api/jobs/${job.id}` }, context, 202);
}
