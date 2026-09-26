import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import type { PoolClient } from "pg";
import { AuthService, digest, type AuthUser } from "../auth/service";
import { AppError } from "../errors/http";
import { passwordSchema } from "../auth/policy";
import { z } from "zod";
const auditRequest = new AsyncLocalStorage<string>();
export async function audit(c: PoolClient, actor: string, action: string, type: string, id: string, reason: string, fields: {
    field: string;
    before: unknown;
    after: unknown;
}[] = [], requestId = auditRequest.getStore() ?? randomUUID()) {
    await c.query("INSERT INTO admin_audit_logs(id,actor_id,action,entity_type,entity_id,changes,reason,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [randomUUID(), actor, action, type, id, { schemaVersion: 1, fields }, reason, requestId]);
}
export class AdminAccess {
    constructor(readonly auth: AuthService, readonly requestId?: string) { }
    async run<T>(raw: string | undefined, fn: (c: PoolClient, u: AuthUser) => Promise<T>, target?: {
        kind: "user" | "project" | "job" | "monitoring";
        id: string;
    }, reauth = false): Promise<T> {
        if (!raw || !/^[a-f0-9]{64}$/.test(raw))
            throw new AppError("UNAUTHORIZED");
        return auditRequest.run(this.requestId ?? randomUUID(), () => this.auth.transaction(async (c) => {
            const { rows: [identity] } = await c.query("SELECT user_id FROM auth_sessions WHERE token=$1 AND expires_at>now()", [digest(raw)]);
            if (!identity)
                throw new AppError("UNAUTHORIZED");
            let owner: string | undefined;
            if (target) {
                const table = { user: "users", project: "projects", job: "jobs", monitoring: "monitoring_records" }[target.kind];
                owner = (await c.query(`SELECT ${target.kind === "user" ? "id" : "owner_id"} AS id FROM ${table} WHERE id=$1`, [target.id])).rows[0]?.id;
            }
            // Stable order prevents two admins managing each other from taking opposite locks.
            const { rows } = await c.query<AuthUser>("SELECT * FROM users WHERE id=ANY($1) ORDER BY id FOR UPDATE", [[identity.user_id, ...(owner ? [owner] : [])]]);
            const u = rows.find(row => row.id === identity.user_id);
            if (!u || !u.email_verified || u.status !== "active" || u.app_role !== "admin")
                throw new AppError("FORBIDDEN");
            const { rows: [session] } = await c.query("SELECT admin_verified_until>clock_timestamp() AS verified FROM auth_sessions WHERE token=$1 AND user_id=$2 AND expires_at>clock_timestamp() FOR UPDATE", [digest(raw), u.id]);
            if (!session)
                throw new AppError("UNAUTHORIZED");
            if (!reauth && !session.verified)
                throw new AppError("ADMIN_REAUTH_REQUIRED");
            return fn(c, u);
        }));
    }
    async verify(raw: string | undefined, input: unknown) {
        const { password } = z.strictObject({ password: passwordSchema }).parse(input);
        const identity = await this.run(raw, async (_c, u) => u.id, undefined, true);
        await this.auth.limit("admin-reauth", identity, 5);
        return this.run(raw, async (c, u) => {
            const { rows: [account] } = await c.query("SELECT password FROM auth_accounts WHERE user_id=$1 AND provider_id='credential'", [u.id]);
            if (!account?.password || !await verifyPassword({ password, hash: account.password }))
                throw new AppError("UNAUTHORIZED");
            const { rows: [session] } = await c.query("UPDATE auth_sessions SET admin_verified_until=clock_timestamp()+interval '15 minutes' WHERE token=$1 RETURNING admin_verified_until", [digest(raw!)]);
            await audit(c, u.id, "admin.reauthenticate", "user", u.id, "Password reconfirmed");
            return { expiresAt: session.admin_verified_until.toISOString() };
        }, undefined, true);
    }
}
