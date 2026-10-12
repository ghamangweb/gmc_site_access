--> statement-breakpoint
-- Storage moved from Azure Blob to UploadThing. Every existing row points at
-- a blob that is being abandoned, and the new columns are NOT NULL, so the
-- table is emptied first. Agreed with the product owner: no uploaded file
-- from before this migration needs to be kept.
DELETE FROM "documents";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_url" text NOT NULL;
