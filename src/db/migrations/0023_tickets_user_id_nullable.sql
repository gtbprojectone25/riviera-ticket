-- 0023_tickets_user_id_nullable.sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE tickets
      ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;
