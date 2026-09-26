import "server-only";
import { z } from "zod";
import { notFound } from "next/navigation";
import { rawSession } from "../auth/http";
import { workspaceService } from "./service";
import { AppError } from "../errors/http";
export async function ownedPage(kind: "project" | "session", id: string) {
  try { const s = workspaceService(), raw = await rawSession(); return kind === "project" ? await s.getProject(raw, id) : await s.getSession(raw, id); }
  catch (e) { if (e instanceof z.ZodError || (e instanceof AppError && e.code === "NOT_FOUND")) notFound(); throw e; }
}
