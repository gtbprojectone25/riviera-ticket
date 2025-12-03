-- Migration: Add email verification and barcode support
-- Run this SQL manually or via drizzle-kit

-- Email verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- Add SSN fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_ssn TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ssn_hash TEXT;

-- Add barcode fields to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS barcode_path TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS barcode_blurred_path TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS barcode_revealed_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS barcode_data TEXT;

-- Add index for SSN hash lookups
CREATE INDEX IF NOT EXISTS idx_users_ssn_hash ON users(ssn_hash) WHERE ssn_hash IS NOT NULL;

-- Add index for barcode lookups
CREATE INDEX IF NOT EXISTS idx_tickets_barcode ON tickets(barcode_path) WHERE barcode_path IS NOT NULL;

