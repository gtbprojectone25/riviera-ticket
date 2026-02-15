-- 0025_enforce_canonical_seat_state_guards.sql
-- Extra guardrails to keep canonical seat state consistent.

UPDATE seats
SET
  held_until = NULL,
  held_by = NULL,
  held_by_cart_id = NULL,
  updated_at = now()
WHERE status = 'SOLD'
  AND (held_until IS NOT NULL OR held_by IS NOT NULL OR held_by_cart_id IS NOT NULL);
--> statement-breakpoint

UPDATE seats
SET
  sold_at = NULL,
  sold_cart_id = NULL,
  updated_at = now()
WHERE status = 'HELD'
  AND (sold_at IS NOT NULL OR sold_cart_id IS NOT NULL);
--> statement-breakpoint

UPDATE seats
SET
  held_until = NULL,
  held_by = NULL,
  held_by_cart_id = NULL,
  sold_at = NULL,
  sold_cart_id = NULL,
  updated_at = now()
WHERE status = 'AVAILABLE'
  AND (
    held_until IS NOT NULL
    OR held_by IS NOT NULL
    OR held_by_cart_id IS NOT NULL
    OR sold_at IS NOT NULL
    OR sold_cart_id IS NOT NULL
  );
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_sold_without_hold'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT chk_seats_sold_without_hold
      CHECK (
        status <> 'SOLD'
        OR (held_until IS NULL AND held_by IS NULL AND held_by_cart_id IS NULL)
      );
  END IF;
END$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_held_without_sale'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT chk_seats_held_without_sale
      CHECK (status <> 'HELD' OR (sold_at IS NULL AND sold_cart_id IS NULL));
  END IF;
END$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_available_without_hold_or_sale'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT chk_seats_available_without_hold_or_sale
      CHECK (
        status <> 'AVAILABLE'
        OR (
          held_until IS NULL
          AND held_by IS NULL
          AND held_by_cart_id IS NULL
          AND sold_at IS NULL
          AND sold_cart_id IS NULL
        )
      );
  END IF;
END$$;
