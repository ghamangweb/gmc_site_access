CREATE TABLE "stay_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"previous_departure_date" date NOT NULL,
	"new_departure_date" date NOT NULL,
	"reason" text NOT NULL,
	"signature" text NOT NULL,
	"extended_by" uuid NOT NULL,
	"extended_by_name" text NOT NULL,
	"extended_by_role" text NOT NULL,
	"extended_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stay_extensions" ADD CONSTRAINT "stay_extensions_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_extensions" ADD CONSTRAINT "stay_extensions_extended_by_staff_users_id_fk" FOREIGN KEY ("extended_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
