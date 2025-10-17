ALTER TABLE "companies" ALTER COLUMN "sector" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "time_based_info" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "qualitative_info" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "quantitative_data" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "document_chunks" DROP COLUMN "extracted_facts";