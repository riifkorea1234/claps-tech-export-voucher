import { it, expect } from "vitest";
import { monitoringCreate, monitoringPatch } from "../../lib/contracts/monitoring";
import { monitoringResultSchema, normalizeMonitoringUrl } from "../../lib/contracts/monitoring-result";
it("rejects unsafe links and canonicalizes HTTPS without fragments", () => {
  for (const url of ["http://public.com", "https://127.0.0.1", "https://0x7f000001", "https://[::1]", "https://user:pw@public.com", "javascript:alert(1)", "https://x.local", "https://public.com:8000"]) expect(() => normalizeMonitoringUrl(url)).toThrow();
  expect(normalizeMonitoringUrl("https://PUBLIC.com:443/a#secret")).toBe("https://public.com/a");
});
it("distinguishes empty, results and partial while rejecting all-failed and duplicate normalized URLs", () => {
  const sources = [{ name: "fixture", status: "succeeded" }], item = { url: "https://public.com/a", source: "fixture", similarity: null, discoveredAt: "2026-01-01T00:00:00.000Z" };
  expect(monitoringResultSchema.parse({ state: "empty", sources, items: [] }).state).toBe("empty");
  expect(monitoringResultSchema.parse({ state: "partial", sources: [...sources, { name: "other", status: "failed" }], items: [] }).state).toBe("partial");
  for (const data of [{ state: "results", sources, items: [] }, { state: "empty", sources, items: [item] }, { state: "partial", sources: [{ name: "x", status: "failed" }], items: [] }, { state: "results", sources, items: [item, { ...item, url: item.url + "#fragment" }] }]) expect(() => monitoringResultSchema.parse(data)).toThrow();
});
it("requires one owned source and optimistic version without arbitrary source replacement", () => {
  expect(() => monitoringCreate.parse({ name: "ref", source: { kind: "asset", assetId: "a", ticket: "t" } })).toThrow();
  expect(() => monitoringPatch.parse({ version: 1, sourceAssetId: "other" })).toThrow();
});
