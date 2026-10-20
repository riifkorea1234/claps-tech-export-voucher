import "server-only";
import { rawSession } from "../auth/http";
import { withApi, jsonResponse, AppError } from "../errors/http";
import { workspaceService } from "../projects/service";
import { EvidenceService } from "./service";
const handler = withApi(async (request, context) => {
  const url = new URL(request.url), [, resource, id, child] = url.pathname.split("/").filter(Boolean);
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: request.method === "OPTIONS" ? 204 : 405, headers: { Allow: "GET, HEAD, OPTIONS", "Cache-Control": "private, no-store", "X-Request-ID": context.requestId } });
  const s = new EvidenceService(workspaceService()), raw = await rawSession();
  const data = resource === "asset-sessions" && child === "evidence" ? await s.list(raw, id, url.searchParams) : resource === "assets" && child === "certificate" ? await s.certificate(raw, id) : (() => { throw new AppError("NOT_FOUND"); })();
  return jsonResponse(data, context);
});

export async function evidenceApi(request: Request) { const response = await handler(request); return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response; }
