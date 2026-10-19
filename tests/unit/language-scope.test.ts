import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";
import { ADMIN_LOCALE_COOKIE, LANGUAGE_SCOPE_HEADER, LOCALE_COOKIE, type LocaleEntry } from "../../lib/i18n/core";

const fixture = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  headers: new Headers(),
  user: null as null | { app_role: string; status: string; preferences: { locale: string } },
  registry: [] as LocaleEntry[],
  setCookie: vi.fn(),
  preferences: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () => fixture.headers,
  cookies: async () => ({
    get: (name: string) => fixture.cookies.has(name) ? { value: fixture.cookies.get(name) } : undefined,
    set: fixture.setCookie,
    delete: vi.fn(),
  }),
}));
vi.mock("../../lib/server/auth/session", () => ({ currentUser: async () => fixture.user }));
vi.mock("../../lib/server/auth/service", () => ({ authService: () => ({ preferences: fixture.preferences, session: async () => fixture.user }) }));
vi.mock("../../lib/server/db", () => ({
  getDatabase: () => ({ db: { select: () => ({ from: () => ({ orderBy: async () => fixture.registry }) }) } }),
}));
import { requestLanguage, availableLocales, loadMessages } from "../../lib/i18n/server";
import { POST } from "../../app/api/locale/route";
import { GET } from "../../app/api/locales/route";

beforeEach(() => {
  vi.clearAllMocks();
  fixture.cookies.clear();
  fixture.headers = new Headers();
  fixture.user = null;
  fixture.registry = ["en", "ja", "ko"].map((code, sortOrder) => ({
    code, sortOrder, nativeName: code, direction: "ltr", enabled: true, fallbackCode: code === "en" ? null : "en",
  }));
});
function select(locale: string, scope = "public") {
  return POST(new Request("http://localhost/api/locale", {
    method: "POST", headers: { origin: process.env.APP_ORIGIN ?? "http://localhost", "Content-Type": "application/json" },
    body: JSON.stringify({ locale, scope }),
  }));
}

it("defaults public pages to English and ignores legacy Korean cookies and preferences", async () => {
  fixture.headers.set("accept-language", "ko-KR,ko;q=0.9");
  fixture.cookies.set(LOCALE_COOKIE, "ko");
  fixture.user = { app_role: "member", status: "active", preferences: { locale: "ko" } };
  expect(await requestLanguage()).toMatchObject({ locale: "en", scope: "public" });
  expect((await availableLocales()).map((entry) => entry.code)).toEqual(["en", "ja"]);
});

it("resolves Japanese browser preferences and explicit selections on public pages", async () => {
  fixture.headers.set("accept-language", "ja-JP,en;q=0.8");
  expect((await requestLanguage("public")).locale).toBe("ja");
  fixture.cookies.set(LOCALE_COOKIE, "en");
  expect((await requestLanguage("public")).locale).toBe("en");
});

it("keeps admin Korean and public Japanese selections independent", async () => {
  fixture.headers.set(LANGUAGE_SCOPE_HEADER, "admin");
  fixture.cookies.set(ADMIN_LOCALE_COOKIE, "ko");
  fixture.cookies.set(LOCALE_COOKIE, "ja");
  expect(await requestLanguage()).toMatchObject({ locale: "ko", scope: "admin" });
  expect((await requestLanguage("public")).locale).toBe("ja");
  expect((await availableLocales(undefined, "admin")).map((entry) => entry.code)).toEqual(["en", "ja", "ko"]);
});

it("rejects Korean public selections and requires an active admin for admin selections", async () => {
  expect((await select("ko")).status).toBe(422);
  expect((await select("ko", "admin")).status).toBe(403);
  expect((await GET(new Request("http://localhost/api/locales?scope=admin"))).status).toBe(403);
  fixture.user = { app_role: "member", status: "active", preferences: { locale: "en" } };
  expect((await select("ko", "admin")).status).toBe(403);
  fixture.user = { app_role: "admin", status: "suspended", preferences: { locale: "en" } };
  expect((await select("ko", "admin")).status).toBe(403);
});

it("persists admin Korean without changing the public cookie or member preference", async () => {
  fixture.user = { app_role: "admin", status: "active", preferences: { locale: "ja" } };
  fixture.cookies.set("claps-session", "admin-session");
  const response = await select("ko", "admin");
  expect(response.status).toBe(200);
  expect((await response.json()).data.locale).toBe("ko");
  expect(fixture.setCookie).toHaveBeenCalledWith(ADMIN_LOCALE_COOKIE, "ko", expect.objectContaining({ httpOnly: true, path: "/" }));
  expect(fixture.setCookie).toHaveBeenCalledTimes(1);
  expect(fixture.preferences).not.toHaveBeenCalled();
  expect((await GET(new Request("http://localhost/api/locales?scope=admin"))).status).toBe(200);
});

it("persists public Japanese without changing the admin cookie", async () => {
  fixture.user = { app_role: "admin", status: "active", preferences: { locale: "en" } };
  fixture.cookies.set("claps-session", "admin-session");
  const response = await select("ja-JP");
  expect(response.status).toBe(200);
  expect(fixture.setCookie).toHaveBeenCalledWith(LOCALE_COOKIE, "ja", expect.any(Object));
  expect(fixture.preferences).toHaveBeenCalledWith("admin-session", "ja");
});

it("derives server page scope from the route even when a client spoofs the scope header", () => {
  for (const [path, expected] of [["/projects", "public"], ["/administrator", "public"], ["/admin", "admin"], ["/admin/users", "admin"]]) {
    const response = proxy(new NextRequest(`http://localhost${path}`, { headers: { [LANGUAGE_SCOPE_HEADER]: expected === "admin" ? "public" : "admin" } }));
    expect(response.headers.get(`x-middleware-request-${LANGUAGE_SCOPE_HEADER}`)).toBe(expected);
  }
});

it("uses English for missing UI translations even when the legacy registry points to Korean", async () => {
  fixture.registry[0].fallbackCode = "ko";
  fixture.registry[2].fallbackCode = null;
  const messages = await loadMessages("en", fixture.registry, ["navigation"]);
  expect(messages["navigation.language"]).toBe("Language");
});
