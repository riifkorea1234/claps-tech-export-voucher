import "server-only";
import type { PoolClient, QueryResultRow } from "pg";
import { authService } from "../auth/service";
import { AppError, jsonResponse, withApi } from "../errors/http";
import { rawSession } from "../auth/http";
import { adminQuery } from "../../contracts/admin";
import { idSchema, paginate } from "../../contracts/common";
import { fallbackChain, resolveLocale, type LocaleEntry } from "../../i18n/core";
import { availableLocales } from "../../i18n/server";
import { localizedContentSchema } from "../../contracts/metadata";
export async function publicPartner(c: PoolClient, row: QueryResultRow, requested: string) {
  const registry = (await c.query('SELECT code,native_name AS "nativeName",display_name AS "displayName",enabled,fallback_code AS "fallbackCode",direction,sort_order AS "sortOrder" FROM locales ORDER BY sort_order')).rows as LocaleEntry[], available = await availableLocales(registry);
  const locale = resolveLocale(available.map(l => l.code), requested);
  const translations = (await c.query("SELECT locale_code,published,published_version FROM localized_contents WHERE resource_type='partner' AND resource_key=$1 AND published_at IS NOT NULL", [row.id])).rows;
  let name = row.name, description = row.profile.description, ipNames = row.profile.ipNames, marketDescription = row.profile.marketDescription ?? "", imageAlt = row.profile.imageAlt ?? row.name, resolvedLocale = "ko", publishedVersion = 0;
  for (const code of fallbackChain(locale, registry)) {
    if (!available.some(l => l.code === code)) continue;
    const translation = translations.find(t => t.locale_code === code), parsed = localizedContentSchema.safeParse(translation?.published);
    if (parsed.success && parsed.data.resourceType === "partner" && parsed.data.name.trim()) {
      name = parsed.data.name; description = parsed.data.description; ipNames = parsed.data.ipNames ?? ipNames;
      marketDescription = parsed.data.marketDescription ?? marketDescription; imageAlt = parsed.data.imageAlt ?? imageAlt;
      resolvedLocale = code; publishedVersion = translation.published_version; break;
    }
  }
  return { id: row.id as string, name: name as string, description: description as string, contactEmail: row.contact_email as string | null, imageCount: row.profile.images.length as number, tags: row.profile.tags as string[], ipNames: ipNames as string[], marketDescription: marketDescription as string, imageAlt: imageAlt as string, requestedLocale: locale, resolvedLocale, fallbackUsed: resolvedLocale !== locale, publishedVersion };
}
export const partnersApi = withApi(async (request, context) => {
  const url = new URL(request.url), id = url.pathname.split("/")[3];
  const q = adminQuery.parse(Object.fromEntries(url.searchParams));
  if (id) idSchema.parse(id);
  const data = await authService().authenticated(await rawSession(), async (c, u) => {
    if (u.status !== "active") throw new AppError("FORBIDDEN");
    const locale = request.headers.get("x-claps-locale") ?? "ko";
    if (id) {
      const { rows: [row] } = await c.query("SELECT * FROM partners WHERE id=$1 AND visibility='public'", [id]);
      if (!row) throw new AppError("NOT_FOUND");
      return publicPartner(c, row, locale);
    }
    const where = "visibility='public' AND strpos(lower(name || ' ' || (profile->'ipNames')::text),lower($1))>0";
    const total = (await c.query(`SELECT count(*)::int n FROM partners WHERE ${where}`, [q.q])).rows[0].n;
    const rows = (await c.query(`SELECT * FROM partners WHERE ${where} ORDER BY updated_at DESC,id LIMIT $2 OFFSET $3`, [q.q, q.pageSize, (q.page - 1) * q.pageSize])).rows;
    const items = [];
    for (const row of rows) items.push(await publicPartner(c, row, locale));
    return { items, ...paginate(q.page, q.pageSize, total) };
  });
  return jsonResponse(data, context);
});
