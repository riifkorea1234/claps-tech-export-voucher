import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";
import { loadEnvConfig } from "@next/env";
import { AuthService, digest } from "../../lib/server/auth/service";
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { assertAdmin, requireOwned } from "../../lib/server/authorization/guards";
import type { Mail } from "../../lib/server/mail/sandbox";
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { pool } = createDatabase(getTestDatabaseUrl(), 6);
const mail: Mail[] = [], emails: string[] = [], rateKeys: string[] = [];
const service = new AuthService(pool, async m => { mail.push(m); }, "http://localhost:3000");
const password = "eight888";
const email = () => { const e = `${randomUUID()}@example.test`; emails.push(e); return e; };
const token = (e: string, kind: string) => new URL(mail.filter(m => m.to === e && m.kind === kind).at(-1)!.url).searchParams.get("token")!;
async function register(e = email(), locale = "ko") { await service.signup({ email: e, password, locale }); return e; }
async function verified(input?: string) {
  const e = input ?? await register();
  const r = await service.consume(token(e, "verify"), "verify");
  if (!("token" in r)) throw new Error("Expected session");
  return { ...r, email: e };
}
async function active() { const s = await verified(); await service.profile(s.token, { name: "Fixture", org: "Test", role: "design" }); return s; }
beforeAll(() => migrateDatabase(pool));
afterAll(async () => {
  await pool.query("DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email=ANY($1))", [emails]);
  await pool.query("DELETE FROM admin_audit_logs WHERE entity_id IN (SELECT id FROM users WHERE email=ANY($1))", [emails]);
  await pool.query("DELETE FROM auth_verifications WHERE identifier IN (SELECT 'verify:'||id FROM users WHERE email=ANY($1) UNION SELECT 'reset:'||id FROM users WHERE email=ANY($1))", [emails]);
  for (const table of ["auth_sessions", "auth_accounts"]) await pool.query(`DELETE FROM ${table} WHERE user_id IN (SELECT id FROM users WHERE email=ANY($1))`, [emails]);
  await pool.query("DELETE FROM users WHERE email=ANY($1)", [emails]);
  await pool.query("DELETE FROM auth_rate_limits WHERE key=ANY($1)", [rateKeys]);
  await pool.end();
});
it("accepts exactly 8..128 chars, normalizes email and stores a hash rather than a password", async () => {
  const e = email();
  await expect(service.signup({ email: e, password: "1234567", locale: "ko" })).rejects.toThrow();
  await expect(service.signup({ email: e, password: "a".repeat(129), locale: "ko" })).rejects.toThrow();
  await service.signup({ email: ` ${e.toUpperCase()} `, password, locale: "en" });
  const { rows } = await pool.query("SELECT a.password,u.app_role,u.status FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE u.email=$1", [e]);
  expect(rows[0].password).not.toBe(password); expect(rows[0].password).toContain(":");
  expect(rows[0]).toMatchObject({ app_role: "member", status: "email_unverified" });
  expect(mail.at(-1)?.locale).toBe("en");
  const max = email(); await service.signup({ email: max, password: "a".repeat(128), locale: "ko" });
});
it("lookup is not authentication, simultaneous duplicate signup preserves the original credential", async () => {
  const e = email(); expect(await service.lookup(e)).toEqual({ nextStep: "sign-up" });
  const results = await Promise.allSettled([service.signup({ email: e, password, locale: "ko" }), service.signup({ email: e, password, locale: "en" })]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(await service.lookup(e)).toEqual({ nextStep: "sign-in" });
  expect((await pool.query("SELECT count(*)::int AS n FROM users WHERE email=$1", [e])).rows[0].n).toBe(1);
  await expect(service.signup({ email: e, password: "replacement", locale: "ko" })).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  await verified(e); await expect(service.login({ email: e, password, locale: "ko" })).resolves.toHaveProperty("token");
  await expect(service.login({ email: e, password: "replacement", locale: "ko" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
it("blocks wrong passwords and unverified login; verification is single-use even concurrently", async () => {
  const e = await register();
  await expect(service.login({ email: e, password, locale: "ko" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(service.login({ email: e, password: "wrong888", locale: "ko" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  const raw = token(e, "verify");
  expect((await pool.query("SELECT value FROM auth_verifications WHERE value=$1", [raw])).rowCount).toBe(0);
  const results = await Promise.allSettled([service.consume(raw, "verify"), service.consume(raw, "verify")]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  await expect(service.consume(raw, "verify")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
});
it("expires verification tokens and supersedes old links on resend", async () => {
  const e = await register(); const old = token(e, "verify");
  await pool.query("UPDATE auth_verifications SET expires_at=now()-interval '1 second' WHERE value=$1", [digest(old)]);
  await expect(service.consume(old, "verify")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  await service.sendLink(e, "verify", "ko"); const replacement = token(e, "verify"); expect(replacement).not.toBe(old);
  await expect(service.consume(old, "verify")).rejects.toThrow(); await verified(e);
});
it("reset consumes token once, rejects expired links, revokes all old sessions and preserves profile", async () => {
  const a = await active(); const b = await service.login({ email: a.email, password, locale: "en" });
  await service.sendLink(a.email, "reset", "en"); const expired = token(a.email, "reset");
  await pool.query("UPDATE auth_verifications SET expires_at=now()-interval '1 second' WHERE value=$1", [digest(expired)]);
  await expect(service.consume(expired, "reset", "newpass8")).rejects.toThrow();
  await service.sendLink(a.email, "reset", "en"); const raw = token(a.email, "reset");
  await service.consume(raw, "reset", "newpass8");
  expect(await service.session(a.token)).toBeNull(); expect(await service.session(b.token)).toBeNull();
  await expect(service.consume(raw, "reset", password)).rejects.toThrow();
  await expect(service.login({ email: a.email, password, locale: "ko" })).rejects.toThrow();
  const login = await service.login({ email: a.email, password: "newpass8", locale: "en" }); expect(login.user.name).toBe("Fixture"); expect(login.nextStep).toBe("/projects");
});
it("password change verifies the current password and revokes sessions and outstanding reset links", async () => {
  const a = await active(); await service.sendLink(a.email, "reset", "ko"); const raw = token(a.email, "reset");
  await expect(service.changePassword(a.token, "incorrect", "changed8")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(await service.session(a.token)).not.toBeNull();
  await service.changePassword(a.token, password, "changed8"); expect(await service.session(a.token)).toBeNull();
  await expect(service.consume(raw, "reset", password)).rejects.toThrow();
  await expect(service.login({ email: a.email, password: "changed8", locale: "ko" })).resolves.toHaveProperty("token");
});
it("logout and expiration block reuse, including profile writes", async () => {
  const a = await active(); await service.logout(a.token); expect(await service.session(a.token)).toBeNull();
  await expect(service.profile(a.token, { name: "X", org: "X" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  const b = await service.login({ email: a.email, password, locale: "ko" });
  await pool.query("UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE token=$1", [digest(b.token)]);
  expect(await service.session(b.token)).toBeNull();
});
it("rejects identity/role injection and retains isolated account language preferences", async () => {
  const a = await active(), b = await active();
  await expect(service.profile(a.token, { name: "X", org: "Y", appRole: "admin" })).rejects.toThrow();
  await expect(service.profile(a.token, { name: "X", org: "Y", email: b.email })).rejects.toThrow();
  await service.preferences(a.token, "en"); await service.preferences(b.token, "ko");
  expect((await service.login({ email: a.email, password, locale: "ko" })).user.preferences.locale).toBe("en");
  expect((await service.login({ email: b.email, password, locale: "en" })).user.preferences.locale).toBe("ko");
});
it("blocks member and public admin access; ownership prevents cross-account resource access", async () => {
  const a = await active(), b = await active(); const id = randomUUID();
  await pool.query("INSERT INTO projects(id,owner_id,name,ip_name) VALUES($1,$2,'fixture','IP')", [id, a.user.id]);
  expect((await requireOwned("project", id, a.token, service)).id).toBe(a.user.id);
  await expect(requireOwned("project", id, b.token, service)).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(requireOwned("project", id, undefined, service)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(() => assertAdmin(a.user)).toThrow(); expect(() => assertAdmin(null)).toThrow();
  await service.manage(a.email, "promote"); expect(await service.session(a.token)).toBeNull();
  const admin = await service.login({ email: a.email, password, locale: "ko" }); expect(admin.user.app_role).toBe("admin"); expect(() => assertAdmin(admin.user)).toThrow();
});
it("suspension/withdrawal revoke sessions and tokens, preserve data and audit the lifecycle", async () => {
  const a = await active(), b = await active(); await service.sendLink(a.email, "reset", "ko");
  const raw = token(a.email, "reset"); await service.manage(a.email, "suspend");
  expect(await service.session(a.token)).toBeNull(); await expect(service.login({ email: a.email, password, locale: "ko" })).rejects.toThrow();
  await expect(service.consume(raw, "reset", "other888")).rejects.toThrow();
  expect(await service.withdraw(b.token)).toEqual({ accepted: true, cleanup: "pending_policy" });
  expect(await service.session(b.token)).toBeNull();
  await expect(service.profile(b.token, { name: "X", org: "X" })).rejects.toThrow();
  expect((await pool.query("SELECT status FROM users WHERE id=$1", [b.user.id])).rows[0].status).toBe("withdrawal_pending");
  expect((await pool.query("SELECT count(*)::int n FROM admin_audit_logs WHERE entity_id=ANY($1)", [[a.user.id, b.user.id]])).rows[0].n).toBe(2);
});
it("database rate limits hold across concurrent service instances and reset after expiry", async () => {
  const action = randomUUID(), identity = "fixture"; rateKeys.push(digest(`${action}:${identity}`));
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => service.limit(action, identity, 5)));
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(5);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(7);
  await pool.query("UPDATE auth_rate_limits SET expires_at=now()-interval '1 second' WHERE key=$1", [rateKeys.at(-1)]);
  await expect(service.limit(action, identity, 5)).resolves.toBeUndefined();
});
it("mail failure rolls back signup and generic recovery does not expose unknown or suspended accounts", async () => {
  const e = email(); const broken = new AuthService(pool, async () => { throw new Error("sandbox unavailable"); }, "http://localhost:3000");
  await expect(broken.signup({ email: e, password, locale: "ko" })).rejects.toThrow(); expect(await service.lookup(e)).toEqual({ nextStep: "sign-up" });
  const count = mail.length; expect(await service.sendLink(e, "reset", "ko")).toEqual({ accepted: true }); expect(mail).toHaveLength(count);
});
