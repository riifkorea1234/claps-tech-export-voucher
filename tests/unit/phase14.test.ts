import { it, expect } from "vitest";
import { groupEvidence, mergeEvidence, evidenceTime, type EvidenceEvent } from "../../lib/evidence-view";
const event = (sequence: number, extra: Partial<EvidenceEvent> = {}): EvidenceEvent => ({ id: `event-${sequence}`, sessionId: "session", assetId: "asset", jobId: null, actorId: "owner", at: "2026-10-01T01:02:03.000Z", sequence, origin: "native", kind: "asset.adopted", payload: { schemaVersion: 1, kind: "asset.adopted", actorType: "user", assetVersion: sequence }, ...extra });
it("E02 folds only contiguous events, retaining full original sequence and time boundaries", () => {
 const items = [event(1), event(2), event(3), event(5), event(6)];
 const groups = groupEvidence(items); expect(groups.map(g => g.map(e => e.sequence))).toEqual([[1,2,3],[5,6]]); expect(groups.flat()).toEqual(items);
});
it("E02 keeps visual runs across distinct jobs/assets but respects sessions, roles and outcomes", () => {
 expect(groupEvidence([event(1), event(2, {jobId:"other",assetId:"other",actorId:null})])).toHaveLength(1);
 for (const changed of [ { sessionId: "other" }, { payload: { schemaVersion: 1, kind: "asset.adopted", actorType: "admin", assetVersion: 2 } }, { kind: "asset.unadopted", payload: { schemaVersion: 1, kind: "asset.unadopted", actorType: "user", assetVersion: 2 } }] as Partial<EvidenceEvent>[]) expect(groupEvidence([event(1), event(2, changed)])).toHaveLength(2);
});
it("E02 cursor page boundary extends only the same contiguous group and does not duplicate events", () => {
 const all = mergeEvidence([event(1), event(2)], { items: [event(2), event(3), event(4, { jobId: "batchB" })], nextCursor: null, history: "partial" });
 expect(all.map(e => e.sequence)).toEqual([1,2,3,4]); expect(groupEvidence(all).map(g => g.length)).toEqual([4]);
});
it("L01 evidence timestamp preserves seconds and explicitly uses Seoul consistently across locales", () => {
 for (const locale of ["ko","en","ja"]) expect(evidenceTime("2026-10-01T01:02:03.000Z", locale)).toContain("10:02:03");
});
