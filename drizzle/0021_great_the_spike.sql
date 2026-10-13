CREATE TABLE "access_provisionings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_cycle_id" uuid NOT NULL,
	"id_type" text NOT NULL,
	"biometric_captured" boolean DEFAULT false NOT NULL,
	"access_card_number" text NOT NULL,
	"access_card_expiry" date NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_provisionings" ADD CONSTRAINT "access_provisionings_workflow_cycle_id_workflow_cycles_id_fk" FOREIGN KEY ("workflow_cycle_id") REFERENCES "public"."workflow_cycles"("id") ON DELETE no action ON UPDATE no action;
