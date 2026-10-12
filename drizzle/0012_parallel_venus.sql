ALTER TABLE "invitations" ADD COLUMN "registration_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "registration_type" text NOT NULL;
