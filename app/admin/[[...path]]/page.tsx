import { Suspense } from "react";
import { getDatabase } from "@/lib/server/db";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth/session";
import { AdminConsole } from "@/components/admin/console";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const user = await currentUser();
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent(`/admin${path.length ? `/${path.join("/")}` : ""}`)}`,
    );
  if (user.app_role !== "admin" || user.status !== "active") notFound();
  if (
    path.length > 2 ||
    (path[0] &&
      ![
        "users",
        "projects",
        "partners",
        "jobs",
        "guides",
        "monitoring",
        "audit-logs",
        "locales",
      ].includes(path[0]))
  )
    notFound();
  if (path[0] === "guides") {
    if (!path[1]) redirect("/admin/projects");
    const row = (
      await getDatabase().pool.query(
        "SELECT project_id FROM brand_guides WHERE id=$1",
        [path[1]],
      )
    ).rows[0];
    if (!row) notFound();
    redirect(`/admin/projects/${row.project_id}?tab=guides`);
  }
  if (["audit-logs", "locales"].includes(path[0]) && path[1]) notFound();
  return (
    <Suspense>
      <AdminConsole
        key={path.join("/")}
        section={path[0] ?? "overview"}
        id={path[1]}
        actor={user.name}
      />
    </Suspense>
  );
}
