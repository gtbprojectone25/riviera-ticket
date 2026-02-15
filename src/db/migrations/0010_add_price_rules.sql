-- 0010_add_price_rules.sql
-- Missing migration file referenced by drizzle journal. Kept idempotent.

CREATE TABLE IF NOT EXISTS "price_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "priority" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_rules_cinema_id_cinemas_id_fk'
  ) THEN
    ALTER TABLE "price_rules"
      ADD CONSTRAINT "price_rules_cinema_id_cinemas_id_fk"
      FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_rules_auditorium_id_auditoriums_id_fk'
  ) THEN
    ALTER TABLE "price_rules"
      ADD CONSTRAINT "price_rules_auditorium_id_auditoriums_id_fk"
      FOREIGN KEY ("auditorium_id") REFERENCES "public"."auditoriums"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_rules_session_id_sessions_id_fk'
  ) THEN
    ALTER TABLE "price_rules"
      ADD CONSTRAINT "price_rules_session_id_sessions_id_fk"
      FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_price_rules_priority" ON "price_rules" USING btree ("priority");
CREATE INDEX IF NOT EXISTS "idx_price_rules_cinema_id" ON "price_rules" USING btree ("cinema_id");
CREATE INDEX IF NOT EXISTS "idx_price_rules_auditorium_id" ON "price_rules" USING btree ("auditorium_id");
CREATE INDEX IF NOT EXISTS "idx_price_rules_session_id" ON "price_rules" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "idx_price_rules_active" ON "price_rules" USING btree ("is_active");
