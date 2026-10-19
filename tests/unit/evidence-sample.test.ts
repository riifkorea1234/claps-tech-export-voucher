import { afterEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import sharp from "sharp";
import { authorizeEvidence, evidenceEmail, sampleImage, sampleRules } from "../../lib/server/evidence-sample/handlers";
afterEach(() => vi.unstubAllEnvs());
describe("explicit evidence sample boundary", () => {
  it("accepts exactly ten reserved evidence identities", () => {
    for (let i = 1; i <= 10; i++) expect(evidenceEmail(`evidence.v1.${String(i).padStart(2, "0")}@example.com`)).toBe(true);
    for (const email of ["admin@claps.arcreation.work", "evidence.v1.11@example.com", "evidence.v1.01@example.com.attacker.org", "evidence.v1.00@example.com"]) expect(evidenceEmail(email)).toBe(false);
  });
  it("requires both explicit mode and an authorized owner", async () => {
    const client = (email: string) => ({ query: vi.fn().mockResolvedValue({ rows: [{ email }] }) }) as unknown as PoolClient;
    vi.stubEnv("EVIDENCE_SAMPLE_MODE", "");
    await expect(authorizeEvidence(client("evidence.v1.01@example.com"), "owner")).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    vi.stubEnv("EVIDENCE_SAMPLE_MODE", "claps-evidence-v1");
    await expect(authorizeEvidence(client("admin@claps.arcreation.work"), "owner")).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    await expect(authorizeEvidence(client("evidence.v1.01@example.com"), "owner")).resolves.toBeUndefined();
  });
  it("creates real decodable, distinct synthetic PNGs and explicit sample rules", async () => {
    const first = await sampleImage(0), second = await sampleImage(1);
    expect(first.equals(second)).toBe(false);
    expect(await sharp(first).metadata()).toMatchObject({ format: "png", width: 768, height: 768 });
    expect(sampleRules().rules.every(r => r.title.startsWith("SAMPLE:"))).toBe(true);
  });
});
