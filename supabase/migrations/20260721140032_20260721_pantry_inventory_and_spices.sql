/*
# Pantry inventory: quantities, units, and spices table

## Overview
Upgrades the pantry from a name-only list into a real inventory system with
quantities and units, and adds a separate "Spices & Condiments" table so the
AI no longer assumes users always have common spices.

## 1. pantry_items — new columns
- `quantity` (double precision, default 1): numeric amount of the ingredient on hand.
- `unit` (text, default 'pieces'): measurement unit (g, kg, ml, L, tsp, tbsp,
  cups, pieces, cloves, slices, cans, etc.).
- `low_stock_threshold` (double precision, default 1): below-or-equal this
  value the item shows a "Low Stock" indicator.

All three are nullable-safe and default-populated so existing rows remain valid.

## 2. spice_items — new table
Independent from pantry_items. Stores spices, condiments, oils, sauces,
herbs, etc. that the user actually has on hand.
- `id` (uuid PK)
- `user_id` (uuid, NOT NULL DEFAULT auth.uid(), FK auth.users ON DELETE CASCADE)
- `name` (text, NOT NULL)
- `quantity` (double precision, default 1)
- `unit` (text, default 'pieces')
- `low_stock_threshold` (double precision, default 1)
- `created_at` (timestamptz, default now())

## 3. saved_recipes — new column
- `ingredient_details` (jsonb, nullable): structured ingredient list with
  { name, quantity, unit } so the app knows how much of each ingredient a
  recipe uses, enabling "Cook Recipe" pantry deduction.

## 4. Security
- RLS enabled on `spice_items` with owner-scoped CRUD (TO authenticated,
  auth.uid() = user_id), 4 separate policies.
- No changes to pantry_items or saved_recipes policies (already owner-scoped).

## 5. Notes
1. Existing pantry rows get quantity=1, unit='pieces', low_stock_threshold=1.
2. Existing saved_recipes rows get ingredient_details=NULL.
3. All statements are idempotent (IF NOT EXISTS / DO block).
*/

-- pantry_items: add quantity, unit, low_stock_threshold
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pantry_items' AND column_name='quantity') THEN
    ALTER TABLE pantry_items ADD COLUMN quantity double precision NOT NULL DEFAULT 1;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pantry_items' AND column_name='unit') THEN
    ALTER TABLE pantry_items ADD COLUMN unit text NOT NULL DEFAULT 'pieces';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pantry_items' AND column_name='low_stock_threshold') THEN
    ALTER TABLE pantry_items ADD COLUMN low_stock_threshold double precision NOT NULL DEFAULT 1;
  END IF;
END $$;

-- saved_recipes: add ingredient_details
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='saved_recipes' AND column_name='ingredient_details') THEN
    ALTER TABLE saved_recipes ADD COLUMN ingredient_details jsonb;
  END IF;
END $$;

-- spice_items table
CREATE TABLE IF NOT EXISTS spice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity double precision NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pieces',
  low_stock_threshold double precision NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_spices" ON spice_items;
CREATE POLICY "select_own_spices" ON spice_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_spices" ON spice_items;
CREATE POLICY "insert_own_spices" ON spice_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_spices" ON spice_items;
CREATE POLICY "update_own_spices" ON spice_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_spices" ON spice_items;
CREATE POLICY "delete_own_spices" ON spice_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_spice_items_user_id ON spice_items(user_id, created_at DESC);
