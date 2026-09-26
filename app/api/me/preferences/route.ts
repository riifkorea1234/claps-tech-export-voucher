import { z } from "zod";
import { withApi, jsonResponse, AppError } from "@/lib/server/errors/http";
import { readJson } from "@/lib/server/errors/validation";
import { assertOrigin, rawSession, localeCookie } from "@/lib/server/auth/http";
import { authService } from "@/lib/server/auth/service";
import { availableLocales } from "@/lib/i18n/server";
export const PATCH = withApi(async (request, ctx) => {
  assertOrigin(request);
  const { locale } = await readJson(request, z.strictObject({ locale: z.string().max(64) }));
  if (!(await availableLocales()).some(l => l.code === locale)) throw new AppError("VALIDATION_ERROR");
  const result = await authService().preferences(await rawSession(), locale);
  await localeCookie(locale); return jsonResponse(result, ctx);
});
