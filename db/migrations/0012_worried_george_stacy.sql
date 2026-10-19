CREATE TABLE "monitoring_feedback_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"record_id" text NOT NULL,
	"job_id" text NOT NULL,
	"result_index" integer NOT NULL,
	"result_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_owner_action_key" UNIQUE("owner_id","action","idempotency_key"),
	CONSTRAINT "feedback_result_sequence" UNIQUE("job_id","result_index","sequence"),
	CONSTRAINT "feedback_result" CHECK ("monitoring_feedback_events"."result_index" BETWEEN 0 AND 49 AND "monitoring_feedback_events"."result_id"="monitoring_feedback_events"."job_id" || ':' || "monitoring_feedback_events"."result_index"::text),
	CONSTRAINT "feedback_action" CHECK (("monitoring_feedback_events"."action"='reported' AND "monitoring_feedback_events"."reason" IS NOT NULL AND "monitoring_feedback_events"."reason" IN ('different_subject','licensed_use','own_content','other')) OR ("monitoring_feedback_events"."action"='withdrawn' AND "monitoring_feedback_events"."reason" IS NULL)),
	CONSTRAINT "feedback_identity" CHECK ("monitoring_feedback_events"."actor_id"="monitoring_feedback_events"."owner_id" AND "monitoring_feedback_events"."idempotency_key" ~ '^[A-Za-z0-9_-]{1,128}$' AND "monitoring_feedback_events"."request_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "feedback_sequence" CHECK ("monitoring_feedback_events"."sequence" > 0)
);
--> statement-breakpoint
ALTER TABLE "monitoring_feedback_events" ADD CONSTRAINT "monitoring_feedback_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_feedback_events" ADD CONSTRAINT "monitoring_feedback_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_feedback_events" ADD CONSTRAINT "monitoring_feedback_events_record_id_monitoring_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."monitoring_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_feedback_events" ADD CONSTRAINT "monitoring_feedback_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_latest" ON "monitoring_feedback_events" USING btree ("owner_id","job_id","result_index","sequence");--> statement-breakpoint
CREATE FUNCTION claps_feedback_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'FEEDBACK_APPEND_ONLY' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER feedback_immutable BEFORE UPDATE OR DELETE ON monitoring_feedback_events FOR EACH ROW EXECUTE FUNCTION claps_feedback_immutable();
--> statement-breakpoint
CREATE TRIGGER feedback_no_truncate BEFORE TRUNCATE ON monitoring_feedback_events FOR EACH STATEMENT EXECUTE FUNCTION claps_feedback_immutable();
--> statement-breakpoint
CREATE FUNCTION claps_feedback_relations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM monitoring_records WHERE id=NEW.record_id AND owner_id=NEW.owner_id)
    OR NOT EXISTS(SELECT 1 FROM jobs WHERE id=NEW.job_id AND owner_id=NEW.owner_id AND kind='monitoring' AND status='succeeded'
      AND input->>'recordId'=NEW.record_id AND output->>'recordId'=NEW.record_id AND output->>'kind'='monitoring'
      AND jsonb_typeof(output->'result'->'items')='array' AND jsonb_array_length(output->'result'->'items')>NEW.result_index) THEN
    RAISE EXCEPTION 'FEEDBACK_RELATION_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER feedback_relations BEFORE INSERT ON monitoring_feedback_events FOR EACH ROW EXECUTE FUNCTION claps_feedback_relations();
