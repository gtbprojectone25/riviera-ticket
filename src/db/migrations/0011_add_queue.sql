CREATE TYPE "public"."queue_status" AS ENUM('WAITING', 'READY', 'EXPIRED', 'COMPLETED');
--> statement-breakpoint
CREATE TABLE "queue_counters" (
  "scope_key" text PRIMARY KEY NOT NULL,
  "next_number" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope_key" text NOT NULL,
  "user_id" uuid,
  "cart_id" uuid,
  "queue_number" integer NOT NULL,
  "status" "queue_status" DEFAULT 'WAITING' NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_queue_scope_number" ON "queue_entries" USING btree ("scope_key","queue_number");
--> statement-breakpoint
CREATE INDEX "idx_queue_scope" ON "queue_entries" USING btree ("scope_key");
--> statement-breakpoint
CREATE INDEX "idx_queue_status" ON "queue_entries" USING btree ("status");
