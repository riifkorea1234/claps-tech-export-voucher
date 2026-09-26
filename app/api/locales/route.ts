import { availableLocales } from "@/lib/i18n/server";
import { jsonResponse, withApi } from "@/lib/server/errors/http";
export const GET = withApi(async (_request, context) =>
  jsonResponse(await availableLocales(), context),
);
