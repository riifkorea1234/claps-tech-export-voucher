import { expect, it } from "vitest";
import {
  createTranslator,
  resolveLocale,
  fallbackChain,
  validateFallbacks,
  type LocaleEntry,
} from "../../lib/i18n/core";
import {
  normalizeRole,
  normalizeStatus,
  normalizeGroup,
} from "../../lib/i18n/legacy";
const registry: LocaleEntry[] = [
  {
    code: "ko",
    nativeName: "한국어",
    direction: "ltr",
    enabled: true,
    fallbackCode: null,
    sortOrder: 0,
  },
  {
    code: "en",
    nativeName: "English",
    direction: "ltr",
    enabled: true,
    fallbackCode: "ko",
    sortOrder: 1,
  },
];
it("honors cookie, member preference, browser quality, and default priority", () => {
  expect(resolveLocale(["ko", "en"], "ko", "en", "en-US")).toBe("ko");
  expect(resolveLocale(["ko", "en"], undefined, "en", "ko")).toBe("en");
  expect(
    resolveLocale(["ko", "en"], "bogus", undefined, "ko;q=0.2,en-US;q=0.9"),
  ).toBe("en");
  expect(resolveLocale(["ko", "en"], undefined, undefined, "en;q=0,fr")).toBe(
    "ko",
  );
  expect(resolveLocale(["ko"], "en", undefined, "en-US")).toBe("ko");
  expect(resolveLocale(["ko", "en"], "../../en", undefined, "zz")).toBe("ko");
});
it("rejects cycles and missing fallback registrations", () => {
  expect(fallbackChain("en", registry)).toEqual(["en", "ko"]);
  expect(() =>
    validateFallbacks([{ ...registry[0], fallbackCode: "en" }, registry[1]]),
  ).toThrow();
  expect(() =>
    validateFallbacks([{ ...registry[0], fallbackCode: "fr" }]),
  ).toThrow();
});
it("interpolates full messages without leaking missing keys or undefined", () => {
  const t = createTranslator({
    "common.unavailable": "Unavailable",
    count: "{count} images",
  });
  expect(t("count", { count: 2 })).toBe("2 images");
  expect(t("missing.raw.key")).toBe("Unavailable");
  expect(t("count")).toBe("— images");
});
it("normalizes only legacy enum fields", () => {
  expect(normalizeStatus("검증 중")).toBe("verifying");
  expect(normalizeRole("디자인/크리에이티브")).toBe("design");
  expect(normalizeGroup("오늘")).toBe("today");
  expect(normalizeStatus("custom user text")).toBe("custom user text");
});
it("formats English singular/plural counts and numbers without changing currency or timezone", () => {
  const t = createTranslator(
    { "common.images": "{count} images", "common.images.one": "{count} image" },
    "en",
  );
  expect(t("common.images", { count: 1 })).toBe("1 image");
  expect(t("common.images", { count: 2 })).toBe("2 images");
});
it("formats calendar dates in the same timezone for both languages", async () => {
  const { displayDate } = await import("../../lib/i18n/format");
  const date = Date.parse("2026-09-22T16:00:00Z");
  expect(displayDate(date, "en")).toBe("09/23/2026");
  expect(displayDate("2026.09.23", "en")).toBe("09/23/2026");
  expect(displayDate(date, "ko")).toContain("23");
  expect(
    createTranslator({ count: "{count}" }, "en")("count", { count: 1200 }),
  ).toBe("1,200");
});
