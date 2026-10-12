CREATE TABLE "induction_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_cycle_id" uuid NOT NULL,
	"general_site_induction" boolean DEFAULT false NOT NULL,
	"other_inductions" boolean DEFAULT false NOT NULL,
	"trainer_comments" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "induction_records" ADD CONSTRAINT "induction_records_workflow_cycle_id_workflow_cycles_id_fk" FOREIGN KEY ("workflow_cycle_id") REFERENCES "public"."workflow_cycles"("id") ON DELETE no action ON UPDATE no action;
