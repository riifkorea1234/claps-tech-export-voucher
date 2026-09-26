CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"changes" jsonb NOT NULL,
	"reason" text NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_changes" CHECK ("admin_audit_logs"."changes" IS NULL OR (jsonb_typeof("admin_audit_logs"."changes") = 'object' AND "admin_audit_logs"."changes" ? 'schemaVersion' AND "admin_audit_logs"."changes"->'schemaVersion' = '1'::jsonb AND octet_length("admin_audit_logs"."changes"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "asset_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"title" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "sessions_version" CHECK ("asset_sessions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"generation_job_id" text NOT NULL,
	"file" jsonb NOT NULL,
	"adopted" boolean DEFAULT false NOT NULL,
	"verification_job_id" text,
	"verification" jsonb,
	"finalized_at" timestamp with time zone,
	"finalized_guide_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "assets_version" CHECK ("assets"."version" > 0),
	CONSTRAINT "assets_file" CHECK ("assets"."file" IS NULL OR (jsonb_typeof("assets"."file") = 'object' AND "assets"."file" ? 'schemaVersion' AND "assets"."file"->'schemaVersion' = '1'::jsonb AND octet_length("assets"."file"::text) <= 65536)),
	CONSTRAINT "assets_verification" CHECK ("assets"."verification" IS NULL OR (jsonb_typeof("assets"."verification") = 'object' AND "assets"."verification" ? 'schemaVersion' AND "assets"."verification"->'schemaVersion' = '1'::jsonb AND octet_length("assets"."verification"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"scope" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_accounts_provider_account" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_guides" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"version" integer NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"source_revision" integer DEFAULT 1 NOT NULL,
	"file" jsonb NOT NULL,
	"rules" jsonb,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"extraction_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_project_version" UNIQUE("project_id","version"),
	CONSTRAINT "guides_project_id" UNIQUE("project_id","id"),
	CONSTRAINT "guides_status" CHECK ("brand_guides"."status" IN ('uploaded','extracting','draft','published','failed')),
	CONSTRAINT "guides_version" CHECK ("brand_guides"."version" > 0),
	CONSTRAINT "guides_row_version" CHECK ("brand_guides"."row_version" > 0),
	CONSTRAINT "guides_revision" CHECK ("brand_guides"."source_revision" > 0),
	CONSTRAINT "guides_file" CHECK ("brand_guides"."file" IS NULL OR (jsonb_typeof("brand_guides"."file") = 'object' AND "brand_guides"."file" ? 'schemaVersion' AND "brand_guides"."file"->'schemaVersion' = '1'::jsonb AND octet_length("brand_guides"."file"::text) <= 65536)),
	CONSTRAINT "guides_rules" CHECK ("brand_guides"."rules" IS NULL OR (jsonb_typeof("brand_guides"."rules") = 'object' AND "brand_guides"."rules" ? 'schemaVersion' AND "brand_guides"."rules"->'schemaVersion' = '1'::jsonb AND octet_length("brand_guides"."rules"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"kind" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"provider" text,
	"provider_request_id" text,
	"idempotency_key" text,
	"request_hash" text NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"retry_of_id" text,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"locked_by" text,
	"error_code" text,
	"error_summary" text,
	"usage" jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"cancel_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_idempotency" UNIQUE("owner_id","kind","idempotency_key"),
	CONSTRAINT "jobs_status" CHECK ("jobs"."status" IN ('queued','running','succeeded','failed','canceled')),
	CONSTRAINT "jobs_kind" CHECK ("jobs"."kind" IN ('generation','guide_extraction','verification','matching','monitoring','export')),
	CONSTRAINT "jobs_schema_version" CHECK ("jobs"."schema_version" = 1),
	CONSTRAINT "jobs_attempt" CHECK ("jobs"."attempt" >= 0),
	CONSTRAINT "jobs_request_hash" CHECK ("jobs"."request_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "jobs_input_kind" CHECK ("jobs"."input" ? 'kind' AND "jobs"."input"->>'kind' = "jobs"."kind"),
	CONSTRAINT "jobs_output_kind" CHECK ("jobs"."output" IS NULL OR ("jobs"."output" ? 'kind' AND "jobs"."output"->>'kind' = "jobs"."kind")),
	CONSTRAINT "jobs_input" CHECK ("jobs"."input" IS NULL OR (jsonb_typeof("jobs"."input") = 'object' AND "jobs"."input" ? 'schemaVersion' AND "jobs"."input"->'schemaVersion' = '1'::jsonb AND octet_length("jobs"."input"::text) <= 65536)),
	CONSTRAINT "jobs_output" CHECK ("jobs"."output" IS NULL OR (jsonb_typeof("jobs"."output") = 'object' AND "jobs"."output" ? 'schemaVersion' AND "jobs"."output"->'schemaVersion' = '1'::jsonb AND octet_length("jobs"."output"::text) <= 65536)),
	CONSTRAINT "jobs_usage" CHECK ("jobs"."usage" IS NULL OR (jsonb_typeof("jobs"."usage") = 'object' AND "jobs"."usage" ? 'schemaVersion' AND "jobs"."usage"->'schemaVersion' = '1'::jsonb AND octet_length("jobs"."usage"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "locales" (
	"code" text PRIMARY KEY NOT NULL,
	"native_name" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"fallback_code" text,
	"direction" text DEFAULT 'ltr' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locales_direction" CHECK ("locales"."direction" IN ('ltr','rtl')),
	CONSTRAINT "locales_no_self_fallback" CHECK ("locales"."fallback_code" <> "locales"."code"),
	CONSTRAINT "locales_version" CHECK ("locales"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "localized_contents" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"resource_key" text NOT NULL,
	"locale_code" text NOT NULL,
	"source_revision" integer NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "localized_resource_locale" UNIQUE("resource_type","resource_key","locale_code"),
	CONSTRAINT "localized_type" CHECK ("localized_contents"."resource_type" IN ('partner','guide')),
	CONSTRAINT "localized_revision" CHECK ("localized_contents"."source_revision" > 0),
	CONSTRAINT "localized_version" CHECK ("localized_contents"."version" > 0),
	CONSTRAINT "localized_draft" CHECK ("localized_contents"."draft" IS NULL OR (jsonb_typeof("localized_contents"."draft") = 'object' AND "localized_contents"."draft" ? 'schemaVersion' AND "localized_contents"."draft"->'schemaVersion' = '1'::jsonb AND octet_length("localized_contents"."draft"::text) <= 65536)),
	CONSTRAINT "localized_published" CHECK ("localized_contents"."published" IS NULL OR (jsonb_typeof("localized_contents"."published") = 'object' AND "localized_contents"."published" ? 'schemaVersion' AND "localized_contents"."published"->'schemaVersion' = '1'::jsonb AND octet_length("localized_contents"."published"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "monitoring_records" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"source_asset_id" text,
	"source_file" jsonb,
	"latest_job_id" text,
	"first_scanned_at" timestamp with time zone,
	"last_scanned_at" timestamp with time zone,
	"latest_result_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "monitoring_one_source" CHECK (("monitoring_records"."source_asset_id" IS NULL) <> ("monitoring_records"."source_file" IS NULL)),
	CONSTRAINT "monitoring_result_count" CHECK ("monitoring_records"."latest_result_count" >= 0),
	CONSTRAINT "monitoring_version" CHECK ("monitoring_records"."version" > 0),
	CONSTRAINT "monitoring_file" CHECK ("monitoring_records"."source_file" IS NULL OR (jsonb_typeof("monitoring_records"."source_file") = 'object' AND "monitoring_records"."source_file" ? 'schemaVersion' AND "monitoring_records"."source_file"->'schemaVersion' = '1'::jsonb AND octet_length("monitoring_records"."source_file"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"profile" jsonb NOT NULL,
	"source_revision" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_visibility" CHECK ("partners"."visibility" IN ('private','public')),
	CONSTRAINT "partners_version" CHECK ("partners"."version" > 0),
	CONSTRAINT "partners_revision" CHECK ("partners"."source_revision" > 0),
	CONSTRAINT "partners_profile" CHECK ("partners"."profile" IS NULL OR (jsonb_typeof("partners"."profile") = 'object' AND "partners"."profile" ? 'schemaVersion' AND "partners"."profile"->'schemaVersion' = '1'::jsonb AND octet_length("partners"."profile"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"ip_name" text NOT NULL,
	"partner_id" text,
	"status" text DEFAULT 'preparing' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover" jsonb DEFAULT '{"schemaVersion":1,"kind":"default"}'::jsonb NOT NULL,
	"active_guide_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "projects_id_owner" UNIQUE("id","owner_id"),
	CONSTRAINT "projects_status" CHECK ("projects"."status" IN ('preparing','generating','verifying','needs_revision','completed')),
	CONSTRAINT "projects_version" CHECK ("projects"."version" > 0),
	CONSTRAINT "projects_cover" CHECK ("projects"."cover" IS NULL OR (jsonb_typeof("projects"."cover") = 'object' AND "projects"."cover" ? 'schemaVersion' AND "projects"."cover"->'schemaVersion' = '1'::jsonb AND octet_length("projects"."cover"::text) <= 65536))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"org_name" text,
	"job_role" text,
	"app_role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'email_unverified' NOT NULL,
	"profile_completed_at" timestamp with time zone,
	"preferences" jsonb DEFAULT '{"schemaVersion":1}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_normalized" CHECK ("users"."email" = lower(btrim("users"."email")) AND length("users"."email") BETWEEN 3 AND 320),
	CONSTRAINT "users_role" CHECK ("users"."app_role" IN ('member','admin')),
	CONSTRAINT "users_status" CHECK ("users"."status" IN ('email_unverified','profile_pending','active','suspended','withdrawal_pending')),
	CONSTRAINT "users_version" CHECK ("users"."version" > 0),
	CONSTRAINT "users_preferences" CHECK ("users"."preferences" IS NULL OR (jsonb_typeof("users"."preferences") = 'object' AND "users"."preferences" ? 'schemaVersion' AND "users"."preferences"->'schemaVersion' = '1'::jsonb AND octet_length("users"."preferences"::text) <= 65536))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_sessions" ADD CONSTRAINT "asset_sessions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_sessions" ADD CONSTRAINT "sessions_project_owner_fk" FOREIGN KEY ("project_id","owner_id") REFERENCES "public"."projects"("id","owner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_session_id_asset_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."asset_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_generation_job_id_jobs_id_fk" FOREIGN KEY ("generation_job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_verification_job_id_jobs_id_fk" FOREIGN KEY ("verification_job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_finalized_guide_id_brand_guides_id_fk" FOREIGN KEY ("finalized_guide_id") REFERENCES "public"."brand_guides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_guides" ADD CONSTRAINT "brand_guides_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_guides" ADD CONSTRAINT "brand_guides_extraction_job_id_jobs_id_fk" FOREIGN KEY ("extraction_job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_retry_of_id_jobs_id_fk" FOREIGN KEY ("retry_of_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_owner_fk" FOREIGN KEY ("project_id","owner_id") REFERENCES "public"."projects"("id","owner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locales" ADD CONSTRAINT "locales_fallback_code_locales_code_fk" FOREIGN KEY ("fallback_code") REFERENCES "public"."locales"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_contents" ADD CONSTRAINT "localized_contents_locale_code_locales_code_fk" FOREIGN KEY ("locale_code") REFERENCES "public"."locales"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_contents" ADD CONSTRAINT "localized_contents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_source_asset_id_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_latest_job_id_jobs_id_fk" FOREIGN KEY ("latest_job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_active_guide_project_fk" FOREIGN KEY ("id","active_guide_id") REFERENCES "public"."brand_guides"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created" ON "admin_audit_logs" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "audit_entity" ON "admin_audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_owner_updated" ON "asset_sessions" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "sessions_project_created" ON "asset_sessions" USING btree ("project_id","created_at","id");--> statement-breakpoint
CREATE INDEX "assets_session_created" ON "assets" USING btree ("session_id","created_at","id");--> statement-breakpoint
CREATE INDEX "assets_session_finalized" ON "assets" USING btree ("session_id","finalized_at","id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expiry" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_verifications_identifier" ON "auth_verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "auth_verifications_expiry" ON "auth_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "jobs_queue" ON "jobs" USING btree ("status","next_run_at","id");--> statement-breakpoint
CREATE INDEX "jobs_lease" ON "jobs" USING btree ("status","lease_until");--> statement-breakpoint
CREATE INDEX "jobs_owner_created" ON "jobs" USING btree ("owner_id","created_at","id");--> statement-breakpoint
CREATE INDEX "monitoring_owner_updated" ON "monitoring_records" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "projects_owner_updated" ON "projects" USING btree ("owner_id","updated_at","id");