"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { useLanguage, useT } from "@/lib/i18n/provider";
import { evidenceTime, groupEvidence, type EvidenceEvent } from "@/lib/evidence-view";
import { Button } from "@/components/ui/button";
import type { EvidenceResource } from "./evidence-data";
function Entry({ event }: { event: EvidenceEvent }) {
  const t = useT(), { locale } = useLanguage(), p = event.payload;
  return <div data-testid="evidence-event" data-sequence={event.sequence} className="space-y-1 break-words py-2 text-sm">
    <p><strong>{t(`evidence.event.${event.kind}`)}</strong> · #{event.sequence}</p>
    <p><time dateTime={event.at}>{evidenceTime(event.at, locale)}</time> · {t(`evidence.actor.${p.actorType}`)}</p>
    {event.assetId && <Link className="underline print:no-underline" href={`/assets/${event.sessionId}/evidence?asset=${event.assetId}`}>{t("evidence.assetShort", { id: event.assetId })}</Link>}
    {p.kind === "generate.succeeded" && <p>{t("evidence.condCandidates", { n: p.resultCount })}</p>}
    {(p.kind === "generate.failed" || p.kind === "generate.canceled") && <p>{t(`common.jobs.error.${p.errorCode}`)}</p>}
    {"guide" in p && p.guide && <p>{t("evidence.condGuide")}: {p.guide.id} / v{p.guide.version} / {p.guide.checksum}</p>}
    {p.kind === "verify.run" && <><p>{t(`assets.verification.${p.verification.verdict}`)} · {t("evidence.ruleCount", { n: "ruleCount" in p.verification ? p.verification.ruleCount : p.verification.ruleResults.length })}</p><p>{t("evidence.verifySummary")}</p>{event.jobId && <Link className="underline" href={`/jobs/${event.jobId}`}>{t("evidence.jobReference", { id: event.jobId })}</Link>}</>}
    {event.jobId && p.kind !== "verify.run" && <p>{t("evidence.jobReference", { id: event.jobId })}</p>}
  </div>;
}
export function EvidenceTimeline({ resource, printDocument = false }: { resource: EvidenceResource; printDocument?: boolean }) {
  const t = useT(), { locale } = useLanguage(), id = useId();
  const [open, setOpen] = useState(printDocument), [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = groupEvidence(resource.items);
  return <section data-testid="evidence-timeline" className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{t("evidence.timeline")}</h2>{!printDocument && <Button variant="outline" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{t(`evidence.${open ? "hide" : "show"}`)}</Button>}</div>
    <p className="text-sm text-muted-foreground">{t("evidence.timelineDesc")}</p>
    {resource.history && <p>{t(`evidence.history.${resource.history}`)}</p>}
    {resource.error && <p role="alert">{t("evidence.readError")}</p>}
    {open && <div id={id}>
      {!resource.pending && !resource.error && !resource.items.length && <p>{t("evidence.empty")}</p>}
      <ol className="divide-y">{groups.map(group => {
        const first = group[0], last = group.at(-1)!, show = expanded.has(first.id);
        const summary = `${t(`evidence.event.${first.kind}`)} · ${t("evidence.groupCount", { n: group.length })} · #${first.sequence}–${last.sequence}`;
        const references = t("evidence.groupReferences", { jobs: new Set(group.map(e => e.jobId).filter(Boolean)).size, assets: new Set(group.map(e => e.assetId).filter(Boolean)).size });
        return <li key={first.id} data-testid="evidence-group" className="min-w-0 break-words py-2">
          {group.length > 1 ? <><Button className="h-auto max-w-full whitespace-normal text-left print:hidden" variant="outline" aria-expanded={show} aria-controls={`${id}-${first.id}`} onClick={() => setExpanded(old => { const next = new Set(old); if (next.has(first.id)) next.delete(first.id); else next.add(first.id); return next; })}>{summary} · {t(show ? "evidence.collapseGroup" : "evidence.expandGroup")}</Button><p className="hidden print:block">{summary}</p><p>{references}</p><p className="text-xs">{evidenceTime(first.at, locale)} – {evidenceTime(last.at, locale)}</p><ol id={`${id}-${first.id}`} className={show ? "" : "hidden print:block"}>{group.map(event => <li key={event.id}><Entry event={event} /></li>)}</ol></> : <Entry event={first} />}
        </li>;
      })}</ol>
      {resource.history && <p>{t("evidence.loaded", { n: resource.items.length })} · {t(resource.nextCursor ? "evidence.moreRemaining" : "evidence.endLoaded")}</p>}
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">{resource.nextCursor && <Button className="h-auto max-w-full whitespace-normal break-words" disabled={resource.pending} onClick={() => void resource.loadMore()}>{t(resource.pending ? "common.loading" : "evidence.loadMore")}</Button>}{resource.error && resource.nextCursor && <Button onClick={() => void resource.loadMore()}>{t("common.retry")}</Button>}<Button className="h-auto max-w-full whitespace-normal break-words" disabled={resource.pending} variant="outline" onClick={resource.reload}>{t("evidence.refresh")}</Button></div>
    </div>}
  </section>;
}
