import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePage } from "@/lib/server/authorization/guards";
import { rawSession } from "@/lib/server/auth/http";
import { workspaceService } from "@/lib/server/projects/service";
import { ReviewService } from "@/lib/server/review/service";
import { readPack } from "@/lib/i18n/packs";
import { AppError } from "@/lib/server/errors/http";
import Content from "./page-content";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ snapshot?: string | string[] }> }) {
  await requirePage(); const { id } = await params, q = await searchParams;
  let initial, selected;
  try {
    const service = new ReviewService(workspaceService()), raw = await rawSession();
    initial = await service.get(raw, id); selected = q.snapshot ? typeof q.snapshot === "string" ? await service.snapshot(raw, id, q.snapshot) : notFound() : null;
  } catch (e) { if (e instanceof z.ZodError || e instanceof AppError && e.code === "NOT_FOUND") notFound(); throw e; }
  return <Content key={id} sessionId={id} initial={initial} initialSnapshot={selected} japanese={await readPack("ja", ["review"])} />;
}
