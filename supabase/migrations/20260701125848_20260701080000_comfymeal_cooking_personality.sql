/*
# Add cooking personality/lifestyle fields to profiles

1. New Columns on `profiles`:
- `cooking_skill` (text[]) — User's self-assessed cooking skill level (e.g., "Beginner", "Home Cook", "Confident Cook", "Advanced")
- `meal_occasion` (text[]) — Typical meal occasions the user cooks for (e.g., "Quick weekday meals", "Weekend cooking", "Meal prep for the week", "Cooking for guests", "Special occasions")
- `flavor_profile` (text[]) — Flavor preferences the user gravitates toward (e.g., "Spicy", "Umami/Savory", "Fresh/Light", "Rich/Creamy", "Sweet", "Smoky", "Tangy/Citrusy")

2. Extended custom_options Categories:
- Added 3 new categories to the CHECK constraint: `cooking_skill`, `meal_occasion`, `flavor_profile`

3. Seeded Options:
- `cooking_skill`: Beginner, Home Cook, Confident Cook, Advanced
- `meal_occasion`: Quick weekday meals, Weekend cooking, Meal prep for the week, Cooking for guests, Special occasions
- `flavor_profile`: Spicy, Umami/Savory, Fresh/Light, Rich/Creamy, Sweet, Smoky, Tangy/Citrusy

4. Notes:
- All three fields are multi-select (text arrays) to allow flexibility
- These fields provide deeper signal to the AI for personalized recipe suggestions
- Existing profiles get empty arrays as defaults
*/

-- Add new columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cooking_skill text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meal_occasion text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS flavor_profile text[] DEFAULT '{}';

-- Drop and recreate custom_options category constraint
ALTER TABLE custom_options DROP CONSTRAINT IF EXISTS custom_options_category_check;
ALTER TABLE custom_options
  ADD CONSTRAINT custom_options_category_check
  CHECK (category IN ('allergy', 'lifestyle', 'cuisine', 'goal', 'cuisine_theme', 'comfort_style', 'adventure_level', 'cooking_skill', 'meal_occasion', 'flavor_profile'));

-- Seed cooking_skill options
INSERT INTO custom_options (category, value) VALUES
  ('cooking_skill', 'beginner'),
  ('cooking_skill', 'home cook'),
  ('cooking_skill', 'confident cook'),
  ('cooking_skill', 'advanced')
ON CONFLICT (category, value) DO NOTHING;

-- Seed meal_occasion options
INSERT INTO custom_options (category, value) VALUES
  ('meal_occasion', 'quick weekday meals'),
  ('meal_occasion', 'weekend cooking'),
  ('meal_occasion', 'meal prep for the week'),
  ('meal_occasion', 'cooking for guests'),
  ('meal_occasion', 'special occasions')
ON CONFLICT (category, value) DO NOTHING;

-- Seed flavor_profile options
INSERT INTO custom_options (category, value) VALUES
  ('flavor_profile', 'spicy'),
  ('flavor_profile', 'umami/savory'),
  ('flavor_profile', 'fresh/light'),
  ('flavor_profile', 'rich/creamy'),
  ('flavor_profile', 'sweet'),
  ('flavor_profile', 'smoky'),
  ('flavor_profile', 'tangy/citrusy')
ON CONFLICT (category, value) DO NOTHING;
