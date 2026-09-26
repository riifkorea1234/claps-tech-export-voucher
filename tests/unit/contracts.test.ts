import { describe, expect, it } from "vitest";
import { z } from "zod";
import { paginationSchema, paginate, localeCodeSchema } from "../../lib/contracts/common";
import { fileSchema, preferencesSchema, coverSchema, jobInputSchema, localizedContentSchema, parseMetadata } from "../../lib/contracts/metadata";
const file = { schemaVersion: 1, storageKey: "uploads/a/image.png", originalName: "image.png", mimeType: "image/png", size: 100, checksum: "a".repeat(64) };
describe("bounded metadata contracts", () => {
  it("defaults pagination and rejects invalid bounds", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 30 });
    for (const pageSize of [0, 101, Infinity, "2.5"]) expect(paginationSchema.safeParse({ pageSize }).success).toBe(false);
    expect(paginate(1, 30, 0).totalPages).toBe(0);
    expect(paginate(2, 30, 31).totalPages).toBe(2);
  });
  it("rejects ownership and role injection, unsupported versions and unions", () => {
    expect(parseMetadata(preferencesSchema, { schemaVersion: 1, locale: "en" }).locale).toBe("en");
    for (const extra of [{ role: "admin" }, { ownerId: "another" }, { schemaVersion: 2 }]) expect(() => parseMetadata(preferencesSchema, { schemaVersion: 1, ...extra })).toThrow();
    expect(coverSchema.safeParse({ schemaVersion: 1, kind: "external", url: "https://example.org" }).success).toBe(false);
  });
  it("rejects binary data, absolute/traversal paths, invalid numbers and oversized fields", () => {
    expect(fileSchema.parse(file)).toEqual(file);
    for (const storageKey of ["../secret", "/etc/passwd", "a/../b", "https://example.org/a", "data:image/png;base64,AAAA", "a\\b"]) expect(fileSchema.safeParse({ ...file, storageKey }).success).toBe(false);
    for (const size of [-1, Infinity, NaN, 0.5]) expect(fileSchema.safeParse({ ...file, size }).success).toBe(false);
    expect(fileSchema.safeParse({ ...file, originalName: "a".repeat(256) }).success).toBe(false);
  });
  it("counts UTF-8 bytes and rejects cyclic metadata", () => {
    expect(() => parseMetadata(z.unknown(), { text: "한".repeat(22_000) })).toThrow("METADATA_TOO_LARGE");
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    expect(() => parseMetadata(z.unknown(), cycle)).toThrow("INVALID_METADATA");
  });
  it("validates kind-specific snapshots and canonical locale codes", () => {
    expect(jobInputSchema.safeParse({ schemaVersion: 1, kind: "generation", sessionId: "s", prompt: "test", outputLocale: "ko" }).success).toBe(true);
    expect(jobInputSchema.safeParse({ schemaVersion: 1, kind: "generation", recordId: "r", outputLocale: "ko" }).success).toBe(false);
    expect(localeCodeSchema.safeParse("zh-Hant").success).toBe(true);
    expect(localeCodeSchema.safeParse("../en").success).toBe(false);
  });
  it("disallows fixed UI content, contacts and rule conditions in translations", () => {
    for (const resourceType of ["ui", "email", "landing"]) expect(localizedContentSchema.safeParse({ schemaVersion: 1, resourceType, name: "n", description: "d" }).success).toBe(false);
    expect(localizedContentSchema.safeParse({ schemaVersion: 1, resourceType: "partner", name: "n", description: "d", contactEmail: "private@example.test" }).success).toBe(false);
    expect(localizedContentSchema.safeParse({ schemaVersion: 1, resourceType: "guide", rules: [{ ruleId: "r", title: "t", description: "d", condition: "different" }] }).success).toBe(false);
  });
});
