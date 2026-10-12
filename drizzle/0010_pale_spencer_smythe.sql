CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"issued_by" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "invitations_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_issued_by_staff_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
