-- 0027_queue_visitor_token_self_heal.sql
-- Self-heal for environments where queue_entries.visitor_token is missing or inconsistent.

ALTER TABLE "queue_entries"
  ADD COLUMN IF NOT EXISTS "visitor_token" text;
--> statement-breakpoint

UPDATE "queue_entries"
SET "visitor_token" = "id"::text
WHERE "visitor_token" IS NULL;
--> statement-breakpoint

ALTER TABLE "queue_entries"
  ALTER COLUMN "visitor_token" SET NOT NULL;
--> statement-breakpoint

-- Normalize duplicate active rows before unique partial index.
WITH ranked_active AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY scope_key, visitor_token
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM queue_entries
  WHERE status IN ('WAITING', 'READY')
)
UPDATE queue_entries q
SET
  status = 'EXPIRED',
  updated_at = now()
FROM ranked_active r
WHERE q.id = r.id
  AND r.rn > 1;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_queue_visitor_token"
  ON "queue_entries" USING btree ("visitor_token");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_queue_scope_visitor_status"
  ON "queue_entries" USING btree ("scope_key", "visitor_token", "status");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_queue_scope_visitor_active"
  ON "queue_entries" ("scope_key", "visitor_token")
  WHERE "status" IN ('WAITING', 'READY');
