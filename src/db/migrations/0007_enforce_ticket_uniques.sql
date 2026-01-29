CREATE UNIQUE INDEX IF NOT EXISTS "uq_tickets_session_seat" ON "tickets" USING btree ("session_id","seat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seats_status" ON "seats" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seats_held_until" ON "seats" USING btree ("held_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seats_session_status_held_until" ON "seats" USING btree ("session_id","status","held_until");--> statement-breakpoint
