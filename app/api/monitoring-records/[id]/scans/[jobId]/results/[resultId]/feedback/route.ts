import { z } from "zod";
import { assertOrigin, rawSession } from "@/lib/server/auth/http";
import { withApi, jsonResponse } from "@/lib/server/errors/http";
import { readJson } from "@/lib/server/errors/validation";
import { workspaceService } from "@/lib/server/projects/service";
import { jobService } from "@/lib/server/jobs/runtime";
import { MonitoringService } from "@/lib/server/monitoring/service";
import { MonitoringFeedbackService } from "@/lib/server/monitoring/feedback";
const handler = withApi(async (request, context) => {
  const [, , id, , jobId, , resultId] = new URL(request.url).pathname.split("/").filter(Boolean);
  const service = new MonitoringFeedbackService(new MonitoringService(workspaceService(), jobService()));
  const result = await service.monitoring.workspace.run(await rawSession(), async (client, owner) => {
    // Authenticate first; origin and query checks precede bounded body consumption.
    assertOrigin(request);
    z.strictObject({}).parse(Object.fromEntries(new URL(request.url).searchParams));
    return service.writeLocked(client, owner, id, jobId, resultId, request.method === "POST" ? "reported" : "withdrawn", await readJson(request, z.unknown()));
  });
  return jsonResponse(result, context);
});
export { handler as POST, handler as DELETE };

const unsupported = (request: Request) => new Response(request.method === "HEAD" ? null : "Method Not Allowed", {
  status: 405, headers: { Allow: "POST, DELETE", "Cache-Control": "private, no-store" },
});
export { unsupported as GET, unsupported as HEAD, unsupported as PUT, unsupported as PATCH, unsupported as OPTIONS };
