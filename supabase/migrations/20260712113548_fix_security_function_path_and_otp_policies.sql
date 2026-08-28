-- 1. Fix mutable search_path on update_updated_at trigger function.
--    SET search_path = '' prevents search_path-injection attacks.
CREATE OR REPLACE FUNCTION public.update_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. RLS policies for otp_codes.
--    Edge functions run as service_role and bypass RLS, so they continue to
--    work. Blocking all direct client-role access is the correct posture.
CREATE POLICY "otp_codes_no_select" ON public.otp_codes
  FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "otp_codes_no_insert" ON public.otp_codes
  FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "otp_codes_no_update" ON public.otp_codes
  FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "otp_codes_no_delete" ON public.otp_codes
  FOR DELETE TO anon, authenticated USING (false);
