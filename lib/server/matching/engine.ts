import { matchingSnapshotSchema, matchingOutputSchema, factorCodes } from "../../contracts/matching-data";
import type { z } from "zod";
export function tokens(text: string): string[] {
  return [...new Set(text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].sort();
}
export function scoreMatches(raw: unknown): z.infer<typeof matchingOutputSchema> {
  const snapshot = matchingSnapshotSchema.parse(raw), c = snapshot.criteria;
  const inputs = [tokens(`${c.ipName} ${c.category}`), tokens(`${c.worldView} ${c.styles.join(" ")}`), tokens(c.licensee), tokens(c.industries.join(" "))];
  if (!inputs.some(x => x.length)) throw new Error("EMPTY_MATCHING_CRITERIA");
  const results = snapshot.candidates.map(p => {
    const targets = [`${p.name} ${p.ipNames.join(" ")} ${p.tags.join(" ")}`, `${p.description} ${p.tags.join(" ")}`, `${p.description} ${p.marketDescription} ${p.tags.join(" ")}`, `${p.tags.join(" ")} ${p.marketDescription}`].map(t => new Set(tokens(t)));
    const factors = factorCodes.map((code, i) => {
      const matched = inputs[i].filter(t => targets[i].has(t));
      return { code, score: inputs[i].length ? Math.round(matched.length / inputs[i].length * 100) : null, matched, total: inputs[i].length };
    });
    const rated = factors.filter(f => f.score !== null);
    return { partnerId: p.id, partnerVersion: p.version, score: Math.round(rated.reduce((n, f) => n + f.score!, 0) / rated.length), factors };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score || a.partnerId.localeCompare(b.partnerId)).slice(0, 20);
  return matchingOutputSchema.parse({ engineVersion: snapshot.engineVersion, results });
}
