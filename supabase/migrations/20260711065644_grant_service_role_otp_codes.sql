/*
# Grant service_role full access to otp_codes

## Problem
The otp_codes table was created without SELECT/INSERT/UPDATE/DELETE grants for
the service_role. The send-otp and verify-otp edge functions use the service role
key and need full DML access to read, insert, and update OTP records.

## Fix
Grant SELECT, INSERT, UPDATE, DELETE on otp_codes to service_role.
RLS is still enabled with no policies, so the anon/authenticated roles
(the frontend) still cannot access this table directly.
*/

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE otp_codes TO service_role;
