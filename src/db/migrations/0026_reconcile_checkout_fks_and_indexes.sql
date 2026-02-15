-- 0026_reconcile_checkout_fks_and_indexes.sql
-- Ensures referential integrity and checkout indexes even on partially migrated environments.

-- Cleanup orphan references before creating FKs.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS checkout_session_id text;
--> statement-breakpoint

UPDATE seats s
SET held_by_cart_id = NULL
WHERE s.held_by_cart_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM carts c
    WHERE c.id = s.held_by_cart_id
  );
--> statement-breakpoint

UPDATE seats s
SET sold_cart_id = NULL
WHERE s.sold_cart_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM carts c
    WHERE c.id = s.sold_cart_id
  );
--> statement-breakpoint

UPDATE tickets t
SET order_id = NULL
WHERE t.order_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = t.order_id
  );
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seats_held_by_cart_id_carts_id_fk'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT seats_held_by_cart_id_carts_id_fk
      FOREIGN KEY (held_by_cart_id)
      REFERENCES public.carts(id)
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seats_sold_cart_id_carts_id_fk'
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT seats_sold_cart_id_carts_id_fk
      FOREIGN KEY (sold_cart_id)
      REFERENCES public.carts(id)
      ON DELETE RESTRICT
      ON UPDATE NO ACTION;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_order_id_orders_id_fk'
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_order_id_orders_id_fk
      FOREIGN KEY (order_id)
      REFERENCES public.orders(id)
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_seats_held_by_cart
  ON seats (held_by_cart_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_seats_sold_cart
  ON seats (sold_cart_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_orders_checkout_session_id
  ON orders (checkout_session_id);
--> statement-breakpoint

-- Reconcile legacy non-partial unique index if it exists with same name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND indexname = 'uq_orders_checkout_session_id'
      AND indexdef NOT ILIKE '%WHERE (checkout_session_id IS NOT NULL)%'
  ) THEN
    DROP INDEX IF EXISTS uq_orders_checkout_session_id;
  END IF;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_checkout_session_id
  ON orders (checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;
