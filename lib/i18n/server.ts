import "server-only";
import { currentUser } from "@/lib/server/auth/session";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { locales } from "@/db/schema";
import { getDatabase } from "@/lib/server/db";
import {
  createTranslator,
  DEFAULT_LOCALE,
  LANGUAGE_SCOPE_HEADER,
  localeCookieName,
  scopedLocales,
  namespaces,
  resolveLocale,
  validateFallbacks,
  type Messages,
  type Namespace,
  type LocaleEntry,
  type LanguageScope,
} from "./core";
export { readPack, deployedLocales } from "./packs";
import { readPack, deployedLocales } from "./packs";
export async function localeRegistry(): Promise<LocaleEntry[]> {
  const entries = await getDatabase()
    .db.select()
    .from(locales)
    .orderBy(locales.sortOrder);
  validateFallbacks(entries);
  return entries;
}
export async function availableLocales(registry?: LocaleEntry[], scope: LanguageScope = "public") {
  const entries = registry ?? (await localeRegistry());
  const deployed = await deployedLocales();
  return scopedLocales(entries, scope).filter(
    (entry) => entry.enabled && deployed.includes(entry.code),
  );
}
export async function loadMessages(
  locale: string,
  entries: readonly LocaleEntry[],
  selected: readonly Namespace[] = namespaces,
) {
  validateFallbacks(entries);
  const messages: Messages = {};
  const deployed = await deployedLocales();
  // UI messages always fall back to English. Business content keeps its own registry chain.
  for (const code of [...new Set([DEFAULT_LOCALE, locale])]) {
    if (deployed.includes(code))
      Object.assign(messages, await readPack(code, selected));
  }
  return messages;
}
export const requestLanguage = cache(async (scope?: LanguageScope) => {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  scope ??= requestHeaders.get(LANGUAGE_SCOPE_HEADER) === "admin" ? "admin" : "public";
  const entries = await localeRegistry();
  const available = await availableLocales(entries, scope);
  const locale = resolveLocale(
    available.map((e) => e.code),
    cookieStore.get(localeCookieName(scope))?.value,
    (await currentUser())?.preferences.locale,
    requestHeaders.get("accept-language"),
  );
  return {
    locale,
    scope,
    direction: entries.find((e) => e.code === locale)?.direction ?? "ltr",
    available,
    entries,
  };
});
export async function getTranslator(
  selected: readonly Namespace[] = namespaces,
) {
  const { locale, entries } = await requestLanguage();
  return createTranslator(
    await loadMessages(locale, entries, selected),
    locale,
  );
}
