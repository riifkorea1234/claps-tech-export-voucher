import { z } from "zod";
import { localeCodeSchema } from "@/lib/contracts/common";
import { normalizeInput, normalizeKana } from "@/lib/normalize-input";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_COOKIE = "claps-session";
export const emailSchema = z.string().trim().toLowerCase().email().max(320);
export const passwordSchema = z.string().min(8).max(128);
const nameField = z.string().transform(normalizeInput).pipe(z.string().max(100));
const kanaField = z.string().transform(normalizeKana).pipe(z.string().max(100));
export const profileSchema = z.strictObject({
  name: nameField, org: z.string().transform(normalizeInput).pipe(z.string().min(1).max(200)),
  role: z.enum(["marketing", "design", "merchandising", "licensing", "management", "other"]).optional(),
  locale: localeCodeSchema.optional(),
  familyName: nameField.nullable().optional(), givenName: nameField.nullable().optional(),
  familyNameKana: kanaField.nullable().optional(), givenNameKana: kanaField.nullable().optional(),
});
// The server chooses/validates effective locale before enforcing this contract.
export function validateProfile(data: z.infer<typeof profileSchema>, locale: string) {
  const schema = profileSchema.superRefine((v, ctx) => {
    if (locale.split("-")[0] === "ja") {
      for (const field of ["familyName", "givenName"] as const) {
        if (!v[field]) ctx.addIssue({ code: "custom", path: [field], message: "Required name" });
      }
      if (`${v.familyName ?? ""} ${v.givenName ?? ""}`.length > 100) {
        for (const field of ["familyName", "givenName"] as const)
          ctx.addIssue({ code: "custom", path: [field], message: "Combined name too long" });
      }
    } else if (!v.name) ctx.addIssue({ code: "custom", path: ["name"], message: "Required name" });
  });
  return schema.parse(data);
}
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
