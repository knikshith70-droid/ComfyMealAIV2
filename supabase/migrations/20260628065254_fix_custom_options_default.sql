/*
# Fix custom_options.created_by default + RLS insert policy

## Problem
The `custom_options` table's INSERT policy requires `auth.uid() = created_by`, but the
`created_by` column has NO default. The frontend `addCustomOption` inserts a row with only
`{ category, value }` (no `created_by`), so `created_by` arrives as NULL. The INSERT policy's
`WITH CHECK (auth.uid() = created_by)` then evaluates to `auth.uid() = NULL` → NULL (not true),
and the insert is rejected by RLS. This is why "+ Add your own" is broken in onboarding.

## Fix
1. Add `DEFAULT auth.uid()` to the `created_by` column so client inserts that omit it
   still satisfy the INSERT policy (same pattern used by all other owner-scoped tables).
2. Replace the INSERT policy with one that allows any authenticated user to insert a
   custom option (the shared-list semantics require this — any signed-in user can
   contribute). The `DEFAULT auth.uid()` still records who added it for UPDATE/DELETE
   ownership checks.

## Security
- SELECT remains open to anon + authenticated (shared global list).
- INSERT now allowed for any authenticated user (created_by auto-filled).
- UPDATE/DELETE remain owner-scoped via `auth.uid() = created_by`.

## Notes
1. ALTER COLUMN ... SET DEFAULT is non-destructive (no data loss).
2. The policy drop+recreate is idempotent.
3. Existing rows keep their created_by values (NULL for seed rows, real UUIDs for user-added).
*/

ALTER TABLE custom_options
  ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "insert_custom_options" ON custom_options;
CREATE POLICY "insert_custom_options" ON custom_options FOR INSERT
  TO authenticated WITH CHECK (true);