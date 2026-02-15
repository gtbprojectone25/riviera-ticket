-- Queue hardening:
-- 1) one active entry per (scope_key, visitor_token)
-- 2) performance indexes for status/expiration scans
-- 3) normalize legacy duplicated active rows before unique partial index

-- Normalize duplicates: keep the newest active row and expire older ones.
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

-- Expire rows that are still active but already past expires_at.
UPDATE queue_entries
SET
  status = 'EXPIRED',
  updated_at = now()
WHERE status IN ('WAITING', 'READY')
  AND expires_at IS NOT NULL
  AND expires_at < now();

-- Keep data table from growing indefinitely.
DELETE FROM queue_entries
WHERE status IN ('EXPIRED', 'COMPLETED')
  AND updated_at < now() - interval '24 hours';

-- Ensure no zero/negative queue numbers.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'queue_entries_queue_number_positive_check'
  ) THEN
    ALTER TABLE queue_entries
      ADD CONSTRAINT queue_entries_queue_number_positive_check
      CHECK (queue_number > 0);
  END IF;
END $$;

-- One active queue record for the same visitor in same scope.
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_scope_visitor_active
  ON queue_entries (scope_key, visitor_token)
  WHERE status IN ('WAITING', 'READY');

-- Lookup and cleanup performance.
CREATE INDEX IF NOT EXISTS idx_queue_scope_status_expires
  ON queue_entries (scope_key, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_queue_status_expires
  ON queue_entries (status, expires_at);
