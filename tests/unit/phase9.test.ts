import { it, expect } from "vitest";
import { scoreMatches, tokens } from "../../lib/server/matching/engine";
import { matchingCriteriaSchema, saveCriteriaSchema } from "../../lib/contracts/matching";
const candidate = (id: string, words: string) => ({ id, version: 1, name: words, description: words, tags: words.split(" "), ipNames: [words], marketDescription: words });
const snapshot = (criteria: unknown, candidates = [candidate("a", "cute stationery"), candidate("b", "sport apparel")]) => ({ revision: 1, engineVersion: "rules-v1", criteria: matchingCriteriaSchema.parse(criteria), candidates });
it("normalizes exact Unicode tokens without inventing semantic similarities", () => {
  expect(tokens("ＣＵＴＥ cute, 귀여움 귀여움")).toEqual(["cute", "귀여움"]);
  const r = scoreMatches(snapshot({ styles: ["cut"] })); expect(r.results).toEqual([]);
});
it("ranks independently for A/B criteria with four evidenced factors", () => {
  for (const [word, id] of [["cute", "a"], ["sport", "b"]]) {
    const r = scoreMatches(snapshot({ ipName: word, styles: [word], licensee: word, industries: [word] }));
    expect(r.results[0]).toMatchObject({ partnerId: id, score: 100 });
    expect(r.results[0].factors).toHaveLength(4);
    expect(r.results[0].factors.every(f => f.matched[0] === word && f.total === 1 && f.score === 100)).toBe(true);
  }
});
it("uses equal active-factor weights and null for missing inputs", () => {
  const r = scoreMatches(snapshot({ ipName: "cute unknown", industries: ["stationery"] })).results[0];
  expect(r.score).toBe(75); expect(r.factors.map(f => f.score)).toEqual([50, null, null, 100]);
});
it("excludes zero evidence, limits output, resolves ties deterministically, meets CPU target", () => {
  const input = snapshot({ styles: ["cute"] }, Array.from({ length: 200 }, (_, n) => candidate(`partner-${String(n).padStart(3, "0")}`, "cute")));
  const start = performance.now(), output = scoreMatches(input);
  expect(performance.now() - start).toBeLessThan(1000);
  expect(output.results).toHaveLength(20); expect(output.results[0].partnerId).toBe("partner-000");
  expect(scoreMatches({ ...input, candidates: [...input.candidates].reverse() })).toEqual(output);
  expect(scoreMatches(snapshot({ styles: ["unrelated"] })).results).toEqual([]);
});
it("rejects empty score inputs, excessive or duplicate chips, injected storage and owner", () => {
  expect(() => scoreMatches(snapshot({ revenue: "cute", collaborationHistory: "cute" }))).toThrow();
  for (const criteria of [{ styles: ["cute", "CUTE"] }, { industries: Array(21).fill("x") }, { ipName: "x".repeat(501) }]) expect(matchingCriteriaSchema.safeParse(criteria).success).toBe(false);
  for (const extra of [{ ownerId: "other" }, { references: [{ storageKey: "secret" }] }]) expect(saveCriteriaSchema.safeParse({ revision: 0, criteria: {}, referenceIds: [], ...extra }).success).toBe(false);
});
