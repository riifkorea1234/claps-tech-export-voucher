import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { seedDatabase } from "../../lib/server/db/seed";
import { publishedContent } from "../../lib/i18n/content";
import { activateInitialLocales } from "../../lib/i18n/activate";
import { availableLocales } from "../../lib/i18n/server";
import * as schema from "../../db/schema";
const { pool } = createDatabase(getTestDatabaseUrl(), 2);
const db = drizzle(pool, { schema });
beforeAll(async () => {
  await migrateDatabase(pool);
  await seedDatabase(db);
});
afterAll(async () => {
  await pool.end();
});
const rollback = new Error("rollback fixture");
it("activates initial file packs once and preserves versioned operator settings", async () => {
  await expect(
    db.transaction(async (tx) => {
      await tx.update(schema.locales).set({ enabled: false, version: 1 });
      await activateInitialLocales(tx);
      await activateInitialLocales(tx);
      let rows = await tx.select().from(schema.locales);
      expect(
        rows
          .filter((r) => r.enabled)
          .map((r) => r.code)
          .sort(),
      ).toEqual(["en", "ko"]);
      expect(rows.every((r) => r.version === 2)).toBe(true);
      await tx
        .update(schema.locales)
        .set({ enabled: false, version: 3 })
        .where(eq(schema.locales.code, "en"));
      await activateInitialLocales(tx);
      await seedDatabase(tx);
      rows = await tx.select().from(schema.locales);
      expect(rows.find((r) => r.code === "en")?.enabled).toBe(false);
      expect((await availableLocales(rows)).map((r) => r.code)).toEqual(["ko"]);
      throw rollback;
    }),
  ).rejects.toBe(rollback);
});
it("exposes only enabled registered languages with complete deployed packs", async () => {
  const base = {
    nativeName: "test",
    direction: "ltr",
    fallbackCode: null,
    enabled: true,
    sortOrder: 0,
  };
  expect(
    (
      await availableLocales([
        { ...base, code: "fr" },
        { ...base, code: "en" },
        { ...base, code: "ko", enabled: false },
      ])
    ).map((e) => e.code),
  ).toEqual(["en"]);
});
it("returns published content, fallback metadata and original without exposing drafts", async () => {
  await expect(
    db.transaction(async (tx) => {
      await tx.update(schema.locales).set({ enabled: true });
      const registry = await tx.select().from(schema.locales);
      const actor = randomUUID(),
        key = randomUUID();
      await tx
        .insert(schema.users)
        .values({ id: actor, email: `${actor}@example.test`, name: "Fixture" });
      const original = {
        schemaVersion: 1 as const,
        resourceType: "partner" as const,
        name: "Original",
        description: "Original text",
      };
      const draft = { ...original, name: "SECRET DRAFT" };
      const translated = { ...original, name: "Published translation" };
      const row = {
        id: randomUUID(),
        resourceType: "partner",
        resourceKey: key,
        localeCode: "en",
        sourceRevision: 1,
        draft,
        updatedBy: actor,
      };
      await tx.insert(schema.localizedContents).values(row);
      const input = {
        resourceType: "partner" as const,
        resourceKey: key,
        requestedLocale: "en",
        originalLocale: "ko",
        original,
        registry,
      };
      let result = await publishedContent(input, tx);
      expect(result).toMatchObject({
        content: original,
        resolvedLocale: "ko",
        fallbackUsed: true,
      });
      await tx
        .insert(schema.localizedContents)
        .values({
          ...row,
          id: randomUUID(),
          localeCode: "ko",
          published: translated,
          publishedAt: new Date(),
        });
      result = await publishedContent(input, tx);
      expect(result).toMatchObject({
        content: translated,
        resolvedLocale: "ko",
        fallbackUsed: true,
      });
      await tx
        .update(schema.localizedContents)
        .set({ published: translated, publishedAt: new Date() })
        .where(eq(schema.localizedContents.id, row.id));
      result = await publishedContent(input, tx);
      expect(result).toMatchObject({
        content: translated,
        resolvedLocale: "en",
        fallbackUsed: false,
      });
      expect(JSON.stringify(result)).not.toContain("SECRET DRAFT");
      await expect(
        publishedContent({ ...input, requestedLocale: "xx" }, tx),
      ).rejects.toThrow();
      throw rollback;
    }),
  ).rejects.toBe(rollback);
});
