-- 0022_seat_state_integrity_hardening.sql
-- Hardening for seat state consistency and referential integrity.

UPDATE seats s
SET held_by_cart_id = NULL,
    status = CASE WHEN status = 'HELD' THEN 'AVAILABLE' ELSE status END,
    held_until = CASE WHEN status = 'HELD' THEN NULL ELSE held_until END,
    held_by = CASE WHEN status = 'HELD' THEN NULL ELSE held_by END,
    updated_at = now()
WHERE s.held_by_cart_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM carts c WHERE c.id = s.held_by_cart_id
  );
--> statement-breakpoint

UPDATE seats s
SET sold_cart_id = NULL,
    updated_at = now()
WHERE s.sold_cart_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM carts c WHERE c.id = s.sold_cart_id
  );
--> statement-breakpoint

UPDATE tickets t
SET order_id = NULL,
    updated_at = now()
WHERE t.order_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.id = t.order_id
  );
--> statement-breakpoint

UPDATE seats
SET
  is_available = (status = 'AVAILABLE'),
  is_reserved = (status = 'HELD' AND held_until IS NOT NULL AND held_until > now()),
  reserved_by = CASE
    WHEN status = 'HELD' AND held_until IS NOT NULL AND held_until > now() THEN held_by
    ELSE NULL
  END,
  reserved_until = CASE
    WHEN status = 'HELD' AND held_until IS NOT NULL AND held_until > now() THEN held_until
    ELSE NULL
  END,
  updated_at = now();
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_held_has_hold'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT chk_seats_held_has_hold
      CHECK (
        status <> 'HELD'
        OR (held_until IS NOT NULL AND held_by_cart_id IS NOT NULL)
      );
  END IF;
END$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_sold_has_sold_at'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT chk_seats_sold_has_sold_at
      CHECK (status <> 'SOLD' OR sold_at IS NOT NULL);
  END IF;
END$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seats_held_by_cart_id_carts_id_fk'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT seats_held_by_cart_id_carts_id_fk
      FOREIGN KEY (held_by_cart_id)
      REFERENCES public.carts(id)
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seats_sold_cart_id_carts_id_fk'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT seats_sold_cart_id_carts_id_fk
      FOREIGN KEY (sold_cart_id)
      REFERENCES public.carts(id)
      ON DELETE RESTRICT
      ON UPDATE NO ACTION;
  END IF;
END$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_order_id_orders_id_fk'
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_order_id_orders_id_fk
      FOREIGN KEY (order_id)
      REFERENCES public.orders(id)
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END$$;
--> statement-breakpoint

WITH duplicated AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY session_id, row, number
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM seats
)
DELETE FROM seats s
USING duplicated d
WHERE s.id = d.id
  AND d.rn > 1
  AND s.status = 'AVAILABLE';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS uq_seats_session_row_number
  ON seats (session_id, row, number);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_seats_held_by_cart
  ON seats (held_by_cart_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_seats_sold_cart
  ON seats (sold_cart_id);
