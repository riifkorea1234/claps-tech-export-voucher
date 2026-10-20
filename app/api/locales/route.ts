import { availableLocales } from "@/lib/i18n/server";
import { AppError, jsonResponse, withApi } from "@/lib/server/errors/http";
import { currentUser } from "@/lib/server/auth/session";
export const GET = withApi(async (request, context) => {
  const scope = new URL(request.url).searchParams.get("scope") === "admin" ? "admin" : "public";
  if (scope === "admin") {
    const user = await currentUser();
    if (!user || user.app_role !== "admin" || user.status !== "active") throw new AppError("FORBIDDEN");
  }
  return jsonResponse(await availableLocales(undefined, scope), context);
});
