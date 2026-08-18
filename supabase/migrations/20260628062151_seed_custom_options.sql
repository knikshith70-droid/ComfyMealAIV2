/*
# Seed preset custom_options

## Overview
Populates the shared `custom_options` table with the preset chip options shown in onboarding, so every new user sees a sensible starting list. Users can add their own values, which are inserted into the same table and become visible to everyone.

## Categories seeded
1. allergy — common allergens/exclusions (peanuts, tree nuts, dairy, eggs, gluten, shellfish, soy, sesame, fish, wheat).
2. lifestyle — dietary lifestyles (vegan, vegetarian, pescatarian, keto, paleo, mediterranean, whole30, halal, kosher, low-carb).
3. cuisine — preferred cuisines (italian, mexican, japanese, indian, thai, mediterranean, chinese, french, korean, middle eastern, american, greek, vietnamese, spanish).
4. goal — what matters most in meal planning (save time, eat healthier, budget-friendly, kid-friendly, reduce waste, more variety, high protein, weight loss, comfort food, adventurous).

## Security
No policy changes — INSERT runs as a privileged migration role. The UNIQUE (category, value) constraint makes this idempotent via ON CONFLICT DO NOTHING.

## Notes
1. All preset rows have created_by = NULL (system seed).
2. User-added rows will have created_by set to the adding user's id.
*/

INSERT INTO custom_options (category, value) VALUES
  ('allergy', 'peanuts'),
  ('allergy', 'tree nuts'),
  ('allergy', 'dairy'),
  ('allergy', 'eggs'),
  ('allergy', 'gluten'),
  ('allergy', 'shellfish'),
  ('allergy', 'soy'),
  ('allergy', 'sesame'),
  ('allergy', 'fish'),
  ('allergy', 'wheat'),
  ('lifestyle', 'vegan'),
  ('lifestyle', 'vegetarian'),
  ('lifestyle', 'pescatarian'),
  ('lifestyle', 'keto'),
  ('lifestyle', 'paleo'),
  ('lifestyle', 'mediterranean'),
  ('lifestyle', 'whole30'),
  ('lifestyle', 'halal'),
  ('lifestyle', 'kosher'),
  ('lifestyle', 'low-carb'),
  ('cuisine', 'italian'),
  ('cuisine', 'mexican'),
  ('cuisine', 'japanese'),
  ('cuisine', 'indian'),
  ('cuisine', 'thai'),
  ('cuisine', 'mediterranean'),
  ('cuisine', 'chinese'),
  ('cuisine', 'french'),
  ('cuisine', 'korean'),
  ('cuisine', 'middle eastern'),
  ('cuisine', 'american'),
  ('cuisine', 'greek'),
  ('cuisine', 'vietnamese'),
  ('cuisine', 'spanish'),
  ('goal', 'save time'),
  ('goal', 'eat healthier'),
  ('goal', 'budget-friendly'),
  ('goal', 'kid-friendly'),
  ('goal', 'reduce waste'),
  ('goal', 'more variety'),
  ('goal', 'high protein'),
  ('goal', 'weight loss'),
  ('goal', 'comfort food'),
  ('goal', 'adventurous')
ON CONFLICT (category, value) DO NOTHING;