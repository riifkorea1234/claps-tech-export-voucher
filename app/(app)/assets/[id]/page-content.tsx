import { ownedPage } from "@/lib/server/projects/page";
import { AssetWorkspaceBody } from "@/components/domain/asset-workspace-body";
import { WorkspaceTopBar } from "@/components/domain/workspace-topbar";
export default async function Content({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; fromLabel?: string }> }) {
  const { id } = await params, back = await searchParams;
  const session = await ownedPage("session", id);
  return <div className="flex flex-col gap-5 px-6 py-7"><WorkspaceTopBar title={"title" in session ? session.title : ""} activeStep={1} sessionId={id} from={back.from} fromLabel={back.fromLabel} /><div className="rounded-xl border bg-card p-6"><AssetWorkspaceBody key={id} sessionId={id} step={1} /></div></div>;
}
