
-- Add missing cooking personality columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cuisine_theme   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS comfort_style   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS adventure_level text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cooking_skill   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meal_occasion   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS flavor_profile  text[] NOT NULL DEFAULT '{}';

-- Grant service_role full access to profiles so edge functions and
-- the service-role client used in ensureProfileRow can read/write rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;
