/*
# ComfyMeal AI — profile theme columns, meal_plans table, new onboarding seeds

## Overview
1. Renames the app concept from FlexiMeal to ComfyMeal (no schema rename — just new columns/tables).
2. Adds three new theme-based onboarding columns to `profiles` so the AI can personalize
   recipe and meal-plan suggestions around deeper food preferences:
   - `cuisine_theme`  — which cuisine theme the user enjoys most (e.g. South Indian, Continental, Asian, Mixed).
   - `comfort_style`  — what kind of meals comfort the user most (homestyle, high-protein, light & healthy, spicy, experimental).
   - `adventure_level`— how adventurous the user is with food (familiar, some variety, love trying new).
3. Adds a new `meal_plans` table to persist generated multi-day meal plans (the new Meal Plan Generator feature).
4. Seeds new `custom_options` rows for the three new onboarding categories so the chip selectors have presets.

## New columns on `profiles`
- `cuisine_theme` text[]   DEFAULT '{}' — multi-select cuisine theme chips.
- `comfort_style` text[]   DEFAULT '{}' — multi-select comfort-style chips.
- `adventure_level` text[] DEFAULT '{}' — multi-select adventure-level chips.
All nullable-safe (default empty array) so existing profile rows are unaffected.

## New table: `meal_plans`
- `id` uuid PK.
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner (ON DELETE CASCADE).
- `duration` text NOT NULL — '1day' | '3day' | '1week' | '2week' | '1month'.
- `settings` jsonb NOT NULL — the settings used to generate the plan (budget, cook time, dietary prefs, pantry snapshot).
- `plan_data` jsonb NOT NULL — the full generated plan: array of days, each with breakfast/lunch/dinner/snacks recipes.
- `created_at` timestamptz NOT NULL DEFAULT now().
- RLS enabled, owner-scoped CRUD (4 policies, TO authenticated, auth.uid() = user_id).

## New `custom_options` seeds
- category 'cuisine_theme': South Indian, North Indian, Continental, Asian, Mixed.
- category 'comfort_style': Homestyle comfort, High-protein, Light & healthy, Spicy & flavorful, Experimental.
- category 'adventure_level': Familiar favorites, Open to some variety, Love trying new.
The `custom_options` CHECK constraint is extended to allow these three new categories.

## Security
- RLS enabled on `meal_plans` with the standard 4-policy owner-scoped pattern.
- `profiles` already has RLS; new columns inherit existing owner-scoped policies (no policy change needed —
  the existing SELECT/INSERT/UPDATE policies reference the row, not specific columns).
- `custom_options` SELECT stays open to anon+authenticated (shared list); the new categories inherit that.

## Notes
1. The CHECK constraint on `custom_options.category` is altered (dropped + recreated) to include the 3 new categories.
   This is safe because the constraint is a domain constraint, not data-dependent.
2. Existing profile rows get empty arrays for the new columns — onboarding will treat them as "not yet answered".
3. The frontend never writes user_id explicitly — DEFAULT auth.uid() handles it for meal_plans inserts.
*/

-- 1. Add theme columns to profiles (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'cuisine_theme') THEN
    ALTER TABLE profiles ADD COLUMN cuisine_theme text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'comfort_style') THEN
    ALTER TABLE profiles ADD COLUMN comfort_style text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'adventure_level') THEN
    ALTER TABLE profiles ADD COLUMN adventure_level text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- 2. Extend custom_options category CHECK to include the 3 new onboarding categories
ALTER TABLE custom_options DROP CONSTRAINT IF EXISTS custom_options_category_check;
ALTER TABLE custom_options ADD CONSTRAINT custom_options_category_check
  CHECK (category IN ('allergy', 'lifestyle', 'cuisine', 'goal', 'cuisine_theme', 'comfort_style', 'adventure_level'));

-- 3. Seed the new onboarding chip options (idempotent via ON CONFLICT)
INSERT INTO custom_options (category, value) VALUES
  ('cuisine_theme', 'south indian'),
  ('cuisine_theme', 'north indian'),
  ('cuisine_theme', 'continental'),
  ('cuisine_theme', 'asian'),
  ('cuisine_theme', 'mixed'),
  ('comfort_style', 'homestyle comfort'),
  ('comfort_style', 'high-protein'),
  ('comfort_style', 'light & healthy'),
  ('comfort_style', 'spicy & flavorful'),
  ('comfort_style', 'experimental'),
  ('adventure_level', 'familiar favorites'),
  ('adventure_level', 'open to some variety'),
  ('adventure_level', 'love trying new')
ON CONFLICT (category, value) DO NOTHING;

-- 4. meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  duration text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_plans" ON meal_plans;
CREATE POLICY "select_own_meal_plans" ON meal_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_meal_plans" ON meal_plans;
CREATE POLICY "insert_own_meal_plans" ON meal_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_meal_plans" ON meal_plans;
CREATE POLICY "update_own_meal_plans" ON meal_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_meal_plans" ON meal_plans;
CREATE POLICY "delete_own_meal_plans" ON meal_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id, created_at DESC);
