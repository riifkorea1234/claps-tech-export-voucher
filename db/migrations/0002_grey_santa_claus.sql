CREATE TABLE "storage_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"variant" text DEFAULT 'original' NOT NULL,
	"state" text DEFAULT 'reserved' NOT NULL,
	"metadata" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storage_tickets_kind" CHECK ("storage_tickets"."kind" IN ('upload','download','cleanup')),
	CONSTRAINT "storage_tickets_state" CHECK ("storage_tickets"."state" IN ('reserved','ready','claimed','cleanup_pending')),
	CONSTRAINT "storage_tickets_target" CHECK ("storage_tickets"."target_type" IN ('project','asset')),
	CONSTRAINT "storage_tickets_variant" CHECK ("storage_tickets"."variant" IN ('original','thumbnail'))
);
--> statement-breakpoint
ALTER TABLE "storage_tickets" ADD CONSTRAINT "storage_tickets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "storage_tickets_expiry" ON "storage_tickets" USING btree ("state","expires_at");--> statement-breakpoint
CREATE INDEX "storage_tickets_owner" ON "storage_tickets" USING btree ("owner_id");