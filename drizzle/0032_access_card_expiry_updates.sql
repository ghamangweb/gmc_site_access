CREATE TABLE "access_card_expiry_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"access_provisioning_id" uuid NOT NULL,
	"previous_expiry" date NOT NULL,
	"new_expiry" date NOT NULL,
	"comments" text NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_card_expiry_updates" ADD CONSTRAINT "access_card_expiry_updates_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_card_expiry_updates" ADD CONSTRAINT "access_card_expiry_updates_access_provisioning_id_access_provisionings_id_fk" FOREIGN KEY ("access_provisioning_id") REFERENCES "public"."access_provisionings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_card_expiry_updates" ADD CONSTRAINT "access_card_expiry_updates_updated_by_staff_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
