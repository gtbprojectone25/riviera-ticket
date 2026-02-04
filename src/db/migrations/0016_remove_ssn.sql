-- Remove SSN fields from users and legacy user_profiles (if present)
ALTER TABLE "users" DROP COLUMN IF EXISTS "encrypted_ssn";
ALTER TABLE "users" DROP COLUMN IF EXISTS "ssn_hash";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "ssn";
  END IF;
END $$;
