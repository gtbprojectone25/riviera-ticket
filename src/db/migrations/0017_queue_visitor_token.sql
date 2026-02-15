ALTER TABLE "queue_entries"
  ADD COLUMN IF NOT EXISTS "visitor_token" text;

UPDATE "queue_entries"
SET "visitor_token" = id::text
WHERE "visitor_token" IS NULL;

ALTER TABLE "queue_entries"
  ALTER COLUMN "visitor_token" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_queue_visitor_token"
  ON "queue_entries" USING btree ("visitor_token");
