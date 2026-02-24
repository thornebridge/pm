-- New columns on booking_event_types
ALTER TABLE "booking_event_types" ADD COLUMN "scheduling_type" text DEFAULT 'individual' NOT NULL;
ALTER TABLE "booking_event_types" ADD COLUMN "round_robin_mode" text;
ALTER TABLE "booking_event_types" ADD COLUMN "last_assigned_user_id" text;
ALTER TABLE "booking_event_types" ADD COLUMN "logo_data" text;
ALTER TABLE "booking_event_types" ADD COLUMN "logo_mime_type" text;

-- New columns on bookings
ALTER TABLE "bookings" ADD COLUMN "meet_link" text;
ALTER TABLE "bookings" ADD COLUMN "assigned_user_id" text REFERENCES "users"("id") ON DELETE SET NULL;

-- Availability schedules
CREATE TABLE "booking_availability_schedules" (
    "id" text PRIMARY KEY NOT NULL,
    "event_type_id" text NOT NULL REFERENCES "booking_event_types"("id") ON DELETE CASCADE,
    "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
    "day_of_week" integer NOT NULL,
    "start_time" text NOT NULL,
    "end_time" text NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL
);
CREATE INDEX "idx_avail_sched_event_type" ON "booking_availability_schedules" ("event_type_id", "user_id", "day_of_week");

-- Availability overrides
CREATE TABLE "booking_availability_overrides" (
    "id" text PRIMARY KEY NOT NULL,
    "event_type_id" text NOT NULL REFERENCES "booking_event_types"("id") ON DELETE CASCADE,
    "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
    "date" text NOT NULL,
    "start_time" text,
    "end_time" text,
    "is_blocked" boolean DEFAULT false NOT NULL
);
CREATE INDEX "idx_avail_override_event_date" ON "booking_availability_overrides" ("event_type_id", "user_id", "date");

-- Event type members (for round robin)
CREATE TABLE "booking_event_type_members" (
    "id" text PRIMARY KEY NOT NULL,
    "event_type_id" text NOT NULL REFERENCES "booking_event_types"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "position" integer DEFAULT 0 NOT NULL
);
CREATE UNIQUE INDEX "idx_event_type_member_unique" ON "booking_event_type_members" ("event_type_id", "user_id");
CREATE INDEX "idx_event_type_members_event" ON "booking_event_type_members" ("event_type_id", "position");

-- Custom fields
CREATE TABLE "booking_custom_fields" (
    "id" text PRIMARY KEY NOT NULL,
    "event_type_id" text NOT NULL REFERENCES "booking_event_types"("id") ON DELETE CASCADE,
    "label" text NOT NULL,
    "type" text NOT NULL,
    "required" boolean DEFAULT false NOT NULL,
    "placeholder" text,
    "options" text,
    "position" integer DEFAULT 0 NOT NULL,
    "conditional_field_id" text,
    "conditional_value" text
);
CREATE INDEX "idx_custom_fields_event" ON "booking_custom_fields" ("event_type_id", "position");

-- Custom field values
CREATE TABLE "booking_custom_field_values" (
    "id" text PRIMARY KEY NOT NULL,
    "booking_id" text NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
    "field_id" text NOT NULL REFERENCES "booking_custom_fields"("id") ON DELETE CASCADE,
    "value" text NOT NULL
);
CREATE INDEX "idx_custom_field_values_booking" ON "booking_custom_field_values" ("booking_id");

-- Seed default availability schedules for existing event types (Mon-Fri 9-5, Sat-Sun disabled)
INSERT INTO "booking_availability_schedules" ("id", "event_type_id", "user_id", "day_of_week", "start_time", "end_time", "enabled")
SELECT
    'bas_' || bet.id || '_' || d.dow,
    bet.id,
    NULL,
    d.dow,
    '09:00',
    '17:00',
    CASE WHEN d.dow BETWEEN 1 AND 5 THEN true ELSE false END
FROM booking_event_types bet
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(dow);

-- Backfill assigned_user_id on existing bookings
UPDATE "bookings" SET "assigned_user_id" = (
    SELECT "user_id" FROM "booking_event_types" WHERE "booking_event_types"."id" = "bookings"."event_type_id"
) WHERE "assigned_user_id" IS NULL;
