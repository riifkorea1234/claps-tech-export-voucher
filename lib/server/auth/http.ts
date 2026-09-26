import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { AppError, jsonResponse, withApi } from "@/lib/server/errors/http";
import { readJson } from "@/lib/server/errors/validation";
import { accountDto, authService } from "./service";
import { SESSION_COOKIE, SESSION_SECONDS, emailSchema, passwordSchema, tokenSchema } from "./policy";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/core";
import { availableLocales } from "@/lib/i18n/server";
export function assertOrigin(request: Request) {
  if (!process.env.APP_ORIGIN || request.headers.get("origin") !== new URL(process.env.APP_ORIGIN).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("FORBIDDEN");
}
export async function rawSession() { return (await cookies()).get(SESSION_COOKIE)?.value; }
export async function localeCookie(locale: string) {
  (await cookies()).set(LOCALE_COOKIE, locale, { httpOnly: true, sameSite: "lax", secure: new URL(process.env.APP_ORIGIN!).protocol === "https:", path: "/", maxAge: 31536000 });
}
async function sessionCookie(value: string) {
  (await cookies()).set(SESSION_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: new URL(process.env.APP_ORIGIN!).protocol === "https:", path: "/", maxAge: value ? SESSION_SECONDS : 0 });
}
export async function clearSessionCookie() { await sessionCookie(""); }
export const authPost = withApi(async (request, context) => {
  assertOrigin(request);
  const action = new URL(request.url).pathname.split("/").pop()!;
  const known = ["lookup", "sign-up", "sign-in", "resend-verification", "forgot-password", "verify-email", "reset-password", "change-password", "sign-out"];
  if (!known.includes(action)) throw new AppError("NOT_FOUND");
  const service = authService();
  // Only accept a proxy-provided identity when deployment explicitly names its overwritten header.
  const ip = process.env.AUTH_TRUSTED_IP_HEADER ? request.headers.get(process.env.AUTH_TRUSTED_IP_HEADER)?.slice(0, 128) ?? "unknown" : "unknown";
  await service.limit(`ip:${action}`, ip, 100);
  const cookie = await rawSession();
  const supported = (await availableLocales()).map(l => l.code);
  const locale = resolveLocale(supported, (await cookies()).get(LOCALE_COOKIE)?.value, undefined, request.headers.get("accept-language"));
  let result: unknown;
  if (["lookup", "resend-verification", "forgot-password"].includes(action)) {
    const data = await readJson(request, z.strictObject({ email: emailSchema }));
    await service.limit(action, data.email, action === "lookup" ? 10 : 5);
    result = action === "lookup" ? await service.lookup(data.email) : await service.sendLink(data.email, action === "forgot-password" ? "reset" : "verify", locale);
  } else if (action === "sign-up" || action === "sign-in") {
    const data = await readJson(request, z.strictObject({ email: emailSchema, password: passwordSchema }));
    await service.limit(action, data.email, action === "sign-in" ? 10 : 5);
    if (action === "sign-up") result = await service.signup({ ...data, locale });
    else {
      const session = await service.login({ ...data, locale });
      await sessionCookie(session.token); await localeCookie(session.user.preferences.locale ?? locale);
      result = { nextStep: session.nextStep, user: accountDto(session.user) };
    }
  } else if (action === "verify-email" || action === "reset-password") {
    const data = await readJson(request, action === "verify-email" ? z.strictObject({ token: tokenSchema }) : z.strictObject({ token: tokenSchema, password: passwordSchema }));
    await service.limit(action, data.token, 10);
    const consumed = await service.consume(data.token, action === "verify-email" ? "verify" : "reset", "password" in data && typeof data.password === "string" ? data.password : undefined, locale);
    if ("token" in consumed) {
      await sessionCookie(consumed.token); await localeCookie(consumed.user.preferences.locale ?? locale);
    } else await clearSessionCookie();
    result = { nextStep: consumed.nextStep };
  } else if (action === "change-password") {
    const data = await readJson(request, z.strictObject({ currentPassword: passwordSchema, password: passwordSchema }));
    const u = await service.session(cookie);
    if (!u) throw new AppError("UNAUTHORIZED");
    await service.limit(action, u.id, 10);
    result = await service.changePassword(cookie, data.currentPassword, data.password); await clearSessionCookie();
  } else {
    await readJson(request, z.strictObject({}));
    result = await service.logout(cookie); await clearSessionCookie();
  }
  return jsonResponse(result, context);
});
