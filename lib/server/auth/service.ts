import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { AppError } from "@/lib/server/errors/http";
import { getDatabase } from "@/lib/server/db";
import { sandboxMail, type Mailer } from "@/lib/server/mail/sandbox";
import { SESSION_SECONDS, emailSchema, passwordSchema, profileSchema, tokenSchema } from "./policy";
export type AuthUser = {
  id: string; email: string; name: string; org_name: string | null; job_role: string | null;
  app_role: string; status: string; email_verified: boolean; preferences: { schemaVersion: 1; locale?: string }; profile_completed_at: Date | null;
};
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const allowed = (u: AuthUser) => !["suspended", "withdrawal_pending"].includes(u.status);
export function accountDto(u: AuthUser) {
  return { id: u.id, email: u.email, name: u.name, org: u.org_name ?? "", role: u.job_role ?? undefined, status: u.status, locale: u.preferences.locale };
}
export class AuthService {
  constructor(readonly pool: Pool, readonly mail: Mailer, readonly origin: string) {}
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try { await c.query("BEGIN"); const result = await fn(c); await c.query("COMMIT"); return result; }
    catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
  }
  async limit(action: string, identity: string, max: number) {
    const key = digest(`${action}:${identity}`);
    const { rows } = await this.pool.query(`INSERT INTO auth_rate_limits(key,count,expires_at) VALUES($1,1,now()+interval '15 minutes')
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_rate_limits.expires_at<=now() THEN 1 ELSE auth_rate_limits.count+1 END,
      expires_at=CASE WHEN auth_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE auth_rate_limits.expires_at END RETURNING count`, [key]);
    if (rows[0].count > max) throw new AppError("RATE_LIMITED");
  }
  async lookup(input: string) {
    const email = emailSchema.parse(input);
    const { rowCount } = await this.pool.query("SELECT 1 FROM users WHERE email=$1", [email]);
    return { nextStep: rowCount ? "sign-in" : "sign-up" };
  }
  async token(c: PoolClient, u: AuthUser, kind: "verify" | "reset", locale: string) {
    const raw = randomBytes(32).toString("hex");
    const identifier = `${kind}:${u.id}`;
    await c.query("DELETE FROM auth_verifications WHERE identifier=$1", [identifier]);
    await c.query("INSERT INTO auth_verifications(id,identifier,value,expires_at) VALUES($1,$2,$3,$4)", [randomUUID(), identifier, digest(raw), new Date(Date.now() + (kind === "verify" ? 24 : 1) * 3600000)]);
    const url = new URL(kind === "verify" ? "/verify-email" : "/reset-password", this.origin);
    url.searchParams.set("token", raw);
    await this.mail({ to: u.email, kind, locale, url: url.toString() });
  }
  async signup(input: { email: string; password: string; locale: string }) {
    const email = emailSchema.parse(input.email), password = passwordSchema.parse(input.password);
    const hashed = await hashPassword(password);
    return this.transaction(async c => {
      const result = await c.query<AuthUser>(`INSERT INTO users(id,email,name,preferences) VALUES($1,$2,'',$3) ON CONFLICT(email) DO NOTHING RETURNING *`, [randomUUID(), email, { schemaVersion: 1, locale: input.locale }]);
      const u = result.rows[0];
      if (!u) throw new AppError("STATE_CONFLICT");
      await c.query("INSERT INTO auth_accounts(id,user_id,provider_id,account_id,password) VALUES($1,$2,'credential',$2,$3)", [randomUUID(), u.id, hashed]);
      await this.token(c, u, "verify", input.locale);
      return { nextStep: "verify-email" };
    });
  }
  async issueSession(c: PoolClient, u: AuthUser, locale: string) {
    if (!u.preferences.locale) {
      u.preferences = { ...u.preferences, locale };
      await c.query("UPDATE users SET preferences=$2,updated_at=now() WHERE id=$1", [u.id, u.preferences]);
    }
    const token = randomBytes(32).toString("hex");
    await c.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,$4)", [randomUUID(), u.id, digest(token), new Date(Date.now() + SESSION_SECONDS * 1000)]);
    return { token, user: u, nextStep: u.status === "active" ? "/projects" : "/profile-setup" };
  }
  async login(input: { email: string; password: string; locale: string }) {
    const email = emailSchema.parse(input.email), password = passwordSchema.parse(input.password);
    return this.transaction(async c => {
      const { rows } = await c.query<AuthUser>("SELECT * FROM users WHERE email=$1 FOR UPDATE", [email]);
      const u = rows[0];
      const credentials = u ? await c.query("SELECT password FROM auth_accounts WHERE user_id=$1 AND provider_id='credential'", [u.id]) : undefined;
      const hash = credentials?.rows[0]?.password;
      // Missing accounts also incur the password KDF work.
      const valid = hash ? await verifyPassword({ hash, password }) : (await hashPassword(password), false);
      if (!u || !valid || !allowed(u)) throw new AppError("UNAUTHORIZED");
      if (!u.email_verified) throw new AppError("FORBIDDEN");
      return this.issueSession(c, u, input.locale);
    });
  }
  async sendLink(emailInput: string, kind: "verify" | "reset", locale: string) {
    const email = emailSchema.parse(emailInput);
    return this.transaction(async c => {
      const { rows } = await c.query<AuthUser>("SELECT * FROM users WHERE email=$1 FOR UPDATE", [email]);
      const u = rows[0];
      if (u && allowed(u) && (kind === "verify" ? !u.email_verified : u.email_verified)) await this.token(c, u, kind, u.preferences.locale ?? locale);
      return { accepted: true };
    });
  }
  async consume(raw: string, kind: "verify" | "reset", password?: string, locale = "ko") {
    tokenSchema.parse(raw);
    const hashed = kind === "reset" ? await hashPassword(passwordSchema.parse(password)) : undefined;
    return this.transaction(async c => {
      // Read identity, lock user, then atomically consume: same lock order as login/resend/withdraw.
      const found = await c.query("SELECT identifier FROM auth_verifications WHERE value=$1 AND identifier LIKE $2 AND expires_at>now()", [digest(raw), `${kind}:%`]);
      const identifier = found.rows[0]?.identifier as string | undefined;
      if (!identifier) throw new AppError("VALIDATION_ERROR");
      const { rows } = await c.query<AuthUser>("SELECT * FROM users WHERE id=$1 FOR UPDATE", [identifier.slice(kind.length + 1)]);
      const u = rows[0];
      if (!u || !allowed(u)) throw new AppError("UNAUTHORIZED");
      const consumed = await c.query("DELETE FROM auth_verifications WHERE identifier=$1 AND value=$2 AND expires_at>now() RETURNING id", [identifier, digest(raw)]);
      if (consumed.rowCount !== 1) throw new AppError("VALIDATION_ERROR");
      await c.query("DELETE FROM auth_sessions WHERE user_id=$1", [u.id]);
      if (kind === "verify") {
        if (u.email_verified) throw new AppError("STATE_CONFLICT");
        const updated = await c.query<AuthUser>("UPDATE users SET email_verified=true,status='profile_pending',updated_at=now() WHERE id=$1 RETURNING *", [u.id]);
        return this.issueSession(c, updated.rows[0], locale);
      }
      if (!u.email_verified) throw new AppError("FORBIDDEN");
      await c.query("UPDATE auth_accounts SET password=$2,updated_at=now() WHERE user_id=$1 AND provider_id='credential'", [u.id, hashed]);
      await c.query("DELETE FROM auth_verifications WHERE identifier IN ($1,$2)", [`reset:${u.id}`, `verify:${u.id}`]);
      return { nextStep: "/login" };
    });
  }
  async session(raw?: string): Promise<AuthUser | null> {
    if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
    const { rows } = await this.pool.query<AuthUser>(`SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id
      WHERE s.token=$1 AND s.expires_at>now() AND u.email_verified=true AND u.status IN ('profile_pending','active')`, [digest(raw)]);
    return rows[0] ?? null;
  }
  async authenticated<T>(raw: string | undefined, fn: (c: PoolClient, u: AuthUser) => Promise<T>) {
    if (!raw) throw new AppError("UNAUTHORIZED");
    return this.transaction(async c => {
      const { rows } = await c.query<AuthUser>(`SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id
        WHERE s.token=$1 AND s.expires_at>now() FOR UPDATE OF u`, [digest(raw)]);
      const u = rows[0];
      if (!u || !allowed(u) || !u.email_verified) throw new AppError("UNAUTHORIZED");
      // Recheck after acquiring the user lock; a concurrent reset may have revoked it.
      const current = await c.query("SELECT 1 FROM auth_sessions WHERE token=$1 AND expires_at>now()", [digest(raw)]);
      if (!current.rowCount) throw new AppError("UNAUTHORIZED");
      return fn(c, u);
    });
  }
  async profile(raw: string | undefined, input: unknown) {
    const data = profileSchema.parse(input);
    return this.authenticated(raw, async (c, u) => {
      const { rows } = await c.query<AuthUser>(`UPDATE users SET name=$2,org_name=$3,job_role=$4,status='active',profile_completed_at=COALESCE(profile_completed_at,now()),version=version+1,updated_at=now() WHERE id=$1 RETURNING *`, [u.id, data.name, data.org, data.role ?? null]);
      return accountDto(rows[0]);
    });
  }
  async preferences(raw: string | undefined, locale: string) {
    return this.authenticated(raw, async (c, u) => {
      await c.query("UPDATE users SET preferences=preferences || $2::jsonb,version=version+1,updated_at=now() WHERE id=$1", [u.id, JSON.stringify({ locale })]);
      return { locale };
    });
  }
  async changePassword(raw: string | undefined, current: string, next: string) {
    passwordSchema.parse(current); passwordSchema.parse(next);
    return this.authenticated(raw, async (c, u) => {
      const { rows } = await c.query("SELECT password FROM auth_accounts WHERE user_id=$1 AND provider_id='credential'", [u.id]);
      if (!rows[0]?.password || !await verifyPassword({ hash: rows[0].password, password: current })) throw new AppError("UNAUTHORIZED");
      await c.query("UPDATE auth_accounts SET password=$2,updated_at=now() WHERE user_id=$1 AND provider_id='credential'", [u.id, await hashPassword(next)]);
      await c.query("DELETE FROM auth_sessions WHERE user_id=$1", [u.id]);
      await c.query("DELETE FROM auth_verifications WHERE identifier IN ($1,$2)", [`reset:${u.id}`, `verify:${u.id}`]);
      return { nextStep: "/login" };
    });
  }
  async logout(raw?: string) {
    if (raw) await this.pool.query("DELETE FROM auth_sessions WHERE token=$1", [digest(raw)]);
    return { accepted: true };
  }
  async withdraw(raw?: string) {
    return this.authenticated(raw, async (c, u) => {
      await c.query("UPDATE users SET status='withdrawal_pending',version=version+1,updated_at=now() WHERE id=$1", [u.id]);
      await c.query("DELETE FROM auth_sessions WHERE user_id=$1", [u.id]);
      await c.query("DELETE FROM auth_verifications WHERE identifier IN ($1,$2)", [`reset:${u.id}`, `verify:${u.id}`]);
      await this.audit(c, u.id, u.id, "account.withdraw", "status", u.status, "withdrawal_pending");
      return { accepted: true, cleanup: "pending_policy" };
    });
  }
  async audit(c: PoolClient, actor: string | null, user: string, action: string, field: string, before: string, after: string) {
    await c.query("INSERT INTO admin_audit_logs(id,actor_id,action,entity_type,entity_id,changes,reason,request_id) VALUES($1,$2,$3,'user',$4,$5,'Explicit account lifecycle operation',$6)", [randomUUID(), actor, action, user, { schemaVersion: 1, fields: [{ field, before, after }] }, randomUUID()]);
  }
  async manage(emailInput: string, action: "promote" | "suspend") {
    const email = emailSchema.parse(emailInput);
    return this.transaction(async c => {
      const { rows } = await c.query<AuthUser>("SELECT * FROM users WHERE email=$1 FOR UPDATE", [email]);
      const u = rows[0];
      if (!u) throw new AppError("NOT_FOUND");
      if (u.status !== "active") throw new AppError("STATE_CONFLICT");
      if (action === "promote") await c.query("UPDATE users SET app_role='admin',version=version+1,updated_at=now() WHERE id=$1", [u.id]);
      else await c.query("UPDATE users SET status='suspended',version=version+1,updated_at=now() WHERE id=$1", [u.id]);
      await c.query("DELETE FROM auth_sessions WHERE user_id=$1", [u.id]);
      await c.query("DELETE FROM auth_verifications WHERE identifier IN ($1,$2)", [`reset:${u.id}`, `verify:${u.id}`]);
      await this.audit(c, null, u.id, `cli.${action}`, action === "promote" ? "appRole" : "status", action === "promote" ? u.app_role : u.status, action === "promote" ? "admin" : "suspended");
      return { accepted: true };
    });
  }
}
export function authService() {
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new AppError("SERVICE_UNAVAILABLE");
  return new AuthService(getDatabase().pool, sandboxMail, new URL(origin).origin);
}
