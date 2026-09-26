import "server-only";
import { redirect } from "next/navigation";
import { authService, type AuthUser } from "@/lib/server/auth/service";
import { currentUser } from "@/lib/server/auth/session";
import { AppError } from "@/lib/server/errors/http";
export async function requireUser(active = true) {
  const u = await currentUser();
  if (!u) throw new AppError("UNAUTHORIZED");
  if (active && u.status !== "active") throw new AppError("FORBIDDEN");
  return u;
}
export async function requirePage(active = true) {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (active && u.status !== "active") redirect("/profile-setup");
  return u;
}
export function assertAdmin(user: AuthUser | null) {
  if (!user) throw new AppError("UNAUTHORIZED");
  if (user.status !== "active" || user.app_role !== "admin") throw new AppError("FORBIDDEN");
  // A role-only call cannot establish session-bound reauthentication.
  // Web administration uses AdminAccess.run, which validates the DB session.
  throw new AppError("FORBIDDEN");
}
const ownership = {
  project: "SELECT 1 FROM projects WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL",
  session: "SELECT 1 FROM asset_sessions s WHERE s.id=$1 AND s.owner_id=$2 AND s.archived_at IS NULL AND (s.project_id IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=s.project_id AND p.archived_at IS NULL))",
  job: "SELECT 1 FROM jobs WHERE id=$1 AND owner_id=$2",
  monitoring: "SELECT 1 FROM monitoring_records WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL",
  asset: "SELECT 1 FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE a.id=$1 AND s.owner_id=$2 AND a.deleted_at IS NULL AND s.archived_at IS NULL AND (s.project_id IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=s.project_id AND p.archived_at IS NULL))",
  guide: "SELECT 1 FROM brand_guides g JOIN projects p ON p.id=g.project_id WHERE g.id=$1 AND p.owner_id=$2 AND p.archived_at IS NULL",
} as const;
// File handlers must resolve the parent resource and call this guard before opening storage.
export async function requireOwned(kind: keyof typeof ownership, id: string, raw: string | undefined, service = authService()) {
  return service.authenticated(raw, async (c, u) => {
    if (u.status !== "active") throw new AppError("FORBIDDEN");
    const result = await c.query(ownership[kind], [id, u.id]);
    if (!result.rowCount) throw new AppError("NOT_FOUND");
    return u;
  });
}
