CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
ALTER TABLE "seats" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'USER' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_carts_user_id" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_carts_session_id" ON "carts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_carts_status" ON "carts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_carts_expires_at" ON "carts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_seats_session_id" ON "seats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_seats_session_seat" ON "seats" USING btree ("session_id","seat_id");--> statement-breakpoint
CREATE INDEX "idx_seats_reserved_until" ON "seats" USING btree ("reserved_until");--> statement-breakpoint
CREATE INDEX "idx_seats_available" ON "seats" USING btree ("session_id","is_available","is_reserved");--> statement-breakpoint
CREATE INDEX "idx_tickets_session_id" ON "tickets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_user_id" ON "tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_seat_id" ON "tickets" USING btree ("seat_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tickets_order_id" ON "tickets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");