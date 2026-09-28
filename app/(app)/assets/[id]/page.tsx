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
  // 빈 제목은 화면 부품이 사전에서 채운다 (서버 부품이라 사전을 직접 못 씀)
  const title = titleParam ?? findSession(id)?.title ?? "";

  return (
    <div className="flex flex-col gap-5 px-[var(--pad-page-x)] py-[var(--pad-page-y)]">
      <WorkspaceTopBar
        title={title}
        activeStep={1}
        sessionId={id}
        from={from}
        fromLabel={fromLabel}
      />

      <div className="rounded-[14px] border border-border bg-card p-[var(--pad-card)]">
        <AssetWorkspaceBody key={id} sessionId={id} title={title} />
      </div>
    </div>
  );
}
