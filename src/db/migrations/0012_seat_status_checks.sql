DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_seats_sold_has_sold_at'
  ) THEN
    ALTER TABLE "seats"
      ADD CONSTRAINT "chk_seats_sold_has_sold_at"
      CHECK (status <> 'SOLD' OR sold_at IS NOT NULL);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_seats_held_has_hold'
  ) THEN
    ALTER TABLE "seats"
      ADD CONSTRAINT "chk_seats_held_has_hold"
      CHECK (
        status <> 'HELD'
        OR (held_until IS NOT NULL AND held_by_cart_id IS NOT NULL)
      );
  END IF;
END$$;
