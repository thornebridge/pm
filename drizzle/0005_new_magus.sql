CREATE TABLE "booking_availability_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type_id" text NOT NULL,
	"user_id" text,
	"date" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"is_blocked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_availability_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type_id" text NOT NULL,
	"user_id" text,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_custom_field_values" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"field_id" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_custom_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type_id" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"placeholder" text,
	"options" text,
	"position" integer DEFAULT 0 NOT NULL,
	"conditional_field_id" text,
	"conditional_value" text
);
--> statement-breakpoint
CREATE TABLE "booking_event_type_members" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type_id" text NOT NULL,
	"user_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_event_types" ADD COLUMN "scheduling_type" text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_event_types" ADD COLUMN "round_robin_mode" text;--> statement-breakpoint
ALTER TABLE "booking_event_types" ADD COLUMN "last_assigned_user_id" text;--> statement-breakpoint
ALTER TABLE "booking_event_types" ADD COLUMN "logo_data" text;--> statement-breakpoint
ALTER TABLE "booking_event_types" ADD COLUMN "logo_mime_type" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "meet_link" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "assigned_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "lead_id" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "logo_data" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "logo_mime_type" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_provider" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_api_key" text;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "ai_endpoint" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "logo_data" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "logo_mime_type" text;--> statement-breakpoint
ALTER TABLE "booking_availability_overrides" ADD CONSTRAINT "booking_availability_overrides_event_type_id_booking_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."booking_event_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_availability_overrides" ADD CONSTRAINT "booking_availability_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_availability_schedules" ADD CONSTRAINT "booking_availability_schedules_event_type_id_booking_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."booking_event_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_availability_schedules" ADD CONSTRAINT "booking_availability_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_custom_field_values" ADD CONSTRAINT "booking_custom_field_values_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_custom_field_values" ADD CONSTRAINT "booking_custom_field_values_field_id_booking_custom_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."booking_custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_custom_fields" ADD CONSTRAINT "booking_custom_fields_event_type_id_booking_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."booking_event_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_event_type_members" ADD CONSTRAINT "booking_event_type_members_event_type_id_booking_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."booking_event_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_event_type_members" ADD CONSTRAINT "booking_event_type_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_avail_override_event_date" ON "booking_availability_overrides" USING btree ("event_type_id","user_id","date");--> statement-breakpoint
CREATE INDEX "idx_avail_sched_event_type" ON "booking_availability_schedules" USING btree ("event_type_id","user_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_custom_field_values_booking" ON "booking_custom_field_values" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_event" ON "booking_custom_fields" USING btree ("event_type_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_type_member_unique" ON "booking_event_type_members" USING btree ("event_type_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_event_type_members_event" ON "booking_event_type_members" USING btree ("event_type_id","position");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crm_tasks_lead" ON "crm_tasks" USING btree ("lead_id");