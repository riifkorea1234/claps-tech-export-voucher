import "server-only";
import { uploadPartnerImage } from "./images";
import { readUpload } from "../storage/service";
import { z } from "zod";
import { assertOrigin, rawSession } from "../auth/http";
import { AppError, jsonResponse, withApi } from "../errors/http";
import { readJson } from "../errors/validation";
import { adminServices } from "./runtime";
export const adminApi = withApi(async (request, context) => {
    const url = new URL(request.url), path = url.pathname.split("/").filter(Boolean).slice(2);
    const [kind, id, locale, action] = path, raw = await rawSession();
    const { access, admin, content } = adminServices(context.requestId);
    if (request.method !== "GET")
        assertOrigin(request);
    let data: unknown;
    if (kind === "reauthenticate" && path.length === 1 && request.method === "POST")
        data = await access.verify(raw, await readJson(request, z.unknown()));
    else {
        await access.run(raw, async () => true);
        if (kind === "partners" && path.length === 3 && path[2] === "images" && request.method === "POST") {
            data = await uploadPartnerImage(access, raw, id, Object.fromEntries(url.searchParams), request.headers.get("content-type") ?? "", await readUpload(request));
        }
        else if (request.method === "GET") {
            if (kind === "monitoring-records" && path.length === 3 && locale === "scans")
                data = await admin.monitoringHistory(raw, id, Object.fromEntries(url.searchParams));
            else if (kind === "overview" && path.length === 1)
                data = await admin.overview(raw);
            else if (kind === "locales" && path.length === 1)
                data = await admin.locales(raw);
            else if (kind === "localized-contents" && path.length === 4)
                data = await content.get(raw, id, locale, action);
            else if (kind === "localized-contents" && path.length === 5 && path[4] === "export") {
                const row = await content.get(raw, id, locale, action);
                data = { schemaVersion: 1, entries: [{ resourceType: row.resourceType, resourceKey: row.resourceKey, locale: row.locale, sourceRevision: row.sourceRevision, version: row.version, content: row.draft }] };
            }
            else if (path.length === 1)
                data = await admin.list(raw, kind, Object.fromEntries(url.searchParams));
            else if (path.length === 2)
                data = await admin.detail(raw, kind, id);
            else
                throw new AppError("NOT_FOUND");
        }
        else {
            const body = await readJson(request, z.unknown());
            if (kind === "localized-contents" && path.length === 2 && request.method === "POST") {
                if (id === "import-preview" || id === "import")
                    data = await content.import(raw, body, id === "import-preview");
                else if (id === "publish")
                    data = await content.publish(raw, body);
                else
                    throw new AppError("NOT_FOUND");
            }
            else if (kind === "partners" && (request.method === "POST" && path.length === 1 || request.method === "PATCH" && path.length === 2))
                data = await admin.partner(raw, id, body);
            else if (kind === "locales" && (request.method === "POST" && path.length === 1 || request.method === "PATCH" && path.length === 2))
                data = await admin.locale(raw, id, body);
            else if (path.length === 2 && request.method === "PATCH" && kind === "users")
                data = await admin.user(raw, id, body);
            else if (path.length === 2 && request.method === "PATCH" && kind === "projects")
                data = await admin.project(raw, id, body);
            else if (path.length === 2 && request.method === "POST" && kind === "monitoring-records")
                data = await admin.monitoring(raw, id, body);
            else if (path.length === 2 && request.method === "POST" && kind === "jobs")
                data = await admin.job(raw, id, body);
            else
                throw new AppError("NOT_FOUND");
        }
    }
    return jsonResponse(data, context);
});
