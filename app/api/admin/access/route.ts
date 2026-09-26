import { withApi, jsonResponse } from "@/lib/server/errors/http";
import { adminServices } from "@/lib/server/admin/runtime";
import { rawSession } from "@/lib/server/auth/http";
export const GET = withApi(async (_request, context) => jsonResponse(await adminServices(context.requestId).access.run(await rawSession(), async () => ({ allowed: true })), context));
