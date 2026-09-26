import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth/session";
import { AdminConsole } from "@/components/admin/console";
export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.app_role !== "admin" || user.status !== "active") notFound();
  const { path = [] } = await params;
  if (path.length > 2 || path[0] && !["users", "projects", "partners", "jobs", "guides", "monitoring"].includes(path[0])) notFound();
  return <AdminConsole key={path.join("/")} section={path[0] ?? "overview"} id={path[1]} />;
}
