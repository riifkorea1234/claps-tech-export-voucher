import { z } from "zod";
import { errorMessages } from "../contracts/errors";
import { matchLocale } from "../i18n/core";
import type { ApiResponse } from "../contracts/common";
const errorEnvelope = z.object({ error: z.object({ code: z.string().max(100), message: z.string().max(1000), requestId: z.string().max(128), fieldErrors: z.record(z.string(), z.array(z.string())).optional() }) });
export class ApiClientError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly requestId?: string, public readonly fieldErrors?: Record<string, string[]>) { super(message); this.name = "ApiClientError"; }
}
export async function apiRequest<T>(path: string, options: RequestInit & { locale?: string; schema: z.ZodType<T> }): Promise<ApiResponse<T>> {
  if (!path.startsWith("/api/") || path.includes("\\") || /[\r\n]/.test(path)) throw new Error("API path must be same-origin /api/");
  const { locale = "ko", schema, ...init } = options;
  const fallback = matchLocale(locale, ["ko", "en"]) === "en" ? "en" : "ko";
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json"); headers.set("X-Claps-Locale", locale);
  if (typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try { response = await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store", redirect: "error" }); }
  catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiClientError("SERVICE_UNAVAILABLE", errorMessages[fallback].SERVICE_UNAVAILABLE, 0);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorEnvelope.safeParse(payload);
    if (parsed.success) { const error = parsed.data.error; throw new ApiClientError(error.code, error.message, response.status, error.requestId, error.fieldErrors); }
    throw new ApiClientError("INTERNAL_ERROR", errorMessages[fallback].INTERNAL_ERROR, response.status);
  }
  const envelope = z.object({ data: schema, pagination: z.object({ page: z.number().int().positive(), pageSize: z.number().int().positive().max(100), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() }).optional() }).safeParse(payload);
  if (!envelope.success) throw new ApiClientError("INTERNAL_ERROR", errorMessages[fallback].INTERNAL_ERROR, response.status);
  return envelope.data;
}
