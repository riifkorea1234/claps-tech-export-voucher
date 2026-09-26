import "server-only";
import { currentUser } from "@/lib/server/auth/session";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { locales } from "@/db/schema";
import { getDatabase } from "@/lib/server/db";
import {
  createTranslator,
  fallbackChain,
  LOCALE_COOKIE,
  namespaces,
  resolveLocale,
  validateFallbacks,
  type Messages,
  type Namespace,
  type LocaleEntry,
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
export async function availableLocales(registry?: LocaleEntry[]) {
  const entries = registry ?? (await localeRegistry());
  const deployed = await deployedLocales();
  return entries.filter(
    (entry) => entry.enabled && deployed.includes(entry.code),
  );
}
export async function loadMessages(
  locale: string,
  entries: readonly LocaleEntry[],
  selected: readonly Namespace[] = namespaces,
) {
  const messages: Messages = {};
  const deployed = await deployedLocales();
  for (const code of fallbackChain(locale, entries).reverse()) {
    if (deployed.includes(code))
      Object.assign(messages, await readPack(code, selected));
  }
  return messages;
}
export const requestLanguage = cache(async () => {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const entries = await localeRegistry();
  const available = await availableLocales(entries);
  const locale = resolveLocale(
    available.map((e) => e.code),
    cookieStore.get(LOCALE_COOKIE)?.value,
    (await currentUser())?.preferences.locale,
    requestHeaders.get("accept-language"),
  );
  return {
    locale,
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
