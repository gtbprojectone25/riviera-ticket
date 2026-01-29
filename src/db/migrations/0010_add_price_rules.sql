CREATE TABLE "price_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "cinema_id" text,
  "auditorium_id" uuid,
  "session_id" uuid,
  "days_of_week" integer[],
  "start_minute" integer,
  "end_minute" integer,
  "price_cents" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_cinema_id_cinemas_id_fk" FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_auditorium_id_auditoriums_id_fk" FOREIGN KEY ("auditorium_id") REFERENCES "public"."auditoriums"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_price_rules_priority" ON "price_rules" USING btree ("priority");
--> statement-breakpoint
CREATE INDEX "idx_price_rules_cinema_id" ON "price_rules" USING btree ("cinema_id");
--> statement-breakpoint
CREATE INDEX "idx_price_rules_auditorium_id" ON "price_rules" USING btree ("auditorium_id");
--> statement-breakpoint
CREATE INDEX "idx_price_rules_session_id" ON "price_rules" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "idx_price_rules_active" ON "price_rules" USING btree ("is_active");
