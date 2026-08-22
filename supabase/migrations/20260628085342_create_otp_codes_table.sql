/*
# Create otp_codes table for custom email OTP

## Overview
Stores 6-digit one-time codes for email-based sign-in. The default Supabase OTP email
includes a magic link; this table backs a custom flow that sends ONLY the 6-digit code
(no link). Codes are created by the `send-otp` edge function and verified by the
`verify-otp` edge function. The frontend never touches this table directly.

## Table
### otp_codes
- `id` uuid PK
- `email` text NOT NULL — the address the code was sent to (lowercased)
- `code_hash` text NOT NULL — SHA-256 hash of the 6-digit code (never store the plaintext)
- `expires_at` timestamptz NOT NULL — 10 minutes from creation
- `consumed_at` timestamptz — set when the code is successfully verified (one-time use)
- `created_at` timestamptz DEFAULT now()
- Index on (email, created_at) for lookup + rate-limit checks.

## Security
- RLS enabled. NO policies are added — the table is locked down for direct client access.
  Only the service-role key (used inside edge functions) can read/write, which bypasses RLS.
- The anon-key frontend cannot SELECT, INSERT, UPDATE, or DELETE from this table.

## Notes
1. Codes are hashed at rest (SHA-256 hex) so a database leak does not expose them.
2. The `send-otp` function enforces a 60-second rate limit per email by counting recent rows.
3. The `verify-otp` function checks expiry + consumed_at + hash match before issuing a session.
4. Old codes are cleaned up lazily — no scheduled job needed for a demo-scale app.
*/

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_created ON otp_codes(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);