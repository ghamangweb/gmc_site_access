-- Sensitive columns become ciphertext written by the app (see
-- src/lib/db/encrypted-columns.ts). This migration only changes shapes; it
-- cannot encrypt, because the key is the app's. Run
-- `bun run db:backfill:encryption` straight after it: until then existing rows
-- stay readable (the app passes plaintext through) but passport lookup misses
-- them, because their hash below is a placeholder.
ALTER TABLE "persons" DROP CONSTRAINT "persons_passportNo_unique";--> statement-breakpoint
ALTER TABLE "hospital_clearances" DROP CONSTRAINT "hospital_clearances_clearance_status_check";--> statement-breakpoint
ALTER TABLE "engagements" ALTER COLUMN "reception_data" SET DATA TYPE text USING "reception_data"::text;--> statement-breakpoint
ALTER TABLE "persons" ALTER COLUMN "date_of_birth" SET DATA TYPE text USING "date_of_birth"::text;--> statement-breakpoint
ALTER TABLE "registration_requests" ALTER COLUMN "form_data" SET DATA TYPE text USING "form_data"::text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "passport_no_hash" text;--> statement-breakpoint
UPDATE "persons" SET "passport_no_hash" = 'pending:' || "id"::text;--> statement-breakpoint
ALTER TABLE "persons" ALTER COLUMN "passport_no_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "search_tokens" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_passportNoHash_unique" UNIQUE("passport_no_hash");
