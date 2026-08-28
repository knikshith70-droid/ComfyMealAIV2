/*
# Fix missing table-level grants and custom_options INSERT default

## Problem
All application tables were created without SELECT/INSERT/UPDATE/DELETE grants
for the `anon` and `authenticated` roles. Only REFERENCES/TRIGGER/TRUNCATE were
present, which meant:
  - custom_options chips couldn't load during onboarding (SELECT blocked)
  - profiles couldn't be created or read (INSERT/SELECT blocked)
  - All other user data tables were similarly inaccessible

Additionally, custom_options.created_by had no DEFAULT, but the INSERT policy
required auth.uid() = created_by, so "Add your own" always failed with a policy
violation.

## Fixes
1. Grant SELECT, INSERT, UPDATE, DELETE on every user-facing table to the
   appropriate roles (anon gets SELECT on custom_options; authenticated gets
   full CRUD on all tables).
2. Add DEFAULT auth.uid() to custom_options.created_by so user-added chips
   automatically carry the inserting user's id, satisfying the INSERT policy.
*/

-- custom_options: anon + authenticated can SELECT; authenticated can INSERT/UPDATE/DELETE
GRANT SELECT ON TABLE custom_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE custom_options TO authenticated;

-- profiles: authenticated full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE profiles TO authenticated;

-- pantry_items: authenticated full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pantry_items TO authenticated;

-- flex_sessions: authenticated full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE flex_sessions TO authenticated;

-- saved_recipes: authenticated full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE saved_recipes TO authenticated;

-- nutrition_history: authenticated full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nutrition_history TO authenticated;

-- meal_plans: authenticated full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE meal_plans TO authenticated;

-- favorites: authenticated full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE favorites TO authenticated;

-- Fix custom_options.created_by: default to auth.uid() so INSERT policy passes
ALTER TABLE custom_options
  ALTER COLUMN created_by SET DEFAULT auth.uid();
