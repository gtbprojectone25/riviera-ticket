CREATE UNIQUE INDEX IF NOT EXISTS "uq_cart_items_cart_seat"
  ON "cart_items" USING btree ("cart_id","seat_id");
