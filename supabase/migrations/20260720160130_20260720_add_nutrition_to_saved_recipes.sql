/*
# Add nutrition column to saved_recipes

1. Context
- The `saved_recipes` table was created without a `nutrition` column.
- The frontend `saveRecipe()` inserts `nutrition: recipe.nutrition ?? null`, which fails against the current schema, so bookmarked recipes never persist and never appear in the Saved Recipes section.
- An earlier migration (20260629144316) intended to add this column but it is absent from the live table, so we re-apply it here in an idempotent way.

2. Changes
- `saved_recipes`: add nullable `nutrition jsonb` column (safe for existing rows; defaults to null).

3. Security
- No RLS or policy changes. Existing owner-scoped policies on `saved_recipes` remain unchanged.
*/

ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS nutrition jsonb;
