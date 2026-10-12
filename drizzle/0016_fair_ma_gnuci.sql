ALTER TABLE "registration_requests" ADD COLUMN "engagement_id" uuid;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;
