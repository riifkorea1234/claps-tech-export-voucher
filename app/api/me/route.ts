import { withApi, jsonResponse } from "@/lib/server/errors/http";
import { requireUser } from "@/lib/server/authorization/guards";
import { accountDto, authService } from "@/lib/server/auth/service";
import { assertOrigin, rawSession, clearSessionCookie } from "@/lib/server/auth/http";
import { profileSchema } from "@/lib/server/auth/policy";
import { readJson } from "@/lib/server/errors/validation";
import { z } from "zod";
export const GET = withApi(async (_request, ctx) => jsonResponse(accountDto(await requireUser(false)), ctx));
export const PATCH = withApi(async (request, ctx) => {
  assertOrigin(request);
  return jsonResponse(await authService().profile(await rawSession(), await readJson(request, profileSchema)), ctx);
});
export const DELETE = withApi(async (request, ctx) => {
  assertOrigin(request); await readJson(request, z.strictObject({}));
  const result = await authService().withdraw(await rawSession());
  await clearSessionCookie(); return jsonResponse(result, ctx);
});
