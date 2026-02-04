ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "movie_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_movie_id_movies_id_fk'
  ) THEN
    ALTER TABLE "sessions"
      ADD CONSTRAINT "sessions_movie_id_movies_id_fk"
      FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "idx_sessions_movie_id" ON "sessions" ("movie_id");
