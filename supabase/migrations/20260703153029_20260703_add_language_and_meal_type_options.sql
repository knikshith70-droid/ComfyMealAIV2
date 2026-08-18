-- Add language preference column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Add 'meal_type' to the custom_options CHECK constraint
ALTER TABLE custom_options
  DROP CONSTRAINT IF EXISTS custom_options_category_check;

ALTER TABLE custom_options
  ADD CONSTRAINT custom_options_category_check
  CHECK (category IN ('allergy', 'lifestyle', 'cuisine', 'goal', 'cuisine_theme', 'comfort_style', 'adventure_level', 'cooking_skill', 'meal_occasion', 'flavor_profile', 'meal_type'));

-- Seed meal_type preset options
INSERT INTO custom_options (category, value)
VALUES
  ('meal_type', 'breakfast'),
  ('meal_type', 'brunch'),
  ('meal_type', 'lunch'),
  ('meal_type', 'dinner'),
  ('meal_type', 'quick snack'),
  ('meal_type', 'healthy snack'),
  ('meal_type', 'late night snack'),
  ('meal_type', 'meal prep / batch cook'),
  ('meal_type', 'party / entertaining'),
  ('meal_type', 'packed lunch / lunchbox'),
  ('meal_type', 'post-workout meal'),
  ('meal_type', 'light bite'),
  ('meal_type', 'dessert'),
  ('meal_type', 'drinks / smoothies')
ON CONFLICT DO NOTHING;
