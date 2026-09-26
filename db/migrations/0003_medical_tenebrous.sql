ALTER TABLE "storage_tickets" DROP CONSTRAINT "storage_tickets_target";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "lease_token" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "dispatched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cost_state" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_retry_child" UNIQUE("retry_of_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cost_state" CHECK ("jobs"."cost_state" IN ('not_started','unknown','confirmed','none'));--> statement-breakpoint
ALTER TABLE "storage_tickets" ADD CONSTRAINT "storage_tickets_target" CHECK ("storage_tickets"."target_type" IN ('project','asset','job'));