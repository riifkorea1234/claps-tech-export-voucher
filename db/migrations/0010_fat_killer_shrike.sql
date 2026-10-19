CREATE TABLE "evidence_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"session_id" text NOT NULL,
	"asset_id" text,
	"job_id" text,
	"kind" text NOT NULL,
	"actor_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text,
	"origin" text DEFAULT 'native' NOT NULL,
	CONSTRAINT "evidence_session_sequence" UNIQUE("session_id","sequence"),
	CONSTRAINT "evidence_dedupe" UNIQUE("dedupe_key"),
	CONSTRAINT "evidence_origin" CHECK ("evidence_events"."origin" = 'native'),
	CONSTRAINT "evidence_sequence" CHECK ("evidence_events"."sequence" > 0),
	CONSTRAINT "evidence_kind" CHECK ("evidence_events"."kind" IN ('session.created','generate.requested','generate.succeeded','generate.failed','generate.canceled','asset.adopted','asset.unadopted','verify.run','final.added','final.removed','asset.deleted') AND "evidence_events"."payload"->>'kind'="evidence_events"."kind"),
	CONSTRAINT "evidence_payload" CHECK ("evidence_events"."payload" IS NULL OR (jsonb_typeof("evidence_events"."payload") = 'object' AND "evidence_events"."payload" ? 'schemaVersion' AND "evidence_events"."payload"->'schemaVersion' = '1'::jsonb AND octet_length("evidence_events"."payload"::text) <= 65536))
);
--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_session_id_asset_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."asset_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_owner_cursor" ON "evidence_events" USING btree ("owner_id","session_id","sequence");--> statement-breakpoint
CREATE INDEX "evidence_asset_cursor" ON "evidence_events" USING btree ("asset_id","sequence");--> statement-breakpoint
CREATE FUNCTION claps_evidence_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EVIDENCE_APPEND_ONLY' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER evidence_immutable BEFORE UPDATE OR DELETE ON evidence_events FOR EACH ROW EXECUTE FUNCTION claps_evidence_immutable();
--> statement-breakpoint
CREATE FUNCTION claps_evidence_relations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM asset_sessions WHERE id=NEW.session_id AND owner_id=NEW.owner_id)
    OR (NEW.asset_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND session_id=NEW.session_id))
    OR (NEW.job_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jobs WHERE id=NEW.job_id AND owner_id=NEW.owner_id AND (input->>'sessionId'=NEW.session_id OR input->'snapshot'->>'sessionId'=NEW.session_id OR input->'assetIds' ? NEW.asset_id))) THEN
    RAISE EXCEPTION 'EVIDENCE_RELATION_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER evidence_relations BEFORE INSERT ON evidence_events FOR EACH ROW EXECUTE FUNCTION claps_evidence_relations();
