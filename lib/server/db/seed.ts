import "server-only";
import { locales } from "../../../db/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../../../db/schema";

export async function seedDatabase(db: NodePgDatabase<typeof schema>) {
  await db.transaction(async (tx) => {
    await tx.insert(locales).values({ code: "ko", nativeName: "한국어", displayName: "Korean", enabled: false, sortOrder: 0 }).onConflictDoNothing();
    await tx.insert(locales).values({ code: "en", nativeName: "English", displayName: "English", enabled: false, fallbackCode: "ko", sortOrder: 1 }).onConflictDoNothing();
  });
}
