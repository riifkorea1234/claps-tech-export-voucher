import { sql } from "drizzle-orm";
import { pgTable, text, integer, boolean, timestamp, jsonb, index, unique, check, foreignKey, type AnyPgColumn, type PgTableExtraConfigValue } from "drizzle-orm/pg-core";
import type { z } from "zod";
import type { fileSchema, preferencesSchema, coverSchema, partnerProfileSchema, guideRulesSchema, verificationSchema, jobInputSchema, jobOutputSchema, auditChangesSchema, localizedContentSchema, usageSchema } from "../lib/contracts/metadata";

const id = () => text("id").primaryKey();
const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const timestamps = () => ({ createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow() });
const version = () => integer("version").notNull().default(1);
const positive = (name: string, column: AnyPgColumn) => check(name, sql`${column} > 0`);
// DB enforces the common envelope. Service writes must additionally call parseMetadata for strict field validation.
const metadata = (name: string, column: AnyPgColumn) => check(name,
  sql`${column} IS NULL OR (jsonb_typeof(${column}) = 'object' AND ${column} ? 'schemaVersion' AND ${column}->'schemaVersion' = '1'::jsonb AND octet_length(${column}::text) <= 65536)`);

export const users = pgTable("users", {
  id: id(), email: text("email").notNull().unique(), name: text("name").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false), image: text("image"),
  orgName: text("org_name"), jobRole: text("job_role"), appRole: text("app_role").notNull().default("member"),
  status: text("status").notNull().default("email_unverified"), profileCompletedAt: time("profile_completed_at"),
  preferences: jsonb("preferences").$type<z.infer<typeof preferencesSchema>>().notNull().default({ schemaVersion: 1 }),
  version: version(), ...timestamps(),
}, (t) => [
  check("users_email_normalized", sql`${t.email} = lower(btrim(${t.email})) AND length(${t.email}) BETWEEN 3 AND 320`),
  check("users_role", sql`${t.appRole} IN ('member','admin')`),
  check("users_status", sql`${t.status} IN ('email_unverified','profile_pending','active','suspended','withdrawal_pending')`),
  positive("users_version", t.version), metadata("users_preferences", t.preferences),
]);

export const locales = pgTable("locales", {
  code: text("code").primaryKey(), nativeName: text("native_name").notNull(), displayName: text("display_name").notNull(),
  enabled: boolean("enabled").notNull().default(false), fallbackCode: text("fallback_code").references((): AnyPgColumn => locales.code),
  direction: text("direction").notNull().default("ltr"), sortOrder: integer("sort_order").notNull().default(0), version: version(), ...timestamps(),
}, (t) => [check("locales_direction", sql`${t.direction} IN ('ltr','rtl')`), check("locales_no_self_fallback", sql`${t.fallbackCode} <> ${t.code}`), positive("locales_version", t.version)]);

export const partners = pgTable("partners", {
  id: id(), name: text("name").notNull(), contactEmail: text("contact_email"), visibility: text("visibility").notNull().default("private"),
  profile: jsonb("profile").$type<z.infer<typeof partnerProfileSchema>>().notNull(), sourceRevision: integer("source_revision").notNull().default(1), version: version(), ...timestamps(),
}, (t) => [check("partners_visibility", sql`${t.visibility} IN ('private','public')`), positive("partners_version", t.version), positive("partners_revision", t.sourceRevision), metadata("partners_profile", t.profile)]);

export const projects = pgTable("projects", {
  id: id(), ownerId: text("owner_id").notNull().references(() => users.id), name: text("name").notNull(), ipName: text("ip_name").notNull(),
  partnerId: text("partner_id").references(() => partners.id), status: text("status").notNull().default("preparing"), description: text("description").notNull().default(""),
  cover: jsonb("cover").$type<z.infer<typeof coverSchema>>().notNull().default({ schemaVersion: 1, kind: "default" }),
  activeGuideId: text("active_guide_id"), version: version(), ...timestamps(), archivedAt: time("archived_at"),
}, (t): PgTableExtraConfigValue[] => [
  unique("projects_id_owner").on(t.id, t.ownerId),
  foreignKey({ name: "projects_active_guide_project_fk", columns: [t.id, t.activeGuideId], foreignColumns: [brandGuides.projectId, brandGuides.id] }),
  index("projects_owner_updated").on(t.ownerId, t.updatedAt, t.id),
  check("projects_status", sql`${t.status} IN ('preparing','generating','verifying','needs_revision','completed')`),
  positive("projects_version", t.version), metadata("projects_cover", t.cover),
]);

export const assetSessions = pgTable("asset_sessions", {
  id: id(), ownerId: text("owner_id").notNull().references(() => users.id), projectId: text("project_id"), title: text("title").notNull(), version: version(), ...timestamps(), archivedAt: time("archived_at"),
}, (t) => [
  foreignKey({ name: "sessions_project_owner_fk", columns: [t.projectId, t.ownerId], foreignColumns: [projects.id, projects.ownerId] }),
  index("sessions_owner_updated").on(t.ownerId, t.updatedAt, t.id), index("sessions_project_created").on(t.projectId, t.createdAt, t.id), positive("sessions_version", t.version),
]);

export const jobs = pgTable("jobs", {
  id: id(), ownerId: text("owner_id").notNull().references(() => users.id), projectId: text("project_id"),
  kind: text("kind").notNull(), status: text("status").notNull().default("queued"), schemaVersion: integer("schema_version").notNull().default(1),
  input: jsonb("input").$type<z.infer<typeof jobInputSchema>>().notNull(), output: jsonb("output").$type<z.infer<typeof jobOutputSchema>>(),
  provider: text("provider"), providerRequestId: text("provider_request_id"), idempotencyKey: text("idempotency_key"), requestHash: text("request_hash").notNull(),
  attempt: integer("attempt").notNull().default(0), retryOfId: text("retry_of_id").references((): AnyPgColumn => jobs.id),
  leaseToken: text("lease_token"), heartbeatAt: time("heartbeat_at"), deadlineAt: time("deadline_at"), dispatchedAt: time("dispatched_at"),
  costState: text("cost_state").notNull().default("not_started"),
  nextRunAt: time("next_run_at").notNull().defaultNow(), leaseUntil: time("lease_until"), lockedBy: text("locked_by"),
  errorCode: text("error_code"), errorSummary: text("error_summary"), usage: jsonb("usage").$type<z.infer<typeof usageSchema>>(),
  startedAt: time("started_at"), finishedAt: time("finished_at"), cancelRequestedAt: time("cancel_requested_at"), ...timestamps(),
}, (t) => [
  foreignKey({ name: "jobs_project_owner_fk", columns: [t.projectId, t.ownerId], foreignColumns: [projects.id, projects.ownerId] }),
  unique("jobs_retry_child").on(t.retryOfId),
  check("jobs_cost_state", sql`${t.costState} IN ('not_started','unknown','confirmed','none')`),
  unique("jobs_idempotency").on(t.ownerId, t.kind, t.idempotencyKey),
  index("jobs_queue").on(t.status, t.nextRunAt, t.id), index("jobs_lease").on(t.status, t.leaseUntil), index("jobs_owner_created").on(t.ownerId, t.createdAt, t.id),
  check("jobs_status", sql`${t.status} IN ('queued','running','succeeded','failed','canceled')`),
  check("jobs_kind", sql`${t.kind} IN ('generation','guide_extraction','verification','matching','monitoring','export')`),
  check("jobs_schema_version", sql`${t.schemaVersion} = 1`), check("jobs_attempt", sql`${t.attempt} >= 0`),
  check("jobs_request_hash", sql`${t.requestHash} ~ '^[a-f0-9]{64}$'`),
  check("jobs_input_kind", sql`${t.input} ? 'kind' AND ${t.input}->>'kind' = ${t.kind}`),
  check("jobs_output_kind", sql`${t.output} IS NULL OR (${t.output} ? 'kind' AND ${t.output}->>'kind' = ${t.kind})`),
  metadata("jobs_input", t.input), metadata("jobs_output", t.output), metadata("jobs_usage", t.usage),
]);

export const brandGuides = pgTable("brand_guides", {
  id: id(), projectId: text("project_id").notNull().references((): AnyPgColumn => projects.id), version: integer("version").notNull(),
  rowVersion: integer("row_version").notNull().default(1), sourceRevision: integer("source_revision").notNull().default(1),
  file: jsonb("file").$type<z.infer<typeof fileSchema>>().notNull(), rules: jsonb("rules").$type<z.infer<typeof guideRulesSchema>>(),
  status: text("status").notNull().default("uploaded"), extractionJobId: text("extraction_job_id").references(() => jobs.id), ...timestamps(),
}, (t) => [
  unique("guides_project_version").on(t.projectId, t.version), unique("guides_project_id").on(t.projectId, t.id),
  check("guides_status", sql`${t.status} IN ('uploaded','extracting','draft','published','failed')`),
  positive("guides_version", t.version), positive("guides_row_version", t.rowVersion), positive("guides_revision", t.sourceRevision), metadata("guides_file", t.file), metadata("guides_rules", t.rules),
]);

export const assets = pgTable("assets", {
  id: id(), sessionId: text("session_id").notNull().references(() => assetSessions.id), generationJobId: text("generation_job_id").notNull().references(() => jobs.id),
  file: jsonb("file").$type<z.infer<typeof fileSchema>>().notNull(), adopted: boolean("adopted").notNull().default(false),
  verificationJobId: text("verification_job_id").references(() => jobs.id), verification: jsonb("verification").$type<z.infer<typeof verificationSchema>>(),
  finalizedAt: time("finalized_at"), finalizedGuideId: text("finalized_guide_id").references(() => brandGuides.id), version: version(), ...timestamps(), deletedAt: time("deleted_at"),
}, (t) => [index("assets_session_created").on(t.sessionId, t.createdAt, t.id), index("assets_session_finalized").on(t.sessionId, t.finalizedAt, t.id), positive("assets_version", t.version), metadata("assets_file", t.file), metadata("assets_verification", t.verification)]);

export const monitoringRecords = pgTable("monitoring_records", {
  id: id(), ownerId: text("owner_id").notNull().references(() => users.id), name: text("name").notNull(),
  sourceAssetId: text("source_asset_id").references(() => assets.id), sourceFile: jsonb("source_file").$type<z.infer<typeof fileSchema>>(), latestJobId: text("latest_job_id").references(() => jobs.id),
  firstScannedAt: time("first_scanned_at"), lastScannedAt: time("last_scanned_at"), latestResultCount: integer("latest_result_count").notNull().default(0), version: version(), ...timestamps(), archivedAt: time("archived_at"),
}, (t) => [index("monitoring_owner_updated").on(t.ownerId, t.updatedAt, t.id), check("monitoring_one_source", sql`(${t.sourceAssetId} IS NULL) <> (${t.sourceFile} IS NULL)`), check("monitoring_result_count", sql`${t.latestResultCount} >= 0`), positive("monitoring_version", t.version), metadata("monitoring_file", t.sourceFile)]);

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: id(), actorId: text("actor_id").references(() => users.id), action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
  changes: jsonb("changes").$type<z.infer<typeof auditChangesSchema>>().notNull(), reason: text("reason").notNull(), requestId: text("request_id").notNull(), createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("audit_created").on(t.createdAt, t.id), index("audit_entity").on(t.entityType, t.entityId, t.createdAt), metadata("audit_changes", t.changes)]);

export const localizedContents = pgTable("localized_contents", {
  id: id(), resourceType: text("resource_type").notNull(), resourceKey: text("resource_key").notNull(), localeCode: text("locale_code").notNull().references(() => locales.code),
  sourceRevision: integer("source_revision").notNull(), draft: jsonb("draft").$type<z.infer<typeof localizedContentSchema>>().notNull(), published: jsonb("published").$type<z.infer<typeof localizedContentSchema>>(),
  publishedSourceRevision: integer("published_source_revision"), publishedVersion: integer("published_version").notNull().default(0),
  version: version(), publishedAt: time("published_at"), updatedBy: text("updated_by").notNull().references(() => users.id), ...timestamps(),
}, (t) => [unique("localized_resource_locale").on(t.resourceType, t.resourceKey, t.localeCode), check("localized_type", sql`${t.resourceType} IN ('partner','guide')`), positive("localized_revision", t.sourceRevision), positive("localized_version", t.version), metadata("localized_draft", t.draft), metadata("localized_published", t.published)]);

export const authSessions = pgTable("auth_sessions", {
  id: id(), userId: text("user_id").notNull().references(() => users.id), token: text("token").notNull().unique(), adminVerifiedUntil: time("admin_verified_until"), expiresAt: time("expires_at").notNull(), ipAddress: text("ip_address"), userAgent: text("user_agent"), ...timestamps(),
}, (t) => [index("auth_sessions_user").on(t.userId), index("auth_sessions_expiry").on(t.expiresAt)]);
export const authAccounts = pgTable("auth_accounts", {
  id: id(), userId: text("user_id").notNull().references(() => users.id), providerId: text("provider_id").notNull(), accountId: text("account_id").notNull(),
  password: text("password"), accessToken: text("access_token"), refreshToken: text("refresh_token"), idToken: text("id_token"), scope: text("scope"),
  accessTokenExpiresAt: time("access_token_expires_at"), refreshTokenExpiresAt: time("refresh_token_expires_at"), ...timestamps(),
}, (t) => [unique("auth_accounts_provider_account").on(t.providerId, t.accountId), index("auth_accounts_user").on(t.userId)]);
export const authVerifications = pgTable("auth_verifications", {
  id: id(), identifier: text("identifier").notNull(), value: text("value").notNull(), expiresAt: time("expires_at").notNull(), ...timestamps(),
}, (t) => [index("auth_verifications_identifier").on(t.identifier), index("auth_verifications_expiry").on(t.expiresAt)]);

// Better Auth default model keys; no auth endpoint is exposed in Phase 1.
export const authSchema = { user: users, session: authSessions, account: authAccounts, verification: authVerifications };

// Shared across web processes; only hashed request identities are retained.
export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expiresAt: time("expires_at").notNull(),
}, (t) => [index("auth_rate_limits_expiry").on(t.expiresAt)]);

// Expiring capabilities and cleanup ledger, not a permanent files catalog.
export const storageTickets = pgTable("storage_tickets", {
  id: id(), ownerId: text("owner_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(),
  variant: text("variant").notNull().default("original"), state: text("state").notNull().default("reserved"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), expiresAt: time("expires_at").notNull(), ...timestamps(),
}, (t) => [index("storage_tickets_expiry").on(t.state, t.expiresAt), index("storage_tickets_owner").on(t.ownerId),
  check("storage_tickets_kind", sql`${t.kind} IN ('upload','download','cleanup')`),
  check("storage_tickets_state", sql`${t.state} IN ('reserved','ready','claimed','cleanup_pending')`),
  check("storage_tickets_target", sql`${t.targetType} IN ('project','asset','job','partner','matching','monitoring')`),
  check("storage_tickets_variant", sql`${t.variant} IN ('original','thumbnail')`),
]);
