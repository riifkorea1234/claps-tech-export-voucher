import { getDatabase } from "@/lib/server/db";
import { AppError, jsonResponse, withApi } from "@/lib/server/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = withApi(async (_request, context) => {
  try {
    const { pool } = getDatabase();
    // Readiness includes the initial migration, not just an open TCP connection.
    await pool.query("SELECT code FROM locales LIMIT 1");
  } catch { throw new AppError("SERVICE_UNAVAILABLE"); }
  return jsonResponse({ status: "ok" }, context);
});
