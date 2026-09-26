import { expect, it, vi } from "vitest";
import { z } from "zod";
import { matchRequestSchema } from "../../lib/contracts/matching";
import { scanRequest } from "../../lib/contracts/monitoring";
import { apiRequest } from "../../lib/api/client";
import { requestContext } from "../../lib/server/errors/http";

it("accepts canonical third-language job snapshots without schema changes and rejects malformed locales", () => {
  for (const outputLocale of ["en-GB", "ja", "fr"]) {
    expect(matchRequestSchema.parse({ revision: 1, outputLocale, idempotencyKey: "test" }).outputLocale).toBe(outputLocale);
    expect(scanRequest.parse({ outputLocale, idempotencyKey: "test" }).outputLocale).toBe(outputLocale);
  }
  for (const outputLocale of ["../ko", "en_gb", "en-gb", ""]) {
    expect(scanRequest.safeParse({ outputLocale, idempotencyKey: "test" }).success).toBe(false);
  }
});
it("preserves the selected locale in API requests and safely falls back for network errors", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
  vi.stubGlobal("fetch", fetcher);
  try {
    await apiRequest("/api/example", { locale: "en-GB", schema: z.string() });
    expect(fetcher.mock.calls[0][1].headers.get("X-Claps-Locale")).toBe("en-GB");
    fetcher.mockRejectedValue(new TypeError("network"));
    await expect(apiRequest("/api/example", { locale: "en-GB", schema: z.string() })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 0 });
  } finally { vi.unstubAllGlobals(); }
});
it("uses a regional English error fallback while invalid headers cannot escape into responses", () => {
  expect(requestContext(new Request("http://test", { headers: { "X-Claps-Locale": "en-GB" } })).locale).toBe("en");
  expect(requestContext(new Request("http://test", { headers: { "X-Claps-Locale": "../en" } })).locale).toBe("ko");
});
