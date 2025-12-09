CREATE TABLE IF NOT EXISTS "auditoriums" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cinema_id" text NOT NULL,
  "name" text NOT NULL,
  "format" text,
  "approx_capacity" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auditoriums' AND column_name = 'cinema_id'
  ) THEN
    ALTER TABLE "auditoriums"
      ADD CONSTRAINT "auditoriums_cinema_id_cinemas_id_fk"
      FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'cinema_id'
  ) THEN
    ALTER TABLE "sessions" ADD COLUMN "cinema_id" text;
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'auditorium_id'
  ) THEN
    ALTER TABLE "sessions" ADD COLUMN "auditorium_id" uuid;
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_cinema_id_cinemas_id_fk'
  ) THEN
    ALTER TABLE "sessions"
      ADD CONSTRAINT "sessions_cinema_id_cinemas_id_fk"
      FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_auditorium_id_auditoriums_id_fk'
  ) THEN
    ALTER TABLE "sessions"
      ADD CONSTRAINT "sessions_auditorium_id_auditoriums_id_fk"
      FOREIGN KEY ("auditorium_id") REFERENCES "public"."auditoriums"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

