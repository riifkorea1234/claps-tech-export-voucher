ALTER TABLE "jobs" ADD COLUMN "cancel_requested_actor_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cancel_requested_actor_type" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cancel_requested_actor_id_users_id_fk" FOREIGN KEY ("cancel_requested_actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER evidence_no_truncate BEFORE TRUNCATE ON evidence_events FOR EACH STATEMENT EXECUTE FUNCTION claps_evidence_immutable();
