-- 0018_add_fks_and_indexes.sql
-- Integridade referencial + índices/uniques para fluxo de checkout/pagamento

-- 1) Colunas explícitas de checkout_session_id
ALTER TABLE "payment_intents"
  ADD COLUMN IF NOT EXISTS "checkout_session_id" text;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "checkout_session_id" text;

-- 2) Limpeza de órfãos antes das FKs (evita falha na criação)
UPDATE "seats" s
SET "held_by_cart_id" = NULL
WHERE "held_by_cart_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "carts" c
    WHERE c."id" = s."held_by_cart_id"
  );

UPDATE "seats" s
SET "sold_cart_id" = NULL
WHERE "sold_cart_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "carts" c
    WHERE c."id" = s."sold_cart_id"
  );

UPDATE "tickets" t
SET "order_id" = NULL
WHERE "order_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "orders" o
    WHERE o."id" = t."order_id"
  );

-- 3) FKs faltantes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seats_held_by_cart_id_carts_id_fk'
  ) THEN
    ALTER TABLE "seats"
      ADD CONSTRAINT "seats_held_by_cart_id_carts_id_fk"
      FOREIGN KEY ("held_by_cart_id")
      REFERENCES "public"."carts"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seats_sold_cart_id_carts_id_fk'
  ) THEN
    ALTER TABLE "seats"
      ADD CONSTRAINT "seats_sold_cart_id_carts_id_fk"
      FOREIGN KEY ("sold_cart_id")
      REFERENCES "public"."carts"("id")
      ON DELETE restrict
      ON UPDATE no action;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_order_id_orders_id_fk'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_order_id_orders_id_fk"
      FOREIGN KEY ("order_id")
      REFERENCES "public"."orders"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END$$;

-- 4) Índices de fluxo
CREATE INDEX IF NOT EXISTS "idx_seats_held_by_cart"
  ON "seats" USING btree ("held_by_cart_id");

CREATE INDEX IF NOT EXISTS "idx_seats_sold_cart"
  ON "seats" USING btree ("sold_cart_id");

CREATE INDEX IF NOT EXISTS "idx_payment_intents_checkout_session_id"
  ON "payment_intents" USING btree ("checkout_session_id");

CREATE INDEX IF NOT EXISTS "idx_orders_checkout_session_id"
  ON "orders" USING btree ("checkout_session_id");

-- 5) Unicidades
CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_intents_checkout_session_id"
  ON "payment_intents" USING btree ("checkout_session_id")
  WHERE "checkout_session_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_orders_checkout_session_id"
  ON "orders" USING btree ("checkout_session_id")
  WHERE "checkout_session_id" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_intents_stripe_payment_intent_id_unique'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'payment_intents'
      AND indexname = 'uq_payment_intents_payment_intent_id'
  ) THEN
    CREATE UNIQUE INDEX "uq_payment_intents_payment_intent_id"
      ON "payment_intents" USING btree ("stripe_payment_intent_id")
      WHERE "stripe_payment_intent_id" IS NOT NULL;
  END IF;
END$$;
