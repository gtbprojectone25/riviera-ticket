-- Idempotency table for Stripe webhooks.
CREATE TABLE IF NOT EXISTS "processed_stripe_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "payment_intent_id" text,
  "status" text NOT NULL DEFAULT 'PROCESSING',
  "last_error" text,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "processed_stripe_events_event_id_unique" UNIQUE("event_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'processed_stripe_events_status_check'
  ) THEN
    ALTER TABLE "processed_stripe_events"
      ADD CONSTRAINT "processed_stripe_events_status_check"
      CHECK ("status" IN ('PROCESSING', 'PROCESSED', 'FAILED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_processed_stripe_events_event_id"
  ON "processed_stripe_events" USING btree ("event_id");

CREATE INDEX IF NOT EXISTS "idx_processed_stripe_events_status"
  ON "processed_stripe_events" USING btree ("status");

CREATE INDEX IF NOT EXISTS "idx_processed_stripe_events_payment_intent_id"
  ON "processed_stripe_events" USING btree ("payment_intent_id");
