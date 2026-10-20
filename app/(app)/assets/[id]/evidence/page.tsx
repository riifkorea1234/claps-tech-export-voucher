import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePage } from "@/lib/server/authorization/guards";
import { rawSession } from "@/lib/server/auth/http";
import { workspaceService } from "@/lib/server/projects/service";
import { evidenceSession } from "@/lib/server/evidence/service";
import { AppError } from "@/lib/server/errors/http";
import Content from "./page-content";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ asset?: string | string[] }> }) {
  await requirePage(); const { id } = await params, query = await searchParams;
  let assets: { id: string; createdAt: string; deleted: boolean }[], metadataOnly = false;
  try {
    const ws = workspaceService(), raw = await rawSession();
    // Only identifiers cross the boundary; files/capabilities and prompts never do.
    ({ assets, metadataOnly } = await ws.run(raw, async (c, owner) => {
      const session = await evidenceSession(c, owner, id);
      const assets = (await c.query("SELECT a.id,a.created_at,a.deleted_at FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE s.id=$1 AND s.owner_id=$2 ORDER BY a.created_at,a.id", [id, owner])).rows.map(a => ({ id: a.id as string, createdAt: a.created_at.toISOString(), deleted: !!a.deleted_at }));
      return { assets, metadataOnly: !!(session.archived_at || session.project_archived_at) };
    }));
    if (query.asset && (typeof query.asset !== "string" || !assets.some(a => a.id === query.asset))) notFound();
  } catch (error) { if (error instanceof z.ZodError || error instanceof AppError && error.code === "NOT_FOUND") notFound(); throw error; }
  return <Content key={id} sessionId={id} assets={assets} metadataOnly={metadataOnly} initialAsset={typeof query.asset === "string" && query.asset ? query.asset : assets[0]?.id || ""} />;
}
