ALTER TYPE "public"."seat_type" ADD VALUE 'WHEELCHAIR';--> statement-breakpoint
ALTER TYPE "public"."seat_type" ADD VALUE 'GAP';--> statement-breakpoint
ALTER TABLE "auditoriums" ADD COLUMN "layout" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "auditoriums" ADD COLUMN "total_seats" integer NOT NULL;