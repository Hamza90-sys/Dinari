-- Hardening patch for manual top-ups and secure request intake.
-- Safe to run after 2026-05-03_manual_topups.sql on existing environments.

DO $$
BEGIN
  IF to_regclass('public.payment_requests') IS NOT NULL THEN
    UPDATE public.payment_requests
    SET payment_method = CASE lower(trim(payment_method))
      WHEN 'd17' THEN 'D17'
      WHEN 'bank transfer' THEN 'Bank Transfer'
      WHEN 'flouci' THEN 'Flouci'
      ELSE payment_method
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'payment_requests_payment_method_check'
        AND conrelid = 'public.payment_requests'::regclass
    ) THEN
      ALTER TABLE public.payment_requests
        ADD CONSTRAINT payment_requests_payment_method_check
        CHECK (payment_method IN ('D17', 'Bank Transfer', 'Flouci'));
    END IF;
  ELSE
    RAISE NOTICE 'Skipping payment_requests hardening because table public.payment_requests does not exist yet.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_request_secure(
  p_service_name text,
  p_plan_name text,
  p_account_email text,
  p_account_access_type public.account_access_type,
  p_account_password text DEFAULT null,
  p_notes text DEFAULT null,
  p_amount_tnd numeric DEFAULT null,
  p_phone_number text DEFAULT null,
  p_preferred_contact_method public.preferred_contact_method DEFAULT null
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, private'
AS $$
DECLARE
  v_password_encrypted bytea;
  v_account_email text;
  v_phone_number text;
  v_request public.requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_service_name IS NULL OR length(trim(p_service_name)) = 0 THEN
    RAISE EXCEPTION 'Service name is required';
  END IF;

  IF p_plan_name IS NULL OR length(trim(p_plan_name)) = 0 THEN
    RAISE EXCEPTION 'Plan name is required';
  END IF;

  v_account_email := lower(trim(COALESCE(p_account_email, '')));
  IF length(v_account_email) = 0 THEN
    RAISE EXCEPTION 'Account email is required';
  END IF;

  v_phone_number := regexp_replace(COALESCE(p_phone_number, ''), '\s+', '', 'g');
  IF v_phone_number = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;
  IF v_phone_number !~ '^\+216\d{8}$' THEN
    RAISE EXCEPTION 'Phone number must match +216XXXXXXXX';
  END IF;

  IF p_preferred_contact_method IS NULL THEN
    RAISE EXCEPTION 'Preferred contact method is required';
  END IF;

  IF p_account_access_type = 'existing' AND length(trim(COALESCE(p_account_password, ''))) = 0 THEN
    RAISE EXCEPTION 'Account password is required for existing account upgrades';
  END IF;

  IF p_account_access_type = 'existing' AND p_account_password IS NOT NULL AND length(trim(p_account_password)) > 0 THEN
    v_password_encrypted := pgp_sym_encrypt(p_account_password, private.get_credential_key());
  END IF;

  INSERT INTO public.requests (
    user_id,
    service_name,
    plan_name,
    account_email,
    account_access_type,
    account_password_encrypted,
    amount_tnd,
    notes,
    phone_number,
    preferred_contact_method
  )
  VALUES (
    auth.uid(),
    trim(p_service_name),
    trim(p_plan_name),
    v_account_email,
    p_account_access_type,
    v_password_encrypted,
    COALESCE(p_amount_tnd, 0),
    p_notes,
    v_phone_number,
    p_preferred_contact_method
  )
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment_request(
  p_amount numeric,
  p_method text,
  p_transaction_reference text DEFAULT null,
  p_screenshot_url text DEFAULT null,
  p_note text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request_id uuid;
  v_method text;
  v_screenshot_url text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  v_method := CASE lower(trim(COALESCE(p_method, '')))
    WHEN 'd17' THEN 'D17'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    WHEN 'flouci' THEN 'Flouci'
    ELSE NULL
  END;
  IF v_method IS NULL THEN
    RAISE EXCEPTION 'Payment method must be D17, Bank Transfer, or Flouci';
  END IF;

  v_screenshot_url := trim(COALESCE(p_screenshot_url, ''));
  IF length(v_screenshot_url) = 0 THEN
    RAISE EXCEPTION 'Payment proof screenshot is required';
  END IF;
  IF position(auth.uid()::text || '/' in v_screenshot_url) <> 1 THEN
    RAISE EXCEPTION 'Invalid proof path';
  END IF;

  INSERT INTO public.payment_requests (
    user_id,
    amount_tnd,
    payment_method,
    transaction_reference,
    screenshot_url,
    note
  )
  VALUES (
    auth.uid(),
    p_amount,
    v_method,
    NULLIF(trim(p_transaction_reference), ''),
    v_screenshot_url,
    NULLIF(trim(p_note), '')
  )
  RETURNING id INTO v_request_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    auth.uid(),
    'Top-up submitted',
    'Your top-up request is awaiting manual verification.'
  );

  PERFORM private.log_payment_request_event(
    v_request_id,
    'submitted',
    jsonb_build_object('amount_tnd', p_amount, 'method', v_method)
  );

  RETURN v_request_id;
END;
$$;
