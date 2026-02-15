-- 0028_queue_visitor_token_rollout_safe.sql
-- Safe/idempotent rollout for queue_entries.visitor_token in partially migrated environments.

ALTER TABLE public.queue_entries
  ADD COLUMN IF NOT EXISTS visitor_token text;
--> statement-breakpoint

-- Backfill legacy rows to satisfy NOT NULL and avoid runtime failures.
UPDATE public.queue_entries
SET visitor_token = id::text
WHERE visitor_token IS NULL;
--> statement-breakpoint

ALTER TABLE public.queue_entries
  ALTER COLUMN visitor_token SET NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_queue_entries_scope_visitor
  ON public.queue_entries(scope_key, visitor_token);
--> statement-breakpoint

-- NOTE: we intentionally avoid `expires_at > now()` in index predicate because `now()` is not immutable.
-- Existing runtime keeps active rows in WAITING/READY and expires old rows by status transition.
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_active_by_visitor
  ON public.queue_entries(scope_key, visitor_token)
  WHERE status::text IN ('WAITING', 'READY', 'NOTIFIED');
