CREATE TABLE IF NOT EXISTS "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"endpoint" text NOT NULL,
	"payload" text NOT NULL,
	"response_status" integer,
	"response_body" text,
	"success" boolean DEFAULT false NOT NULL,
	"error" text,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_intents' AND column_name = 'adyen_payment_id'
  ) THEN
    ALTER TABLE "payment_intents" ADD COLUMN "adyen_payment_id" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'barcode_path'
  ) THEN
    ALTER TABLE "tickets" ADD COLUMN "barcode_path" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'barcode_blurred_path'
  ) THEN
    ALTER TABLE "tickets" ADD COLUMN "barcode_blurred_path" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'barcode_revealed_at'
  ) THEN
    ALTER TABLE "tickets" ADD COLUMN "barcode_revealed_at" timestamp;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'barcode_data'
  ) THEN
    ALTER TABLE "tickets" ADD COLUMN "barcode_data" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'encrypted_ssn'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "encrypted_ssn" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ssn_hash'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "ssn_hash" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhook_logs_user_id_users_id_fk') THEN
    ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX "idx_email_verifications_email" ON "email_verifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_email_verifications_expires" ON "email_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_user_id" ON "webhook_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_endpoint" ON "webhook_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_created_at" ON "webhook_logs" USING btree ("created_at");
