CREATE TABLE "crm_lead_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"position" integer NOT NULL,
	"is_converted" boolean DEFAULT false NOT NULL,
	"is_disqualified" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"title" text,
	"company_name" text,
	"website" text,
	"industry" text,
	"company_size" text,
	"address" text,
	"source" text,
	"status_id" text NOT NULL,
	"notes" text,
	"converted_at" bigint,
	"converted_company_id" text,
	"converted_contact_id" text,
	"converted_opportunity_id" text,
	"owner_id" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD COLUMN "lead_id" text;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_status_id_crm_lead_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."crm_lead_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_company_id_crm_companies_id_fk" FOREIGN KEY ("converted_company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crm_lead_statuses_position" ON "crm_lead_statuses" USING btree ("position");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_status" ON "crm_leads" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_owner" ON "crm_leads" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_email" ON "crm_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_converted" ON "crm_leads" USING btree ("converted_at");--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crm_act_lead" ON "crm_activities" USING btree ("lead_id");--> statement-breakpoint
INSERT INTO "crm_lead_statuses" ("id", "name", "color", "position", "is_converted", "is_disqualified", "created_at") VALUES
	('ls_new', 'New', '#3b82f6', 0, false, false, extract(epoch from now()) * 1000),
	('ls_contacted', 'Contacted', '#eab308', 1, false, false, extract(epoch from now()) * 1000),
	('ls_qualified', 'Qualified', '#22c55e', 2, true, false, extract(epoch from now()) * 1000),
	('ls_unqualified', 'Unqualified', '#ef4444', 3, false, true, extract(epoch from now()) * 1000);