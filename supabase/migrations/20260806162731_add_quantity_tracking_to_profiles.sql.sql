-- Add quantity_tracking_enabled column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quantity_tracking_enabled boolean NOT NULL DEFAULT true;
