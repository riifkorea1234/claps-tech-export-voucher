import "server-only";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { locales } from "@/db/schema";
import { getDatabase } from "@/lib/server/db";
import { deployedLocales } from "./server";
import { validateFallbacks } from "./core";
// One-time transition of untouched Phase 1 seed rows. Versioned operator settings
// are preserved on repeated execution. Run only with a reviewed deployment pack.
export async function activateInitialLocales(
  db: NodePgDatabase<typeof schema> = getDatabase().db,
) {
  const packs = await deployedLocales();
  if (!packs.includes("ko") || !packs.includes("en"))
    throw new Error("Required language packs are incomplete");
  await db.transaction(async (tx) => {
    const entries = await tx.select().from(locales).for("update");
    validateFallbacks(entries);
    if (
      !entries.some((e) => e.code === "ko") ||
      !entries.some((e) => e.code === "en")
    )
      throw new Error("Seed locales first");
    for (const code of ["ko", "en"]) {
      await tx
        .update(locales)
        .set({
          enabled: true,
          version: sql`${locales.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(locales.code, code),
            eq(locales.version, 1),
            eq(locales.enabled, false),
          ),
        );
    }
    const [base] = await tx
      .select()
      .from(locales)
      .where(eq(locales.code, "ko"));
    if (!base.enabled) throw new Error("Default locale must remain enabled");
  });
}
