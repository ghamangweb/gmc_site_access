ALTER TABLE "registration_requests" ALTER COLUMN "status" SET DEFAULT 'PendingDepartmentApproval';--> statement-breakpoint
ALTER TABLE "registration_requests" ALTER COLUMN "approved_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_requests" ALTER COLUMN "approved_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "registration_requests" ALTER COLUMN "approved_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "rejected_by" uuid;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_rejected_by_staff_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
