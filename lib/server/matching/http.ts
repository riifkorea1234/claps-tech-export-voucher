import "server-only";
import { z } from "zod";
import { assertOrigin, rawSession } from "../auth/http";
import { withApi, jsonResponse, AppError } from "../errors/http";
import { readJson } from "../errors/validation";
import { workspaceService } from "../projects/service";
import { jobService } from "../jobs/runtime";
import { acceptedJobResponse } from "../jobs/http";
import { MatchingService } from "./service";
import { StorageService } from "../storage/service";
export const matchingApi = withApi(async (request, context) => {
  const url = new URL(request.url), raw = await rawSession(), workspace = workspaceService();
  if (request.method !== "GET") assertOrigin(request);
  const s = new MatchingService(workspace, jobService());
  if (url.pathname === "/api/me/matching-criteria") {
    if (request.method === "GET") return jsonResponse(await s.get(raw), context);
    if (request.method === "PUT") return jsonResponse(await s.save(raw, await readJson(request, z.unknown())), context);
  }
  if (url.pathname === "/api/me/matching-images" && request.method === "POST") return jsonResponse(await new StorageService(workspace).reserveMatching(raw, await readJson(request, z.unknown())), context, 201);
  if (url.pathname.startsWith("/api/me/matching-images/") && request.method === "GET") {
    const file = await new StorageService(workspace).matchingImage(raw, url.pathname.split("/").at(-1)!);
    return new Response(new Uint8Array(file.bytes), { headers: { "Content-Type": file.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Request-ID": context.requestId } });
  }
  if (url.pathname === "/api/matches" && request.method === "POST") return acceptedJobResponse(await s.request(raw, await readJson(request, z.unknown())), context);
  if (url.pathname === "/api/matches/latest" && request.method === "GET") return jsonResponse(await s.latest(raw, request.headers.get("x-claps-locale") ?? "ko"), context);
  throw new AppError("NOT_FOUND");
});
