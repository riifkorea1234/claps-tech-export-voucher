import { expect, it } from "vitest";
import { jobKinds } from "../../lib/contracts/metadata";
import { assertJobTransition, jobStatuses, parseJobInput, parseJobOutput } from "../../lib/contracts/jobs";
import { requestHash } from "../../lib/server/jobs/service";
import { productionHandlers } from "../../lib/server/adapters/registry";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
it("accepts only legal job transitions and never revives terminal jobs", () => {
  for (const from of jobStatuses) for (const to of jobStatuses) {
    const legal = from === "queued" && ["running", "failed", "canceled"].includes(to) || from === "running" && ["succeeded", "failed", "canceled"].includes(to);
    if (legal) expect(() => assertJobTransition(from, to)).not.toThrow(); else expect(() => assertJobTransition(from, to)).toThrow();
  }
});
it("bounds envelopes, rejects kind/version/field mismatch and creates order-independent hashes", () => {
  const input = parseJobInput({ schemaVersion: 1, kind: "matching", outputLocale: "ko", preferences: { schemaVersion: 1, matching: { industries: ["a", "b"] } } });
  expect(requestHash(input)).toBe(requestHash(parseJobInput({ ...input, preferences: { matching: { industries: ["a", "b"] }, schemaVersion: 1 } })));
  for (const extra of [{ schemaVersion: 2 }, { ownerId: "injected" }, { kind: "fake" }]) expect(() => parseJobInput({ ...input, ...extra })).toThrow();
  expect(() => parseJobOutput("matching", { schemaVersion: 1, kind: "generation", assetIds: [] })).toThrow("JOB_KIND_MISMATCH");
  expect(() => parseJobInput({ ...input, preferences: { schemaVersion: 1, matching: { industries: Array(50).fill("한".repeat(500)), styles: Array(50).fill("한".repeat(500)) } } })).toThrow("METADATA_TOO_LARGE");
});
it("covers all six kind-specific input/output schemas", () => {
  const file = { schemaVersion: 1, storageKey: "fixture-original", originalName: "x.zip", mimeType: "application/zip", size: 0, checksum: "a".repeat(64) };
  const variants = [
    [{ kind: "generation", sessionId: "s", prompt: "p" }, { assetIds: ["a"] }],
    [{ kind: "guide_extraction", guideId: "g" }, { guideId: "g" }],
    [{ kind: "verification", assetIds: ["a"], guideId: "g" }, { assetIds: ["a"] }],
    [{ kind: "matching", preferences: { schemaVersion: 1 } }, { partnerIds: [] }],
    [{ kind: "monitoring", recordId: "r" }, { recordId: "r", resultFile: file }],
    [{ kind: "export", assetIds: ["a"] }, { file }],
  ];
  for (const [input, output] of variants) {
    const parsed = parseJobInput({ schemaVersion: 1, outputLocale: "ko", ...input });
    expect(parseJobOutput(parsed.kind, { schemaVersion: 1, kind: parsed.kind, ...output }).kind).toBe(parsed.kind);
  }
});
it("keeps production test adapters disabled and applies approved bounded limits to every kind", () => {
  expect(productionHandlers.kinds()).toEqual(["export", "matching"]);
  expect(productionHandlers.get("verification")).toBeUndefined();
  expect(developmentQueuePolicy).toMatchObject({ runningPerUser: 2, queuedPerUser: 10, requestsPerHour: 60 });
  for (const kind of jobKinds) expect(developmentQueuePolicy.kinds[kind]).toMatchObject({ timeoutMs: kind === "matching" ? 30000 : 300000, maxRetries: 2 });
});
