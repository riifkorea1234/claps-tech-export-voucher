import { z } from "zod";
import { idSchema, localeCodeSchema } from "./common";
export const accountSchema = z.strictObject({
  id: idSchema, email: z.email().max(320), name: z.string().max(100), org: z.string().max(200),
  role: z.enum(["marketing", "design", "merchandising", "licensing", "management", "other"]).optional(),
  status: z.enum(["email_unverified", "profile_pending", "active", "suspended", "withdrawal_pending"]),
  locale: localeCodeSchema.optional(),
  familyName: z.string().max(100).nullable(), givenName: z.string().max(100).nullable(),
  familyNameKana: z.string().max(100).nullable(), givenNameKana: z.string().max(100).nullable(),
});
export type Account = z.infer<typeof accountSchema>;
