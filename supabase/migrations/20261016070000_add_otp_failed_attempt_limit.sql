-- Add atomic server-side OTP verification throttling.
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.verify_otp_attempt(
  p_email text,
  p_code_hash text
)
RETURNS TABLE(status text, otp_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code public.otp_codes%ROWTYPE;
BEGIN
  SELECT *
    INTO v_code
    FROM public.otp_codes
   WHERE email = lower(trim(p_email))
     AND consumed_at IS NULL
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_code.failed_attempts >= 5 THEN
    RETURN QUERY SELECT 'locked'::text, v_code.id;
    RETURN;
  END IF;

  IF v_code.code_hash = p_code_hash THEN
    UPDATE public.otp_codes
       SET consumed_at = now()
     WHERE id = v_code.id
       AND consumed_at IS NULL;

    RETURN QUERY SELECT 'verified'::text, v_code.id;
    RETURN;
  END IF;

  UPDATE public.otp_codes
     SET failed_attempts = failed_attempts + 1
   WHERE id = v_code.id
   RETURNING * INTO v_code;

  IF v_code.failed_attempts >= 5 THEN
    RETURN QUERY SELECT 'locked'::text, v_code.id;
  ELSE
    RETURN QUERY SELECT 'invalid'::text, v_code.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_otp_attempt(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_otp_attempt(text, text) TO service_role;
