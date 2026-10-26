CREATE TABLE "stakeholder_rejections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"approver_role" text NOT NULL,
	"approver_staff_user_id" uuid NOT NULL,
	"approver_name" text NOT NULL,
	"reason" text NOT NULL,
	"is_delegated" boolean DEFAULT false NOT NULL,
	"rejected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "approval_rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stakeholder_rejections" ADD CONSTRAINT "stakeholder_rejections_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_rejections" ADD CONSTRAINT "stakeholder_rejections_approver_staff_user_id_staff_users_id_fk" FOREIGN KEY ("approver_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- DMD became Engineering Manager (EM). Hand-added: move every holder over, and
-- any access request still asking for DMD. Past approvals keep "DMD" in
-- stakeholder_approvals.approver_role: that is what was signed at the time.
UPDATE "staff_users" SET "workflow_roles" = array_replace("workflow_roles", 'DMD', 'EM') WHERE 'DMD' = ANY("workflow_roles");--> statement-breakpoint
UPDATE "notifications" SET "requested_role" = 'EM' WHERE "requested_role" = 'DMD';
