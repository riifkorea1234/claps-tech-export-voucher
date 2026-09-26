import { z } from "zod";
import { apiRequest } from "./client";
export async function workspaceRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const locale = typeof document !== "undefined" ? document.documentElement.lang || "ko" : "ko";
  const result = await apiRequest(path, { method, locale, schema: z.unknown(), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return result.data as T;
}
export function queryString(input: Record<string, string | number | boolean | undefined> = {}) {
  return new URLSearchParams(Object.entries(input).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
}
