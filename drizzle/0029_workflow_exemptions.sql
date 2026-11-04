CREATE TABLE "workflow_exemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"workflow_cycle_id" uuid NOT NULL,
	"stakeholder_approval_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "workflow_exemptions_stage_check" CHECK ("workflow_exemptions"."stage" in ('Hospital', 'Training'))
);
--> statement-breakpoint
-- Referenced composite unique constraints must exist before their foreign keys.
ALTER TABLE "stakeholder_approvals" ADD CONSTRAINT "stakeholder_approvals_id_engagement_unique" UNIQUE("id","engagement_id");--> statement-breakpoint
ALTER TABLE "workflow_cycles" ADD CONSTRAINT "workflow_cycles_id_engagement_unique" UNIQUE("id","engagement_id");--> statement-breakpoint
ALTER TABLE "workflow_exemptions" ADD CONSTRAINT "workflow_exemptions_cycle_engagement_fk" FOREIGN KEY ("workflow_cycle_id","engagement_id") REFERENCES "public"."workflow_cycles"("id","engagement_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_exemptions" ADD CONSTRAINT "workflow_exemptions_approval_engagement_fk" FOREIGN KEY ("stakeholder_approval_id","engagement_id") REFERENCES "public"."stakeholder_approvals"("id","engagement_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_exemptions_cycle_stage_unique" ON "workflow_exemptions" USING btree ("workflow_cycle_id","stage");
