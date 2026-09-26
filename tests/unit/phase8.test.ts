import { it, expect } from "vitest";
import { aggregateVerdict } from "../../lib/contracts/verification";
import { exportRequest, MAX_EXPORT_BYTES } from "../../lib/contracts/exports";
import { createZip } from "../../lib/server/exports/zip";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
it("requires every rule to pass, including unknown and legacy results", () => {
  const r = (verdict: "pass" | "warn" | "reject" | "unknown" | "fail" | "review") => ({ ruleId: "r", verdict, reason: "Evidence" });
  expect(aggregateVerdict([])).toBe("unknown");
  expect(aggregateVerdict([r("pass")])).toBe("pass");
  for (const verdict of ["warn", "reject", "unknown", "fail", "review"] as const) expect(aggregateVerdict([r("pass"), r(verdict)])).not.toBe("pass");
});
it("rejects duplicate/empty/oversized exports and path-like entry names", () => {
  const base = { outputLocale: "ko", idempotencyKey: "key" };
  for (const assetIds of [[], ["a", "a"], Array.from({ length: 51 }, (_, i) => `a${i}`)]) expect(() => exportRequest.parse({ ...base, assetIds })).toThrow();
  expect(() => createZip([{ name: "../secret.png", bytes: Buffer.from("x") }])).toThrow();
  expect(() => createZip([{ name: "a.png", bytes: Buffer.alloc(MAX_EXPORT_BYTES + 1) }])).toThrow("ZIP_LIMIT");
});
it("produces a ZIP independently readable with matching contents and CRC", async () => {
  const dir = await mkdtemp(join(tmpdir(), "claps-zip-unit-"));
  try {
    const path = join(dir, "out.zip");
    await writeFile(path, createZip([{ name: "asset-a.png", bytes: Buffer.from("first") }, { name: "asset-b.webp", bytes: Buffer.from("second") }]));
    const output = execFileSync("python3", ["-c", "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.namelist()==['asset-a.png','asset-b.webp']; assert z.read('asset-a.png')==b'first'; assert z.read('asset-b.webp')==b'second'; print('ok')", path], { encoding: "utf8" });
    expect(output.trim()).toBe("ok");
  } finally { await rm(dir, { recursive: true }); }
});
