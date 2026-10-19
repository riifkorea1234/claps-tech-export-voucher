"use client";
import { useT } from "@/lib/i18n/provider";
import type { EvidenceResource } from "./evidence-data";
import { Button } from "@/components/ui/button";
export function EvidenceBadge({ resource }: { resource: EvidenceResource }) {
  const t = useT();
  const partial = !!resource.error && !!resource.items.length && !!resource.nextCursor;
  const key = partial ? "readPartialError" : resource.error ? "readError" : resource.pending ? "reading" : "readSuccess";
  return <div data-testid="evidence-badge" role={resource.error ? "alert" : "status"} className="space-y-1 rounded-lg border bg-muted p-3 text-sm">
    <p>{t(`evidence.${key}`, { n: resource.items.length })}</p>
    {!resource.error && !resource.pending && <p>{t(`evidence.history.${resource.history ?? "unrecorded"}`)} · {t("evidence.loaded", { n: resource.items.length })}</p>}
    <p className="text-xs text-muted-foreground">{t("evidence.recordingHint")}</p>
    {resource.error && <Button variant="outline" onClick={partial ? () => void resource.loadMore() : resource.reload}>{t("common.retry")}</Button>}
  </div>;
}
