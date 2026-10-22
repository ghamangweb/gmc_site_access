ALTER TABLE "termination_requests" ADD COLUMN "requested_at" timestamp with time zone DEFAULT now() NOT NULL;
