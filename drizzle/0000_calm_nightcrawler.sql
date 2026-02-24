CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"detail" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"task_id" text,
	"trigger_event" text NOT NULL,
	"status" text NOT NULL,
	"actions_run" text,
	"error" text,
	"duration_ms" integer,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" text NOT NULL,
	"conditions" text,
	"actions" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_event_types" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"location" text,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"min_notice_hours" integer DEFAULT 4 NOT NULL,
	"max_days_out" integer DEFAULT 60 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "booking_event_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type_id" text NOT NULL,
	"invitee_name" text NOT NULL,
	"invitee_email" text NOT NULL,
	"start_time" bigint NOT NULL,
	"end_time" bigint NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"notes" text,
	"google_event_id" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expiry" bigint NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "calendar_integrations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "comment_reactions_comment_id_user_id_emoji_pk" PRIMARY KEY("comment_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"company_id" text,
	"contact_id" text,
	"opportunity_id" text,
	"scheduled_at" bigint,
	"completed_at" bigint,
	"duration_minutes" integer,
	"user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_automation_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"trigger_event" text NOT NULL,
	"status" text NOT NULL,
	"actions_run" text,
	"error" text,
	"duration_ms" integer,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_automation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"entity_type" text NOT NULL,
	"trigger" text NOT NULL,
	"conditions" text,
	"actions" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"industry" text,
	"size" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'US',
	"notes" text,
	"owner_id" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"title" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source" text,
	"notes" text,
	"owner_id" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_custom_field_defs" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"field_name" text NOT NULL,
	"label" text NOT NULL,
	"field_type" text NOT NULL,
	"options" text,
	"required" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"show_in_list" boolean DEFAULT false NOT NULL,
	"show_in_card" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_custom_field_values" (
	"id" text PRIMARY KEY NOT NULL,
	"field_def_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"value" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"company_id" text NOT NULL,
	"contact_id" text,
	"stage_id" text NOT NULL,
	"value" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"probability" integer,
	"expected_close_date" bigint,
	"actual_close_date" bigint,
	"priority" text DEFAULT 'warm' NOT NULL,
	"source" text,
	"description" text,
	"lost_reason" text,
	"forecast_category" text,
	"next_step" text,
	"next_step_due_date" bigint,
	"stage_entered_at" bigint,
	"position" double precision NOT NULL,
	"owner_id" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_opportunity_contacts" (
	"opportunity_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"role" text,
	"influence" text,
	"sentiment" text,
	"notes" text,
	CONSTRAINT "crm_opportunity_contacts_opportunity_id_contact_id_pk" PRIMARY KEY("opportunity_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "crm_opportunity_items" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"product_id" text NOT NULL,
	"price_tier_id" text,
	"description" text,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"unit_amount" integer NOT NULL,
	"discount_percent" integer,
	"discount_amount" integer,
	"setup_fee" integer,
	"billing_model" text,
	"billing_interval" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"position" integer NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_price_brackets" (
	"id" text PRIMARY KEY NOT NULL,
	"price_tier_id" text NOT NULL,
	"min_units" integer NOT NULL,
	"max_units" integer,
	"unit_amount" integer NOT NULL,
	"flat_amount" integer,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_price_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"billing_model" text DEFAULT 'one_time' NOT NULL,
	"unit_amount" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"billing_interval" text,
	"setup_fee" integer,
	"trial_days" integer,
	"unit_label" text,
	"min_quantity" integer,
	"max_quantity" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"description" text,
	"category" text,
	"type" text DEFAULT 'service' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"taxable" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_proposal_items" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"opportunity_item_id" text,
	"product_name" text NOT NULL,
	"product_sku" text,
	"description" text,
	"quantity" double precision NOT NULL,
	"unit_amount" integer NOT NULL,
	"discount_percent" integer,
	"discount_amount" integer,
	"setup_fee" integer,
	"billing_model" text,
	"billing_interval" text,
	"line_total" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" bigint,
	"expires_at" bigint,
	"responded_at" bigint,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" bigint,
	"completed_at" bigint,
	"priority" text DEFAULT 'medium' NOT NULL,
	"company_id" text,
	"contact_id" text,
	"opportunity_id" text,
	"assignee_id" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dial_queue_items" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"position" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"disposition" text,
	"notes" text,
	"callback_at" bigint,
	"call_log_id" text,
	"crm_activity_id" text,
	"call_duration_seconds" integer,
	"dialed_at" bigint,
	"completed_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dial_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"user_id" text NOT NULL,
	"total_contacts" integer DEFAULT 0 NOT NULL,
	"completed_contacts" integer DEFAULT 0 NOT NULL,
	"total_connected" integer DEFAULT 0 NOT NULL,
	"total_no_answer" integer DEFAULT 0 NOT NULL,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"started_at" bigint,
	"ended_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "due_date_reminders_sent" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text NOT NULL,
	"tier" text NOT NULL,
	"sent_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_number" integer NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"subtype" text,
	"description" text,
	"parent_id" text,
	"normal_balance" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "fin_accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "fin_bank_account_meta" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"institution_name" text,
	"account_number_last4" text,
	"routing_number" text,
	"account_subtype" text NOT NULL,
	"opening_balance" integer DEFAULT 0 NOT NULL,
	"opening_balance_date" bigint,
	"last_reconciled_date" bigint,
	"last_reconciled_balance" integer,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "fin_bank_account_meta_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "fin_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"period_type" text NOT NULL,
	"period_start" bigint NOT NULL,
	"period_end" bigint NOT NULL,
	"amount" integer NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_number" integer NOT NULL,
	"date" bigint NOT NULL,
	"description" text NOT NULL,
	"memo" text,
	"reference_number" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"crm_opportunity_id" text,
	"crm_proposal_id" text,
	"crm_company_id" text,
	"voided_entry_id" text,
	"voided_at" bigint,
	"void_reason" text,
	"recurring_rule_id" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_journal_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"journal_entry_id" text NOT NULL,
	"account_id" text NOT NULL,
	"debit" integer DEFAULT 0 NOT NULL,
	"credit" integer DEFAULT 0 NOT NULL,
	"memo" text,
	"position" integer DEFAULT 0 NOT NULL,
	"reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_reconciliations" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_account_id" text NOT NULL,
	"statement_date" bigint NOT NULL,
	"statement_balance" integer NOT NULL,
	"reconciled_balance" integer,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"completed_at" bigint,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_recurring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"frequency" text NOT NULL,
	"start_date" bigint NOT NULL,
	"end_date" bigint,
	"next_occurrence" bigint NOT NULL,
	"auto_post" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"template_description" text NOT NULL,
	"template_lines" text NOT NULL,
	"last_generated_at" bigint,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" text,
	"color" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"gmail_attachment_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_entity_links" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"contact_id" text,
	"company_id" text,
	"opportunity_id" text,
	"link_type" text DEFAULT 'auto' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expiry" bigint NOT NULL,
	"history_id" text,
	"last_sync_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "gmail_integrations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "gmail_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text,
	"to_emails" text NOT NULL,
	"cc_emails" text,
	"bcc_emails" text,
	"subject" text NOT NULL,
	"body_html" text,
	"body_text" text,
	"snippet" text,
	"internal_date" bigint NOT NULL,
	"label_ids" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"synced_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"snippet" text,
	"last_message_at" bigint NOT NULL,
	"message_count" integer DEFAULT 1 NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"labels" text,
	"category" text DEFAULT 'inbox' NOT NULL,
	"synced_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'member' NOT NULL,
	"created_by" text NOT NULL,
	"used_by" text,
	"expires_at" bigint NOT NULL,
	"used_at" bigint,
	"created_at" bigint NOT NULL,
	CONSTRAINT "invite_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"on_assigned" boolean DEFAULT true NOT NULL,
	"on_status_change" boolean DEFAULT true NOT NULL,
	"on_comment" boolean DEFAULT true NOT NULL,
	"on_mention" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"reminder_due_soon" boolean DEFAULT true NOT NULL,
	"reminder_due_today" boolean DEFAULT true NOT NULL,
	"reminder_overdue" boolean DEFAULT true NOT NULL,
	"due_date_email_mode" text DEFAULT 'off' NOT NULL,
	"digest_day" integer DEFAULT 1 NOT NULL,
	"digest_hour" integer DEFAULT 8 NOT NULL,
	"last_digest_sent_at" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"url" text,
	"task_id" text,
	"actor_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"platform_name" text DEFAULT 'PM' NOT NULL,
	"telnyx_enabled" boolean DEFAULT false NOT NULL,
	"telnyx_api_key" text,
	"telnyx_connection_id" text,
	"telnyx_credential_id" text,
	"telnyx_caller_number" text,
	"telnyx_record_calls" boolean DEFAULT false NOT NULL,
	"google_client_id" text,
	"google_client_secret" text,
	"email_provider" text,
	"email_from_address" text,
	"resend_api_key" text,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#2d4f3e' NOT NULL,
	"folder_id" text,
	"archived" boolean DEFAULT false NOT NULL,
	"readme" text,
	"default_assignee_id" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys_p256dh" text NOT NULL,
	"keys_auth" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" text NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprint_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"sprint_id" text NOT NULL,
	"date" bigint NOT NULL,
	"total_tasks" integer NOT NULL,
	"completed_tasks" integer NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"completed_points" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"start_date" bigint,
	"end_date" bigint,
	"status" text DEFAULT 'planning' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"task_id" text NOT NULL,
	"depends_on_task_id" text NOT NULL,
	"type" text DEFAULT 'blocks' NOT NULL,
	CONSTRAINT "task_dependencies_task_id_depends_on_task_id_pk" PRIMARY KEY("task_id","depends_on_task_id")
);
--> statement-breakpoint
CREATE TABLE "task_label_assignments" (
	"task_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "task_label_assignments_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"position" integer NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'task',
	"priority" text DEFAULT 'medium',
	"label_ids" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_watchers" (
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "task_watchers_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status_id" text NOT NULL,
	"type" text DEFAULT 'task' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assignee_id" text,
	"parent_id" text,
	"created_by" text NOT NULL,
	"due_date" bigint,
	"start_date" bigint,
	"sprint_id" text,
	"estimate_points" integer,
	"recurrence" text,
	"recurrence_source_id" text,
	"position" double precision NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telnyx_call_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"telnyx_call_control_id" text,
	"telnyx_call_session_id" text,
	"direction" text NOT NULL,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"started_at" bigint,
	"answered_at" bigint,
	"ended_at" bigint,
	"duration_seconds" integer,
	"recording_url" text,
	"contact_id" text,
	"company_id" text,
	"crm_activity_id" text,
	"user_id" text NOT NULL,
	"notes" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"description" text,
	"started_at" bigint NOT NULL,
	"stopped_at" bigint,
	"duration_ms" integer,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_themes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source" text NOT NULL,
	"variables" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"active_theme_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_event_types" ADD CONSTRAINT "booking_event_types_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_type_id_booking_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."booking_event_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_rule_id_crm_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."crm_automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_custom_field_defs" ADD CONSTRAINT "crm_custom_field_defs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_custom_field_values" ADD CONSTRAINT "crm_custom_field_values_field_def_id_crm_custom_field_defs_id_fk" FOREIGN KEY ("field_def_id") REFERENCES "public"."crm_custom_field_defs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity_contacts" ADD CONSTRAINT "crm_opportunity_contacts_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity_contacts" ADD CONSTRAINT "crm_opportunity_contacts_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity_items" ADD CONSTRAINT "crm_opportunity_items_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity_items" ADD CONSTRAINT "crm_opportunity_items_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunity_items" ADD CONSTRAINT "crm_opportunity_items_price_tier_id_crm_price_tiers_id_fk" FOREIGN KEY ("price_tier_id") REFERENCES "public"."crm_price_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_price_brackets" ADD CONSTRAINT "crm_price_brackets_price_tier_id_crm_price_tiers_id_fk" FOREIGN KEY ("price_tier_id") REFERENCES "public"."crm_price_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_price_tiers" ADD CONSTRAINT "crm_price_tiers_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposal_items" ADD CONSTRAINT "crm_proposal_items_proposal_id_crm_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."crm_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposal_items" ADD CONSTRAINT "crm_proposal_items_opportunity_item_id_crm_opportunity_items_id_fk" FOREIGN KEY ("opportunity_item_id") REFERENCES "public"."crm_opportunity_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposals" ADD CONSTRAINT "crm_proposals_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_proposals" ADD CONSTRAINT "crm_proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_queue_items" ADD CONSTRAINT "dial_queue_items_session_id_dial_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dial_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_queue_items" ADD CONSTRAINT "dial_queue_items_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_queue_items" ADD CONSTRAINT "dial_queue_items_call_log_id_telnyx_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."telnyx_call_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_queue_items" ADD CONSTRAINT "dial_queue_items_crm_activity_id_crm_activities_id_fk" FOREIGN KEY ("crm_activity_id") REFERENCES "public"."crm_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_sessions" ADD CONSTRAINT "dial_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "due_date_reminders_sent" ADD CONSTRAINT "due_date_reminders_sent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "due_date_reminders_sent" ADD CONSTRAINT "due_date_reminders_sent_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_accounts" ADD CONSTRAINT "fin_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_bank_account_meta" ADD CONSTRAINT "fin_bank_account_meta_account_id_fin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."fin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_budgets" ADD CONSTRAINT "fin_budgets_account_id_fin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."fin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_budgets" ADD CONSTRAINT "fin_budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_crm_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("crm_opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_crm_proposal_id_crm_proposals_id_fk" FOREIGN KEY ("crm_proposal_id") REFERENCES "public"."crm_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_crm_company_id_crm_companies_id_fk" FOREIGN KEY ("crm_company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_journal_entry_id_fin_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."fin_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_account_id_fin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."fin_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_reconciliations" ADD CONSTRAINT "fin_reconciliations_bank_account_id_fin_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."fin_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_reconciliations" ADD CONSTRAINT "fin_reconciliations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_recurring_rules" ADD CONSTRAINT "fin_recurring_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_attachments" ADD CONSTRAINT "gmail_attachments_message_id_gmail_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."gmail_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_entity_links" ADD CONSTRAINT "gmail_entity_links_thread_id_gmail_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."gmail_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_entity_links" ADD CONSTRAINT "gmail_entity_links_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_entity_links" ADD CONSTRAINT "gmail_entity_links_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_entity_links" ADD CONSTRAINT "gmail_entity_links_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_integrations" ADD CONSTRAINT "gmail_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_messages" ADD CONSTRAINT "gmail_messages_thread_id_gmail_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."gmail_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_messages" ADD CONSTRAINT "gmail_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_threads" ADD CONSTRAINT "gmail_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_default_assignee_id_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_snapshots" ADD CONSTRAINT "sprint_snapshots_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label_assignments" ADD CONSTRAINT "task_label_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label_assignments" ADD CONSTRAINT "task_label_assignments_label_id_task_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."task_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_id_task_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."task_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telnyx_call_logs" ADD CONSTRAINT "telnyx_call_logs_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telnyx_call_logs" ADD CONSTRAINT "telnyx_call_logs_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telnyx_call_logs" ADD CONSTRAINT "telnyx_call_logs_crm_activity_id_crm_activities_id_fk" FOREIGN KEY ("crm_activity_id") REFERENCES "public"."crm_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telnyx_call_logs" ADD CONSTRAINT "telnyx_call_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_themes" ADD CONSTRAINT "user_themes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_task" ON "activity_log" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_attachments_task" ON "attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_automation_exec_rule" ON "automation_executions" USING btree ("rule_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_automation_exec_task" ON "automation_executions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_project" ON "automation_rules" USING btree ("project_id","enabled");--> statement-breakpoint
CREATE INDEX "idx_booking_event_types_user" ON "booking_event_types" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_booking_event_types_slug" ON "booking_event_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_bookings_event_type" ON "bookings" USING btree ("event_type_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_start_time" ON "bookings" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_checklist_task" ON "checklist_items" USING btree ("task_id","position");--> statement-breakpoint
CREATE INDEX "idx_reactions_comment" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_comments_task" ON "comments" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_act_company" ON "crm_activities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_crm_act_contact" ON "crm_activities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_crm_act_opp" ON "crm_activities" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_crm_act_user_date" ON "crm_activities" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_auto_exec_rule" ON "crm_automation_executions" USING btree ("rule_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_auto_exec_entity" ON "crm_automation_executions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_crm_auto_rules_entity" ON "crm_automation_rules" USING btree ("entity_type","enabled");--> statement-breakpoint
CREATE INDEX "idx_crm_companies_owner" ON "crm_companies" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_crm_contacts_company" ON "crm_contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_crm_contacts_owner" ON "crm_contacts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_crm_contacts_email" ON "crm_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_crm_cfd_entity" ON "crm_custom_field_defs" USING btree ("entity_type","position");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_cfd_unique_name" ON "crm_custom_field_defs" USING btree ("entity_type","field_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_cfv_field_entity" ON "crm_custom_field_values" USING btree ("field_def_id","entity_id");--> statement-breakpoint
CREATE INDEX "idx_crm_cfv_entity" ON "crm_custom_field_values" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_crm_opps_company" ON "crm_opportunities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_crm_opps_stage" ON "crm_opportunities" USING btree ("stage_id","position");--> statement-breakpoint
CREATE INDEX "idx_crm_opps_owner" ON "crm_opportunities" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_crm_opps_close" ON "crm_opportunities" USING btree ("expected_close_date");--> statement-breakpoint
CREATE INDEX "idx_crm_opp_items_opp" ON "crm_opportunity_items" USING btree ("opportunity_id","position");--> statement-breakpoint
CREATE INDEX "idx_crm_opp_items_product" ON "crm_opportunity_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_crm_stages_position" ON "crm_pipeline_stages" USING btree ("position");--> statement-breakpoint
CREATE INDEX "idx_crm_price_brackets_tier" ON "crm_price_brackets" USING btree ("price_tier_id","position");--> statement-breakpoint
CREATE INDEX "idx_crm_price_tiers_product" ON "crm_price_tiers" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_products_sku" ON "crm_products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_crm_proposal_items_proposal" ON "crm_proposal_items" USING btree ("proposal_id","position");--> statement-breakpoint
CREATE INDEX "idx_crm_proposals_opp" ON "crm_proposals" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_crm_tasks_assignee" ON "crm_tasks" USING btree ("assignee_id","completed_at");--> statement-breakpoint
CREATE INDEX "idx_crm_tasks_due" ON "crm_tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_dial_queue_session" ON "dial_queue_items" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "idx_dial_queue_contact" ON "dial_queue_items" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_dial_queue_status" ON "dial_queue_items" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "idx_dial_sessions_user" ON "dial_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_dial_sessions_status" ON "dial_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reminders_unique" ON "due_date_reminders_sent" USING btree ("user_id","task_id","tier");--> statement-breakpoint
CREATE INDEX "idx_reminders_task" ON "due_date_reminders_sent" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_fin_accounts_type_active" ON "fin_accounts" USING btree ("account_type","active");--> statement-breakpoint
CREATE INDEX "idx_fin_accounts_parent" ON "fin_accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_fin_budgets_account_period" ON "fin_budgets" USING btree ("account_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fin_budgets_unique" ON "fin_budgets" USING btree ("account_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "idx_fin_je_date" ON "fin_journal_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_fin_je_status_date" ON "fin_journal_entries" USING btree ("status","date");--> statement-breakpoint
CREATE INDEX "idx_fin_je_source" ON "fin_journal_entries" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_fin_je_crm_opp" ON "fin_journal_entries" USING btree ("crm_opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_fin_je_entry_number" ON "fin_journal_entries" USING btree ("entry_number");--> statement-breakpoint
CREATE INDEX "idx_fin_jl_entry_pos" ON "fin_journal_lines" USING btree ("journal_entry_id","position");--> statement-breakpoint
CREATE INDEX "idx_fin_jl_account_entry" ON "fin_journal_lines" USING btree ("account_id","journal_entry_id");--> statement-breakpoint
CREATE INDEX "idx_fin_jl_account_reconciled" ON "fin_journal_lines" USING btree ("account_id","reconciled");--> statement-breakpoint
CREATE INDEX "idx_fin_rr_status_next" ON "fin_recurring_rules" USING btree ("status","next_occurrence");--> statement-breakpoint
CREATE INDEX "idx_fin_rr_next" ON "fin_recurring_rules" USING btree ("next_occurrence");--> statement-breakpoint
CREATE INDEX "idx_gmail_attachments_msg" ON "gmail_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_gmail_links_thread" ON "gmail_entity_links" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_gmail_links_contact" ON "gmail_entity_links" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_gmail_links_company" ON "gmail_entity_links" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_gmail_links_opp" ON "gmail_entity_links" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_gmail_msgs_thread" ON "gmail_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_gmail_msgs_user_date" ON "gmail_messages" USING btree ("user_id","internal_date");--> statement-breakpoint
CREATE INDEX "idx_gmail_msgs_from" ON "gmail_messages" USING btree ("from_email");--> statement-breakpoint
CREATE INDEX "idx_gmail_threads_user" ON "gmail_threads" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_gmail_threads_category" ON "gmail_threads" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE INDEX "idx_views_project_user" ON "saved_views" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_snapshots_sprint" ON "sprint_snapshots" USING btree ("sprint_id","date");--> statement-breakpoint
CREATE INDEX "idx_sprints_project" ON "sprints" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_deps_depends_on" ON "task_dependencies" USING btree ("depends_on_task_id");--> statement-breakpoint
CREATE INDEX "idx_statuses_project" ON "task_statuses" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "idx_tasks_board" ON "tasks" USING btree ("project_id","status_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tasks_number" ON "tasks" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_sprint" ON "tasks" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_parent" ON "tasks" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_telnyx_calls_user" ON "telnyx_call_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_telnyx_calls_contact" ON "telnyx_call_logs" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_telnyx_calls_company" ON "telnyx_call_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_telnyx_calls_session" ON "telnyx_call_logs" USING btree ("telnyx_call_session_id");--> statement-breakpoint
CREATE INDEX "idx_telnyx_calls_status" ON "telnyx_call_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_time_entries_task" ON "time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_user_themes_user" ON "user_themes" USING btree ("user_id");