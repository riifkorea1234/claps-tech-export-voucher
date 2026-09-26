import { expect, it } from "vitest";
import { getAuthTables } from "better-auth/db";
import { getTableColumns } from "drizzle-orm";
import { authSchema } from "../../db/schema";
it("maps all pinned Better Auth core fields to compatible Drizzle columns", () => {
  const expected = getAuthTables({ emailAndPassword: { enabled: true } });
  expect(Object.keys(expected).sort()).toEqual(Object.keys(authSchema).sort());
  for (const model of Object.keys(authSchema) as (keyof typeof authSchema)[]) {
    const columns = getTableColumns(authSchema[model]);
    expect(columns.id.dataType).toBe("string");
    for (const [key, field] of Object.entries(expected[model].fields)) {
      expect(columns, `${model}.${key}`).toHaveProperty(key);
      const column = columns[key as keyof typeof columns];
      if (field.type === "string") expect(column.dataType).toBe("string");
      if (field.type === "boolean") expect(column.dataType).toBe("boolean");
      if (field.type === "date") expect(column.dataType).toBe("date");
      if (field.required) expect(column.notNull).toBe(true);
    }
  }
});
