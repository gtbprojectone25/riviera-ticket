-- Add new values to seat_type enum if they don't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'seat_type' AND e.enumlabel = 'WHEELCHAIR'
  ) THEN
    ALTER TYPE "public"."seat_type" ADD VALUE 'WHEELCHAIR';
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'seat_type' AND e.enumlabel = 'GAP'
  ) THEN
    ALTER TYPE "public"."seat_type" ADD VALUE 'GAP';
  END IF;
END $$;
--> statement-breakpoint

-- Add layout and total_seats columns to auditoriums table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'auditoriums' AND column_name = 'layout'
  ) THEN
    ALTER TABLE "auditoriums"
      ADD COLUMN "layout" jsonb NOT NULL DEFAULT '{"rowsConfig":[]}'::jsonb;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'auditoriums' AND column_name = 'total_seats'
  ) THEN
    ALTER TABLE "auditoriums"
      ADD COLUMN "total_seats" integer NOT NULL DEFAULT 0;
  END IF;
END $$;

