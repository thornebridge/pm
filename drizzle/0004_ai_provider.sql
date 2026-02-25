ALTER TABLE "org_settings" ADD COLUMN "ai_enabled" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_provider" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_api_key" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_endpoint" text;
