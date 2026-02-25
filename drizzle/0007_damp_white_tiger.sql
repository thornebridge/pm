CREATE TABLE "email_campaign_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"opportunity_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" bigint,
	"gmail_message_id" text,
	"gmail_thread_id" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"template_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"throttle_ms" integer DEFAULT 2000 NOT NULL,
	"started_at" bigint,
	"completed_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"type" text NOT NULL,
	"remind_at" bigint NOT NULL,
	"message_count_at_creation" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"fired_at" bigint,
	"cancelled_at" bigint,
	"cancel_reason" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"subject_template" text NOT NULL,
	"body_template" text NOT NULL,
	"category" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tracking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"token_id" text NOT NULL,
	"type" text NOT NULL,
	"link_url" text,
	"link_token" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tracking_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"thread_id" text,
	"user_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"tracked_links" text,
	"first_opened_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_reminders" ADD CONSTRAINT "email_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_reminders" ADD CONSTRAINT "email_reminders_thread_id_gmail_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."gmail_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tracking_events" ADD CONSTRAINT "email_tracking_events_token_id_email_tracking_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."email_tracking_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tracking_tokens" ADD CONSTRAINT "email_tracking_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_campaign" ON "email_campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_contact" ON "email_campaign_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_campaign_recipients_unique" ON "email_campaign_recipients" USING btree ("campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_user" ON "email_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_status" ON "email_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_reminders_pending" ON "email_reminders" USING btree ("status","remind_at");--> statement-breakpoint
CREATE INDEX "idx_email_reminders_thread" ON "email_reminders" USING btree ("thread_id","status");--> statement-breakpoint
CREATE INDEX "idx_email_reminders_user" ON "email_reminders" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_email_templates_user" ON "email_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_templates_name" ON "email_templates" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "idx_tracking_events_token" ON "email_tracking_events" USING btree ("token_id","type");--> statement-breakpoint
CREATE INDEX "idx_tracking_events_time" ON "email_tracking_events" USING btree ("token_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_tracking_tokens_message" ON "email_tracking_tokens" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_tracking_tokens_user" ON "email_tracking_tokens" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_tracking_tokens_thread" ON "email_tracking_tokens" USING btree ("thread_id");