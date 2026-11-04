-- Replaces this branch's former 0029–0031 (recorded_by, next_review_date,
-- review reminder markers), renumbered after main's 0029_workflow_exemptions.
-- IF NOT EXISTS / the guarded constraint make it a no-op on databases that
-- already applied the old three — the shared dev DB among them.
ALTER TABLE "hospital_clearances" ADD COLUMN IF NOT EXISTS "recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "hospital_clearances" ADD COLUMN IF NOT EXISTS "next_review_date" date;--> statement-breakpoint
ALTER TABLE "hospital_clearances" ADD COLUMN IF NOT EXISTS "review_reminder_day_before_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hospital_clearances" ADD COLUMN IF NOT EXISTS "review_reminder_due_sent_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hospital_clearances_recorded_by_staff_users_id_fk'
  ) THEN
    ALTER TABLE "hospital_clearances" ADD CONSTRAINT "hospital_clearances_recorded_by_staff_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
-- Backfill: a Fit / Fit with Conditions clearance and its AtHospital → AtTraining
-- transition are written in one transaction, so both carry the same now(). Unfit
-- writes no transition, so those rows stay NULL ("-" in the UI).
UPDATE "hospital_clearances" AS hc
SET "recorded_by" = wt."performed_by"
FROM "workflow_transitions" AS wt
WHERE hc."recorded_by" IS NULL
  AND wt."workflow_cycle_id" = hc."workflow_cycle_id"
  AND wt."from_state" = 'AtHospital'
  AND wt."to_state" = 'AtTraining'
  AND wt."performed_at" = hc."clearance_date";
