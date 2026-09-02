import { AssetWorkspaceBody } from "@/components/domain/asset-workspace-body";
import { WorkspaceTopBar } from "@/components/domain/workspace-topbar";
import { findSession } from "@/lib/mock/assets";

export default async function AssetWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; fromLabel?: string; title?: string }>;
}) {
  const { id } = await params;
  const { from, fromLabel, title: titleParam } = await searchParams;
  const title = titleParam ?? findSession(id)?.title ?? "제목 없음";

  return (
    <div className="flex flex-col gap-5 px-8 py-7">
      <WorkspaceTopBar
        title={title}
        activeStep={1}
        sessionId={id}
        from={from}
        fromLabel={fromLabel}
      />

      <div className="rounded-[14px] border border-border bg-card p-6">
        <AssetWorkspaceBody key={id} sessionId={id} title={title} />
      </div>
    </div>
  );
}
