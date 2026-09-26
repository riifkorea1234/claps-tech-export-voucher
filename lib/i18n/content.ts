import "server-only";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { localizedContents } from "@/db/schema";
import { localizedContentSchema } from "@/lib/contracts/metadata";
import { getDatabase } from "@/lib/server/db";
import { fallbackChain, type LocaleEntry } from "./core";

// Internal read service: the calling resource service must first authorize the
// resource and supply its trusted original. No public arbitrary-resource endpoint.
export async function publishedContent(
  input: {
    resourceType: "partner" | "guide";
    resourceKey: string;
    requestedLocale: string;
    originalLocale: string;
    original: unknown;
    registry: readonly LocaleEntry[];
  },
  db: NodePgDatabase<typeof schema> = getDatabase().db,
) {
  const original = localizedContentSchema.parse(input.original);
  if (
    !["partner", "guide"].includes(input.resourceType) ||
    original.resourceType !== input.resourceType
  )
    throw new Error("Invalid content resource");
  if (!input.registry.some((e) => e.code === input.requestedLocale))
    throw new Error("Unregistered content locale");
  for (const locale of fallbackChain(input.requestedLocale, input.registry)) {
    if (!input.registry.some((e) => e.code === locale && e.enabled)) continue;
    const [row] = await db
      .select({ published: localizedContents.published })
      .from(localizedContents)
      .where(
        and(
          eq(localizedContents.resourceType, input.resourceType),
          eq(localizedContents.resourceKey, input.resourceKey),
          eq(localizedContents.localeCode, locale),
          isNotNull(localizedContents.published),
          isNotNull(localizedContents.publishedAt),
        ),
      )
      .limit(1);
    const parsed = localizedContentSchema.safeParse(row?.published);
    if (
      parsed.success &&
      parsed.data.resourceType === input.resourceType &&
      (parsed.data.resourceType === "partner"
        ? !!parsed.data.name.trim()
        : parsed.data.rules.every((rule) => !!rule.title.trim()))
    )
      return {
        content: parsed.data,
        requestedLocale: input.requestedLocale,
        resolvedLocale: locale,
        fallbackUsed: locale !== input.requestedLocale,
      };
  }
  return {
    content: original,
    requestedLocale: input.requestedLocale,
    resolvedLocale: input.originalLocale,
    fallbackUsed: input.originalLocale !== input.requestedLocale,
  };
}
