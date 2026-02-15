-- Add checkout_purchases to track ownership of guest checkouts securely.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkout_purchase_status') THEN
    CREATE TYPE "public"."checkout_purchase_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CLAIMED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "checkout_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "checkout_session_id" text NOT NULL,
  "cart_id" uuid NOT NULL,
  "payment_intent_id" uuid,
  "user_id" uuid,
  "status" "checkout_purchase_status" NOT NULL DEFAULT 'PENDING',
  "claimed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "checkout_purchases_checkout_session_id_unique" UNIQUE("checkout_session_id"),
  CONSTRAINT "checkout_purchases_cart_id_unique" UNIQUE("cart_id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_purchases_cart_id_carts_id_fk') THEN
    ALTER TABLE "checkout_purchases"
      ADD CONSTRAINT "checkout_purchases_cart_id_carts_id_fk"
      FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_purchases_payment_intent_id_payment_intents_id_fk') THEN
    ALTER TABLE "checkout_purchases"
      ADD CONSTRAINT "checkout_purchases_payment_intent_id_payment_intents_id_fk"
      FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_purchases_user_id_users_id_fk') THEN
    ALTER TABLE "checkout_purchases"
      ADD CONSTRAINT "checkout_purchases_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_checkout_purchases_checkout_session_id"
  ON "checkout_purchases" USING btree ("checkout_session_id");
CREATE INDEX IF NOT EXISTS "idx_checkout_purchases_cart_id"
  ON "checkout_purchases" USING btree ("cart_id");
CREATE INDEX IF NOT EXISTS "idx_checkout_purchases_user_id"
  ON "checkout_purchases" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_checkout_purchases_status"
  ON "checkout_purchases" USING btree ("status");

-- Guest flow no longer requires fake user rows; tickets can remain unclaimed until login.
ALTER TABLE "tickets"
  ALTER COLUMN "user_id" DROP NOT NULL;
