import "server-only";
import { z } from "zod";
import { assertOrigin, rawSession } from "../auth/http";
import { jsonResponse, withApi, AppError } from "../errors/http";
import { readJson } from "../errors/validation";
import { workspaceService } from "./service";
import { StorageService, readUpload } from "../storage/service";
export const workspaceApi = withApi(async (request, context) => {
  const url = new URL(request.url), path = url.pathname.split("/").filter(Boolean).slice(1);
  const [kind, id, child] = path;
  const raw = await rawSession(), s = workspaceService();
  const method = request.method;
  if (method !== "GET") assertOrigin(request);
  if (kind === "files" && id && method === "GET") {
    const file = await new StorageService(s).download(raw, id, url.searchParams.get("download") === "1");
    return new Response(new Uint8Array(file.bytes), { headers: { "Content-Type": file.mime, "Content-Length": String(file.bytes.length), "Content-Disposition": `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Request-ID": context.requestId } });
  }
  let data: unknown;
  if (kind === "uploads") {
    const storage = new StorageService(s);
    if (method === "POST" && !id) data = await storage.reserve(raw, await readJson(request, z.unknown()));
    else if (method === "PUT" && id) {
      await s.run(raw, async () => true);
      data = await storage.upload(raw, id, await readUpload(request), request.headers.get("content-type") ?? "");
    } else throw new AppError("NOT_FOUND");
  } else if (method === "GET") {
    const query = Object.fromEntries(url.searchParams);
    if (kind === "projects") data = !id ? await s.listProjects(raw, query) : id === "stats" ? await s.stats(raw) : child === "library" ? await s.listAssets(raw, id, true) : child === "sessions" ? await s.listSessions(raw, { ...query, projectId: id }) : await s.getProject(raw, id);
    else if (kind === "asset-sessions") data = !id ? await s.listSessions(raw, query) : child === "assets" ? await s.listAssets(raw, id) : await s.getSession(raw, id);
    else if (kind === "assets" && id) data = await s.getAsset(raw, id);
    else throw new AppError("NOT_FOUND");
  } else {
    const input = await readJson(request, z.unknown());
    if (method === "POST" && !id) data = kind === "projects" ? await s.createProject(raw, input) : kind === "asset-sessions" ? await s.createSession(raw, input) : (() => { throw new AppError("NOT_FOUND"); })();
    else if ((method === "PATCH" || method === "DELETE") && id) {
      const body = method === "DELETE" ? { ...z.strictObject({ version: z.number().int().positive() }).parse(input), ...(kind === "assets" ? { deleted: true } : { archived: true }) } : input;
      data = kind === "projects" ? await s.patchProject(raw, id, body) : kind === "asset-sessions" ? await s.patchSession(raw, id, body) : kind === "assets" ? await s.patchAsset(raw, id, body) : (() => { throw new AppError("NOT_FOUND"); })();
    } else throw new AppError("NOT_FOUND");
  }
  return jsonResponse(data, context, method === "POST" ? 201 : 200);
});
