import "server-only";
import { z } from "zod";
import { rawSession, assertOrigin } from "../auth/http";
import { jsonResponse, withApi } from "../errors/http";
import { readJson } from "../errors/validation";
import { workspaceService } from "../projects/service";
import { ReviewService } from "./service";
import { reviewPatch, reviewIssue } from "../../contracts/review";
const handler = withApi(async (request, context) => {
  const url = new URL(request.url), [, , id, child, snapshots, snapshotId] = url.pathname.split("/").filter(Boolean);
  const allow = child === "review-checks" ? ["GET", "PATCH"] : snapshots === "snapshots" ? ["GET"] : ["GET", "POST"];
  if (!allow.includes(request.method)) return new Response(null, { status: 405, headers: { Allow: allow.join(", "), "Cache-Control": "private, no-store", "X-Request-ID": context.requestId } });
  const ws = workspaceService(), raw = await rawSession(), service = new ReviewService(ws);
  // Authentication precedes query/body validation; write work rechecks the same session under lock.
  await ws.run(raw, async () => {});
  if (request.method !== "GET") assertOrigin(request);
  z.strictObject({}).parse(Object.fromEntries(url.searchParams));
  const data = child === "review-checks" ? request.method === "GET" ? (await service.get(raw, id)).checks : await service.patch(raw, id, await readJson(request, reviewPatch))
    : snapshots === "snapshots" ? await service.snapshot(raw, id, snapshotId)
    : request.method === "GET" ? await service.get(raw, id) : await service.issue(raw, id, await readJson(request, reviewIssue));
  return jsonResponse(data, context, request.method === "POST" ? 201 : 200);
});
export async function reviewApi(request: Request) { const r = await handler(request); return request.method === "HEAD" ? new Response(null, { status: r.status, headers: r.headers }) : r; }
