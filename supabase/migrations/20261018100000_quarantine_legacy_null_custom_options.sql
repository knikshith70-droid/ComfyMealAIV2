/*
  Privacy hardening for legacy custom_options rows with created_by IS NULL.
  Only explicitly seeded presets remain globally visible. Ambiguous legacy
  rows are archived in a table unavailable to application roles, then removed
  from the app-visible table so their values cannot leak across accounts.
*/
CREATE TABLE IF NOT EXISTS public.custom_options_legacy_quarantine (
  id uuid PRIMARY KEY,
  category text NOT NULL,
  value text NOT NULL,
  created_by uuid,
  created_at timestamptz,
  quarantined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_options_legacy_quarantine ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.custom_options_legacy_quarantine FROM PUBLIC, anon, authenticated;

INSERT INTO public.custom_options_legacy_quarantine
  (id, category, value, created_by, created_at)
SELECT id, category, value, created_by, created_at
FROM public.custom_options
WHERE created_by IS NULL
  AND NOT (
    (category = 'allergy' AND value IN ('peanuts','tree nuts','dairy','eggs','gluten','shellfish','soy','sesame','fish','wheat'))
    OR (category = 'lifestyle' AND value IN ('vegan','vegetarian','pescatarian','keto','paleo','mediterranean','whole30','halal','kosher','low-carb'))
    OR (category = 'cuisine' AND value IN ('italian','mexican','japanese','indian','thai','mediterranean','chinese','french','korean','middle eastern','american','greek','vietnamese','spanish'))
    OR (category = 'goal' AND value IN ('save time','eat healthier','budget-friendly','kid-friendly','reduce waste','more variety','high protein','weight loss','comfort food','adventurous'))
  )
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.custom_options
WHERE created_by IS NULL
  AND NOT (
    (category = 'allergy' AND value IN ('peanuts','tree nuts','dairy','eggs','gluten','shellfish','soy','sesame','fish','wheat'))
    OR (category = 'lifestyle' AND value IN ('vegan','vegetarian','pescatarian','keto','paleo','mediterranean','whole30','halal','kosher','low-carb'))
    OR (category = 'cuisine' AND value IN ('italian','mexican','japanese','indian','thai','mediterranean','chinese','french','korean','middle eastern','american','greek','vietnamese','spanish'))
    OR (category = 'goal' AND value IN ('save time','eat healthier','budget-friendly','kid-friendly','reduce waste','more variety','high protein','weight loss','comfort food','adventurous'))
  );
