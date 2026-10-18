/*
  Privacy fix: onboarding custom options must not be visible across accounts.

  Preset options are rows with created_by IS NULL.
  User-created options are readable only by their owner.
  Remove every existing SELECT policy on custom_options first because
  permissive PostgreSQL RLS policies are OR-combined; leaving an older
  USING (true) policy would continue exposing every user's options.
*/
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'custom_options'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.custom_options', policy_row.policyname);
  END LOOP;
END
$$;

CREATE POLICY "read_global_and_own_custom_options"
  ON public.custom_options
  FOR SELECT
  TO anon, authenticated
  USING (
    created_by IS NULL
    OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
  );

-- Keep writes owner-scoped even if a historical policy was overly broad.
DROP POLICY IF EXISTS "insert_custom_options" ON public.custom_options;
DROP POLICY IF EXISTS "update_own_custom_options" ON public.custom_options;
DROP POLICY IF EXISTS "delete_own_custom_options" ON public.custom_options;

CREATE POLICY "insert_own_custom_options"
  ON public.custom_options
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "update_own_custom_options"
  ON public.custom_options
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "delete_own_custom_options"
  ON public.custom_options
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);
