DO $$ BEGIN
  CREATE TYPE "public"."session_sales_status" AS ENUM('ACTIVE', 'PAUSED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "sales_status" "session_sales_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_auditorium_id" ON "sessions" USING btree ("auditorium_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_start_time" ON "sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_sessions_sales_status" ON "sessions" USING btree ("sales_status");
