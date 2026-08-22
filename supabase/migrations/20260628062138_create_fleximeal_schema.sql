/*
# FlexiMeal AI — initial schema

## Overview
Creates the full data model for FlexiMeal AI, a meal-planning app with:
- Email/password auth (Supabase built-in) plus a `profiles` table for onboarding answers.
- A shared `custom_options` table so user-added chips (allergies, lifestyles, cuisines, goals) become available to everyone.
- Per-user `pantry_items` with a logged timestamp for use-soon spoilage detection.
- Per-user `flex_sessions` storing the last Flex Engine answers (for "Same as yesterday?").
- Per-user `saved_recipes` for any recipes the user wants to keep.

## Tables

### profiles
- `id` uuid PK, references auth.users, ON DELETE CASCADE.
- `allergies` text[] — user's allergy/exclusion list.
- `lifestyle` text[] — dietary lifestyle (vegan, vegetarian, keto, etc.).
- `cuisines` text[] — preferred cuisines.
- `adults` int default 1 — household adult count.
- `children` int default 0 — household child count.
- `goals` text[] — what matters most in meal planning.
- `onboarded` bool default false — whether onboarding is complete.
- `created_at`, `updated_at` timestamps.

### custom_options
- `id` uuid PK.
- `category` text NOT NULL — one of 'allergy', 'lifestyle', 'cuisine', 'goal'.
- `value` text NOT NULL — the chip label.
- `created_by` uuid — the user who added it (nullable for seed data).
- `created_at` timestamp.
- Unique constraint on (category, value) so duplicates are prevented.
- SELECT is open to anon+authenticated (shared list). INSERT requires auth (so we know who added it).

### pantry_items
- `id` uuid PK.
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner.
- `name` text NOT NULL — ingredient name.
- `logged_at` timestamptz NOT NULL DEFAULT now() — when it was added to the pantry.
- `created_at` timestamp.

### flex_sessions
- `id` uuid PK.
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner.
- `stock_level` text — 'empty' | 'average' | 'full'.
- `cook_capacity` text — 'quick' | 'standard' | 'proper'.
- `meal_type` text — 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'meal_prep'.
- `comfort_score` int — 0-100 slider value.
- `pantry_snapshot` jsonb — snapshot of pantry item names at session time.
- `created_at` timestamp.
- Only the most recent session per user is used for "Same as yesterday?".

### saved_recipes
- `id` uuid PK.
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner.
- `title` text NOT NULL.
- `description` text.
- `time_minutes` int.
- `servings` int.
- `ingredients` jsonb — array of strings.
- `steps` jsonb — array of strings.
- `tags` jsonb — array of strings.
- `created_at` timestamp.

## Security
- RLS enabled on every table.
- profiles, pantry_items, flex_sessions, saved_recipes: owner-scoped CRUD (TO authenticated, auth.uid() = user_id).
- custom_options: SELECT open to anon+authenticated (shared global list); INSERT/UPDATE/DELETE owner-scoped.
- All owner columns default to auth.uid() so client inserts that omit user_id succeed.

## Notes
1. Email confirmation stays OFF (default).
2. The frontend never writes user_id explicitly — DEFAULT auth.uid() handles it.
3. custom_options is seeded with preset chips via a follow-up migration.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  allergies text[] NOT NULL DEFAULT '{}',
  lifestyle text[] NOT NULL DEFAULT '{}',
  cuisines text[] NOT NULL DEFAULT '{}',
  adults int NOT NULL DEFAULT 1,
  children int NOT NULL DEFAULT 0,
  goals text[] NOT NULL DEFAULT '{}',
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- custom_options (shared global list)
CREATE TABLE IF NOT EXISTS custom_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('allergy', 'lifestyle', 'cuisine', 'goal')),
  value text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, value)
);

ALTER TABLE custom_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_custom_options" ON custom_options;
CREATE POLICY "read_custom_options" ON custom_options FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_custom_options" ON custom_options;
CREATE POLICY "insert_custom_options" ON custom_options FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_own_custom_options" ON custom_options;
CREATE POLICY "update_own_custom_options" ON custom_options FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "delete_own_custom_options" ON custom_options;
CREATE POLICY "delete_own_custom_options" ON custom_options FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- pantry_items
CREATE TABLE IF NOT EXISTS pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pantry" ON pantry_items;
CREATE POLICY "select_own_pantry" ON pantry_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_pantry" ON pantry_items;
CREATE POLICY "insert_own_pantry" ON pantry_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_pantry" ON pantry_items;
CREATE POLICY "update_own_pantry" ON pantry_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_pantry" ON pantry_items;
CREATE POLICY "delete_own_pantry" ON pantry_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);

-- flex_sessions
CREATE TABLE IF NOT EXISTS flex_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_level text NOT NULL DEFAULT 'average',
  cook_capacity text NOT NULL DEFAULT 'standard',
  meal_type text NOT NULL DEFAULT 'dinner',
  comfort_score int NOT NULL DEFAULT 50,
  pantry_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flex_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON flex_sessions;
CREATE POLICY "select_own_sessions" ON flex_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON flex_sessions;
CREATE POLICY "insert_own_sessions" ON flex_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON flex_sessions;
CREATE POLICY "update_own_sessions" ON flex_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON flex_sessions;
CREATE POLICY "delete_own_sessions" ON flex_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flex_sessions_user_id ON flex_sessions(user_id, created_at DESC);

-- saved_recipes
CREATE TABLE IF NOT EXISTS saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  time_minutes int,
  servings int,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recipes" ON saved_recipes;
CREATE POLICY "select_own_recipes" ON saved_recipes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_recipes" ON saved_recipes;
CREATE POLICY "insert_own_recipes" ON saved_recipes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_recipes" ON saved_recipes;
CREATE POLICY "update_own_recipes" ON saved_recipes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_recipes" ON saved_recipes;
CREATE POLICY "delete_own_recipes" ON saved_recipes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id, created_at DESC);

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();