ALTER TABLE "gmail_integrations" ADD COLUMN "sync_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "gmail_integrations" ADD COLUMN "sync_error" text;