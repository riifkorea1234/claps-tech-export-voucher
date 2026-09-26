import { expect, it } from "vitest";
import { passwordSchema, SESSION_SECONDS } from "../../lib/server/auth/policy";
import { assertOrigin } from "../../lib/server/auth/http";
import { sandboxMail } from "../../lib/server/mail/sandbox";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
it("enforces the approved password and session boundaries", () => {
  expect(passwordSchema.safeParse("1234567").success).toBe(false); expect(passwordSchema.safeParse("12345678").success).toBe(true);
  expect(passwordSchema.safeParse("x".repeat(128)).success).toBe(true); expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
  expect(SESSION_SECONDS).toBe(604800);
});
it("fails closed for unconfigured and mismatched mutation origins", () => {
  const before = process.env.APP_ORIGIN;
  try {
    delete process.env.APP_ORIGIN; expect(() => assertOrigin(new Request("http://localhost/api/auth/sign-up"))).toThrow();
    process.env.APP_ORIGIN = "https://claps.example";
    expect(() => assertOrigin(new Request("https://claps.example/api", { headers: { Origin: "https://evil.example" } }))).toThrow();
    expect(() => assertOrigin(new Request("https://claps.example/api", { headers: { Origin: "https://claps.example", "Sec-Fetch-Site": "cross-site" } }))).toThrow();
    expect(() => assertOrigin(new Request("https://claps.example/api", { headers: { Origin: "https://claps.example" } }))).not.toThrow();
  } finally { if (before === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before; }
});
it("sandbox requires explicit opt-in, writes localized private files and rejects web-public paths", async () => {
  const adapter = process.env.MAIL_ADAPTER, directory = process.env.MAIL_SANDBOX_DIR;
  const root = await mkdtemp(path.join(tmpdir(), "claps-mail-test-"));
  const m = { to: "fixture@example.test", kind: "verify" as const, locale: "en", url: "http://localhost/verify-email?token=synthetic" };
  try {
    delete process.env.MAIL_ADAPTER; await expect(sandboxMail(m)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    process.env.MAIL_ADAPTER = "sandbox"; process.env.MAIL_SANDBOX_DIR = root;
    await sandboxMail(m); const file = path.join(root, (await readdir(root))[0]);
    expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({ subject: "Verify your CLAPS email" }); expect((await stat(file)).mode & 0o777).toBe(0o600);
    process.env.MAIL_SANDBOX_DIR = path.resolve("public"); await expect(sandboxMail(m)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  } finally {
    if (adapter === undefined) delete process.env.MAIL_ADAPTER; else process.env.MAIL_ADAPTER = adapter;
    if (directory === undefined) delete process.env.MAIL_SANDBOX_DIR; else process.env.MAIL_SANDBOX_DIR = directory;
    await rm(root, { recursive: true });
  }
});
