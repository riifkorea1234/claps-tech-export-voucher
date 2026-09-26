import { authService } from "@/lib/server/auth/service";
import { SESSION_COOKIE } from "@/lib/server/auth/policy";
import { uiNamespaces } from "@/lib/i18n/core";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  availableLocales,
  loadMessages,
  localeRegistry,
} from "@/lib/i18n/server";
import { LOCALE_COOKIE, matchLocale } from "@/lib/i18n/core";
import { AppError, jsonResponse, withApi } from "@/lib/server/errors/http";
import { readJson } from "@/lib/server/errors/validation";
export const POST = withApi(async (request, context) => {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_ORIGIN || request.url).origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AppError("FORBIDDEN");
  const input = await readJson(
    request,
    z.object({ locale: z.string().min(2).max(64) }).strict(),
  );
  const entries = await localeRegistry();
  const available = await availableLocales(entries);
  const locale = matchLocale(
    input.locale,
    available.map((entry) => entry.code),
  );
  if (!locale) throw new AppError("VALIDATION_ERROR");
  const messages = await loadMessages(locale, entries, uiNamespaces);
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (raw) {
    if (await authService().session(raw)) await authService().preferences(raw, locale);
    else (await cookies()).delete(SESSION_COOKIE);
  }
  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(expected).protocol === "https:",
    path: "/",
    maxAge: 31536000,
  });
  return jsonResponse({ locale, messages }, context);
});
