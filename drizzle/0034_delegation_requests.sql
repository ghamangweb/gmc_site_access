ALTER TABLE "engagements" ADD COLUMN "delegation_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "delegation_requested_by" uuid;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "delegation_request_reason" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_delegation_requested_by_staff_users_id_fk" FOREIGN KEY ("delegation_requested_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
