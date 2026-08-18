/*
# Add favorites, nutrition_history tables; add nutrition column to saved_recipes

## Changes
1. `favorites` — lightweight per-user "liked" recipes (heart icon, separate from bookmarks).
   Stores the full recipe payload as jsonb for offline rendering without extra joins.
2. `nutrition_history` — auto-log of every recipe generated. Used for Nutrition History page
   (weekly/monthly view) and Dashboard recent-recipe cards.
3. `saved_recipes` — new `nutrition` jsonb column stores AI nutrition estimate per serving.

## Security
- RLS enabled on all new tables with the standard 4-policy pattern (auth.uid() = user_id).
- `saved_recipes` nutrition column is nullable so existing rows are unaffected.
*/

-- Add nutrition column to saved_recipes (nullable, safe for existing rows)
ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS nutrition jsonb;

-- favorites
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_title text NOT NULL,
  recipe_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_favorites" ON favorites FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id, created_at DESC);

-- nutrition_history
CREATE TABLE IF NOT EXISTS nutrition_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_title text NOT NULL,
  meal_type text NOT NULL DEFAULT 'dinner',
  recipe_data jsonb NOT NULL,
  nutrition jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nutrition_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_nutrition_history" ON nutrition_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_nutrition_history" ON nutrition_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_nutrition_history" ON nutrition_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_nutrition_history" ON nutrition_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_history_user_id ON nutrition_history(user_id, generated_at DESC);
