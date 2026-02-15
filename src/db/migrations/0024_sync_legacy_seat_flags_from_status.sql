-- 0024_sync_legacy_seat_flags_from_status.sql
-- Keep legacy seat flags as derived compatibility fields from canonical seat state.

CREATE OR REPLACE FUNCTION sync_legacy_seat_flags_from_canonical()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_available := (NEW.status = 'AVAILABLE');
  NEW.is_reserved := (
    NEW.status = 'HELD'
    AND NEW.held_until IS NOT NULL
    AND NEW.held_until > now()
  );

  IF NEW.status = 'HELD' AND NEW.held_until IS NOT NULL AND NEW.held_until > now() THEN
    NEW.reserved_by := NEW.held_by;
    NEW.reserved_until := NEW.held_until;
  ELSE
    NEW.reserved_by := NULL;
    NEW.reserved_until := NULL;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_seats_sync_legacy_flags ON seats;
--> statement-breakpoint

CREATE TRIGGER trg_seats_sync_legacy_flags
BEFORE INSERT OR UPDATE OF status, held_until, held_by, held_by_cart_id, sold_at, sold_cart_id
ON seats
FOR EACH ROW
EXECUTE FUNCTION sync_legacy_seat_flags_from_canonical();
--> statement-breakpoint

UPDATE seats
SET
  is_available = (status = 'AVAILABLE'),
  is_reserved = (status = 'HELD' AND held_until IS NOT NULL AND held_until > now()),
  reserved_by = CASE
    WHEN status = 'HELD' AND held_until IS NOT NULL AND held_until > now() THEN held_by
    ELSE NULL
  END,
  reserved_until = CASE
    WHEN status = 'HELD' AND held_until IS NOT NULL AND held_until > now() THEN held_until
    ELSE NULL
  END;
