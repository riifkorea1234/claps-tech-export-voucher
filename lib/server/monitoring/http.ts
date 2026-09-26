import "server-only";
import { z } from "zod";
import { assertOrigin, rawSession } from "../auth/http";
import { withApi, jsonResponse, AppError } from "../errors/http";
import { readJson } from "../errors/validation";
import { workspaceService } from "../projects/service";
import { jobService } from "../jobs/runtime";
import { acceptedJobResponse } from "../jobs/http";
import { StorageService } from "../storage/service";
import { MonitoringService } from "./service";
export const monitoringApi = withApi(async (request, context) => {
  const url = new URL(request.url), [, , , id, child] = url.pathname.split("/"), raw = await rawSession(), workspace = workspaceService(), s = new MonitoringService(workspace, jobService());
  if (request.method !== "GET") assertOrigin(request);
  if (id === "uploads" && request.method === "POST") return jsonResponse(await new StorageService(workspace).reserveMonitoring(raw, await readJson(request, z.unknown())), context, 201);
  if (child === "image" && request.method === "GET") { const f = await s.image(raw, id); return new Response(new Uint8Array(f.bytes), { headers: { "Content-Type": f.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Request-ID": context.requestId } }); }
  if (child === "scans") {
    if (request.method === "GET") return jsonResponse(await s.history(raw, id, Object.fromEntries(url.searchParams)), context);
    if (request.method === "POST") return acceptedJobResponse(await s.request(raw, id, await readJson(request, z.unknown())), context);
  }
  if (!child) {
    if (request.method === "GET") return jsonResponse(id ? await s.get(raw, id) : await s.list(raw, Object.fromEntries(url.searchParams)), context);
    if (!id && request.method === "POST") return jsonResponse(await s.create(raw, await readJson(request, z.unknown())), context, 201);
    if (id && ["PATCH", "DELETE"].includes(request.method)) { const body = await readJson(request, z.unknown()); return jsonResponse(await s.patch(raw, id, request.method === "DELETE" ? { ...z.strictObject({ version: z.number().int().positive() }).parse(body), archived: true } : body), context); }
  }
  throw new AppError("NOT_FOUND");
});
