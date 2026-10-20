CREATE TABLE "review_checks" (
	"session_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"target_hash" text NOT NULL,
	"manual" jsonb NOT NULL,
	"actor_id" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "review_checks_version" CHECK ("review_checks"."version" > 0),
	CONSTRAINT "review_checks_hash" CHECK ("review_checks"."target_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "review_checks_actor" CHECK ("review_checks"."actor_id"="review_checks"."owner_id"),
	CONSTRAINT "review_checks_manual" CHECK (jsonb_typeof("review_checks"."manual")='object' AND "review_checks"."manual" ?& ARRAY['copyrightNotice','thirdPartyAssets','recipientConfirmed'] AND ("review_checks"."manual" - ARRAY['copyrightNotice','thirdPartyAssets','recipientConfirmed'])='{}'::jsonb AND jsonb_typeof("review_checks"."manual"->'copyrightNotice')='boolean' AND jsonb_typeof("review_checks"."manual"->'thirdPartyAssets')='boolean' AND jsonb_typeof("review_checks"."manual"->'recipientConfirmed')='boolean')
);
--> statement-breakpoint
CREATE TABLE "review_package_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"session_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"checksum" text NOT NULL,
	"target_hash" text NOT NULL,
	"check_version" integer NOT NULL,
	"cutoff" integer NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"file_refs" jsonb NOT NULL,
	CONSTRAINT "review_snapshot_owner_key" UNIQUE("owner_id","idempotency_key"),
	CONSTRAINT "review_snapshot_manifest" CHECK ("review_package_snapshots"."manifest" IS NULL OR (jsonb_typeof("review_package_snapshots"."manifest") = 'object' AND "review_package_snapshots"."manifest" ? 'schemaVersion' AND "review_package_snapshots"."manifest"->'schemaVersion' = '1'::jsonb AND octet_length("review_package_snapshots"."manifest"::text) <= 65536)),
	CONSTRAINT "review_snapshot_identity" CHECK ("review_package_snapshots"."actor_id"="review_package_snapshots"."owner_id" AND "review_package_snapshots"."checksum" ~ '^[a-f0-9]{64}$' AND "review_package_snapshots"."target_hash" ~ '^[a-f0-9]{64}$' AND "review_package_snapshots"."request_hash" ~ '^[a-f0-9]{64}$' AND "review_package_snapshots"."idempotency_key" ~ '^[A-Za-z0-9_-]{1,128}$' AND "review_package_snapshots"."check_version">0 AND "review_package_snapshots"."cutoff">=0 AND jsonb_typeof("review_package_snapshots"."file_refs")='array' AND octet_length("review_package_snapshots"."file_refs"::text)<=65536)
);
--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_session_id_asset_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."asset_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_package_snapshots" ADD CONSTRAINT "review_package_snapshots_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_package_snapshots" ADD CONSTRAINT "review_package_snapshots_session_id_asset_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."asset_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_package_snapshots" ADD CONSTRAINT "review_package_snapshots_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_snapshot_session" ON "review_package_snapshots" USING btree ("owner_id","session_id","issued_at");
--> statement-breakpoint
CREATE FUNCTION claps_review_relations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM asset_sessions WHERE id=NEW.session_id AND owner_id=NEW.owner_id) THEN
  RAISE EXCEPTION 'REVIEW_OWNER_RELATION' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='review_package_snapshots' THEN
  IF NEW.manifest->>'sessionId' IS DISTINCT FROM NEW.session_id
   OR NEW.manifest->>'actorId' IS DISTINCT FROM NEW.actor_id
   OR NEW.manifest->>'targetHash' IS DISTINCT FROM NEW.target_hash
   OR NEW.manifest->>'checkVersion' IS DISTINCT FROM NEW.check_version::text
   OR NEW.manifest->'target'->>'cutoff' IS DISTINCT FROM NEW.cutoff::text
   OR NEW.manifest->>'locale' IS DISTINCT FROM 'ja'
   OR NEW.manifest->>'format' IS DISTINCT FROM 'browser-print'
   OR (NEW.manifest->>'issuedAt')::timestamptz IS DISTINCT FROM NEW.issued_at THEN
   RAISE EXCEPTION 'REVIEW_MANIFEST_RELATION' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER review_checks_relations BEFORE INSERT OR UPDATE ON review_checks FOR EACH ROW EXECUTE FUNCTION claps_review_relations();
--> statement-breakpoint
CREATE TRIGGER review_snapshot_relations BEFORE INSERT ON review_package_snapshots FOR EACH ROW EXECUTE FUNCTION claps_review_relations();
--> statement-breakpoint
CREATE FUNCTION claps_review_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'REVIEW_SNAPSHOT_APPEND_ONLY' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER review_snapshot_immutable BEFORE UPDATE OR DELETE ON review_package_snapshots FOR EACH ROW EXECUTE FUNCTION claps_review_immutable();
--> statement-breakpoint
CREATE TRIGGER review_snapshot_no_truncate BEFORE TRUNCATE ON review_package_snapshots FOR EACH STATEMENT EXECUTE FUNCTION claps_review_immutable();
