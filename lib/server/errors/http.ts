import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { errorMessages, errorStatus, type ErrorCode, type ErrorLocale } from "../../contracts/errors";
import type { ApiErrorBody } from "../../contracts/common";
import { deployedLocales, readPack } from "../../i18n/packs";
import { matchLocale } from "../../i18n/core";
import { logRequestFailure } from "./logger";

export class AppError extends Error {
  constructor(public readonly code: ErrorCode) { super(code); this.name = "AppError"; }
}
export type RequestContext = { requestId: string; locale: ErrorLocale; messages?: Record<string, string> };
export function requestContext(request: Request): RequestContext {
  // Client IDs are untrusted and may contain PII. Always issue a new trace ID.
  const requested = request.headers.get("x-claps-locale");
  return { requestId: randomUUID(), locale: matchLocale(requested, ["ko", "en"]) === "en" ? "en" : "ko" };
}
export function jsonResponse<T>(data: T, context: RequestContext, status = 200) {
  return Response.json({ data }, { status, headers: { "Cache-Control": "private, no-store", "X-Request-ID": context.requestId, "Vary": "X-Claps-Locale" } });
}
export function errorResponse(error: unknown, context: RequestContext) {
  const code = error instanceof AppError ? error.code : error instanceof z.ZodError ? "VALIDATION_ERROR" : "INTERNAL_ERROR";
  const body: ApiErrorBody = { error: { code, message: context.messages?.[code] ?? errorMessages[context.locale][code], requestId: context.requestId } };
  if (error instanceof z.ZodError) {
    const fields: Record<string, string[]> = Object.create(null);
    const publicFields = new Set(["email", "password", "name", "title", "description", "version", "rowVersion", "page", "pageSize", "locale", "schemaVersion", "kind", "file", "cover", "preferences", "matching", "outputLocale", "sessionId", "projectId", "assetIds", "guideId", "recordId"]);
    for (const issue of error.issues) {
      // Never reflect user-owned record keys or validation messages into responses.
      const field = issue.path.filter((part) => typeof part === "string" && publicFields.has(part)).join(".") || "_form";
      fields[field] = [context.messages?.INVALID_FIELD ?? errorMessages[context.locale].INVALID_FIELD];
    }
    body.error.fieldErrors = fields;
  }
  const status = errorStatus[code];
  if (status >= 500) logRequestFailure(context.requestId, code, status);
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Request-ID": context.requestId, "Vary": "X-Claps-Locale" } });
}
export function withApi(handler: (request: Request, context: RequestContext) => Promise<Response>) {
  return async (request: Request) => {
    const context = requestContext(request);
    // File packs are deployment assets; translation failure must not hide an API failure.
    try {
      const locale = matchLocale(request.headers.get("x-claps-locale"), await deployedLocales());
      if (locale) {
        const pack = await readPack(locale, ["errors"]);
        context.messages = Object.fromEntries(Object.entries(pack).map(([key, value]) => [key.slice("errors.".length), value]));
      }
    } catch { /* Bundled ko/en errors remain available even during deployment failure. */ }
    try { return await handler(request, context); } catch (error) { return errorResponse(error, context); }
  };
}
