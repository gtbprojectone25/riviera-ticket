DO $$ BEGIN
  CREATE TYPE "public"."auditorium_type" AS ENUM('IMAX', 'NORMAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "auditoriums" ADD COLUMN "type" "auditorium_type" DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "auditoriums" ADD COLUMN "capacity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "auditoriums" ADD COLUMN "image_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "auditoriums" ADD COLUMN "seat_map_config" jsonb;--> statement-breakpoint
UPDATE "auditoriums" SET "seat_map_config" = "layout" WHERE "seat_map_config" IS NULL;--> statement-breakpoint
UPDATE "auditoriums" SET "capacity" = COALESCE("total_seats", 0) WHERE "capacity" = 0;--> statement-breakpoint
ALTER TABLE "auditoriums" ADD CONSTRAINT "auditoriums_image_asset_id_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auditoriums_cinema_id" ON "auditoriums" USING btree ("cinema_id");--> statement-breakpoint
CREATE INDEX "idx_auditoriums_type" ON "auditoriums" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_auditoriums_image_asset_id" ON "auditoriums" USING btree ("image_asset_id");
