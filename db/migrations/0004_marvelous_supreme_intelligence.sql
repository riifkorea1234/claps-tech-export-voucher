ALTER TABLE "auth_sessions" ADD COLUMN "admin_verified_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "localized_contents" ADD COLUMN "published_source_revision" integer;--> statement-breakpoint
ALTER TABLE "localized_contents" ADD COLUMN "published_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE localized_contents SET published_source_revision=source_revision,published_version=1 WHERE published IS NOT NULL;
