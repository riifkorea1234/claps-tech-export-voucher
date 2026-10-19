import type { z } from "zod";
import type { evidenceEventSchema, evidencePageSchema } from "./contracts/evidence";
export type EvidenceEvent = z.infer<typeof evidenceEventSchema>;
export type EvidencePage = z.infer<typeof evidencePageSchema>;
// Visual same-kind runs; individual references and certificate batches remain independent.
export function groupEvidence(items: EvidenceEvent[]): EvidenceEvent[][] {
  const groups: EvidenceEvent[][] = [];
  for (const item of items) {
    const group = groups.at(-1), last = group?.at(-1);
    if (last && item.sequence === last.sequence + 1 && item.sessionId === last.sessionId && item.kind === last.kind && item.payload.actorType === last.payload.actorType) group!.push(item);
    else groups.push([item]);
  }
  return groups;
}
export function mergeEvidence(items: EvidenceEvent[], page: EvidencePage): EvidenceEvent[] {
  const known = new Set(items.map(item => item.id));
  return [...items, ...page.items.filter(item => !known.has(item.id))].sort((a, b) => a.sequence - b.sequence);
}
export function evidenceTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}
