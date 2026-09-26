import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, errorResponse, requestContext, withApi, jsonResponse } from "../../lib/server/errors/http";
import { readJson } from "../../lib/server/errors/validation";
import { redact } from "../../lib/server/errors/logger";
import { apiRequest } from "../../lib/api/client";
afterEach(() => vi.restoreAllMocks());
const context = { requestId: "00000000-0000-4000-8000-000000000000", locale: "en" as const };
it("uses server generated trace IDs and private responses", async () => {
  const request = new Request("http://localhost/api/health", { headers: { "X-Request-ID": "private@example.test", "X-Claps-Locale": "en" } });
  const ctx = requestContext(request);
  expect(ctx.requestId).toMatch(/^[a-f0-9-]{36}$/); expect(ctx.locale).toBe("en");
  const response = await withApi(async (_r, c) => jsonResponse({ ok: true }, c))(request);
  expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(response.headers.get("x-request-id")).not.toBe("private@example.test");
});
it("hides SQL, tokens and personal values in internal failures and logs", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const secret = "postgresql://person:secret@host/db SELECT private@example.test";
  const response = errorResponse(new Error(secret), context);
  expect(response.status).toBe(500);
  const body = await response.json(); expect(body.error.code).toBe("INTERNAL_ERROR");
  expect(JSON.stringify(body)).not.toContain(secret); expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
  expect(redact({ password: "secret", nested: { innocuous: secret }, error: new Error(secret), count: 1 })).toEqual({ password: "[REDACTED]", nested: { innocuous: "[REDACTED]" }, error: "[REDACTED_ERROR]", count: 1 });
});
it("maps application errors and safe localized validation fields", async () => {
  expect(errorResponse(new AppError("VERSION_CONFLICT"), context).status).toBe(409);
  const parsed = z.strictObject({ name: z.string().min(2) }).safeParse({ name: "" });
  if (parsed.success) throw new Error("fixture");
  const response = errorResponse(parsed.error, { ...context, locale: "ko" });
  expect(response.status).toBe(422); expect((await response.json()).error.fieldErrors.name).toEqual(["이 값을 확인해 주세요."]);
});
it("distinguishes malformed JSON from input validation and limits streamed bytes", async () => {
  const request = (body: string) => new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  await expect(readJson(request('{"n":'), z.unknown())).rejects.toMatchObject({ code: "BAD_REQUEST" });
  await expect(readJson(request('{"n":"wrong"}'), z.strictObject({ n: z.number() }))).rejects.toBeInstanceOf(z.ZodError);
  await expect(readJson(request(JSON.stringify({ n: "한".repeat(22_000) })), z.unknown())).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(await readJson(request('{"n":2}'), z.strictObject({ n: z.number() }))).toEqual({ n: 2 });
});
it("client validates response DTO, preserves error code/id and disallows remote calls", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: { count: 3 } }));
  const schema = z.object({ count: z.number() });
  expect(await apiRequest("/api/test", { schema })).toEqual({ data: { count: 3 } });
  expect(fetchMock.mock.calls[0][1]?.credentials).toBe("same-origin");
  fetchMock.mockResolvedValue(Response.json({ error: { code: "VERSION_CONFLICT", message: "Refresh", requestId: "trace-1" } }, { status: 409 }));
  await expect(apiRequest("/api/test", { schema })).rejects.toMatchObject({ code: "VERSION_CONFLICT", requestId: "trace-1", status: 409 });
  fetchMock.mockResolvedValue(new Response("internal SQL secret", { status: 500 }));
  await expect(apiRequest("/api/test", { schema })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  await expect(apiRequest("https://example.org/api/test", { schema })).rejects.toThrow("same-origin");
  fetchMock.mockResolvedValue(Response.json({ data: { count: "wrong" } }));
  await expect(apiRequest("/api/test", { schema })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
});

it("normalizes network failures and preserves caller cancellation", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("secret network details"));
  await expect(apiRequest("/api/test", { schema: z.unknown() })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 0 });
  const abort = new DOMException("Canceled", "AbortError"); fetchMock.mockRejectedValue(abort);
  await expect(apiRequest("/api/test", { schema: z.unknown() })).rejects.toBe(abort);
});
