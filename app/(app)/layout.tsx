import { requirePage } from "@/lib/server/authorization/guards";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePage();
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader isAdmin={user.app_role === "admin" && user.status === "active"} />
        <main className="min-w-0 flex-1">
          {/* 큰 화면에서 작업 영역이 과하게 늘어나지 않도록 최대폭 제한 */}
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
