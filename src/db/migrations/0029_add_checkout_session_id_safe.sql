-- 0029_add_checkout_session_id_safe.sql
-- Adds checkout_session_id to payment_intents and orders (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_intents' AND column_name = 'checkout_session_id'
  ) THEN
    ALTER TABLE public.payment_intents
      ADD COLUMN checkout_session_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_payment_intents_checkout_session_id'
  ) THEN
    CREATE INDEX idx_payment_intents_checkout_session_id
      ON public.payment_intents (checkout_session_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_payment_intents_checkout_session_id'
  ) THEN
    CREATE UNIQUE INDEX uq_payment_intents_checkout_session_id
      ON public.payment_intents (checkout_session_id)
      WHERE checkout_session_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'checkout_session_id'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN checkout_session_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_orders_checkout_session_id'
  ) THEN
    CREATE INDEX idx_orders_checkout_session_id
      ON public.orders (checkout_session_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_orders_checkout_session_id'
  ) THEN
    CREATE UNIQUE INDEX uq_orders_checkout_session_id
      ON public.orders (checkout_session_id)
      WHERE checkout_session_id IS NOT NULL;
  END IF;
END $$;
