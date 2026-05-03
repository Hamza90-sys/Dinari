-- Manual top-up workflow + secure request fields

-- New enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_request_status') THEN
    CREATE TYPE public.payment_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_type') THEN
    CREATE TYPE public.wallet_transaction_type AS ENUM ('top_up', 'service_purchase', 'refund', 'adjustment');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_access_type') THEN
    CREATE TYPE public.account_access_type AS ENUM ('existing', 'new');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferred_contact_method') THEN
    CREATE TYPE public.preferred_contact_method AS ENUM ('Phone Call', 'WhatsApp', 'SMS');
  END IF;
END $$;

-- Requests: account access + contact verification + encrypted password
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS account_access_type public.account_access_type NOT NULL DEFAULT 'existing',
  ADD COLUMN IF NOT EXISTS account_password_encrypted bytea,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method public.preferred_contact_method;

-- Manual top-up requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_tnd numeric(12,2) NOT NULL CHECK (amount_tnd > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('D17', 'Bank Transfer', 'Flouci')),
  transaction_reference text,
  screenshot_url text,
  note text,
  status public.payment_request_status NOT NULL DEFAULT 'pending',
  admin_note text,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_tnd numeric(12,2) NOT NULL,
  balance_before numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  transaction_type public.wallet_transaction_type NOT NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  payment_request_id uuid REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Manual payment audit events
CREATE TABLE IF NOT EXISTS public.payment_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role public.user_role,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payment_request_events_request_id ON public.payment_request_events(payment_request_id);

-- Credential helper
CREATE OR REPLACE FUNCTION private.get_credential_key()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(current_setting('app.credential_key', true), 'dinari_dev_key');
$$;

-- Payment request audit logging
CREATE OR REPLACE FUNCTION private.log_payment_request_event(
  p_payment_request_id uuid,
  p_event_type text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_role public.user_role;
BEGIN
  SELECT p.role INTO v_actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  INSERT INTO public.payment_request_events (
    payment_request_id,
    actor_id,
    actor_role,
    event_type,
    details
  )
  VALUES (
    p_payment_request_id,
    auth.uid(),
    v_actor_role,
    p_event_type,
    COALESCE(p_details, '{}'::jsonb)
  );
END;
$$;

-- Secure request creation with encrypted credentials
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

-- Admin-only credential reveal
CREATE OR REPLACE FUNCTION public.admin_reveal_request_password(
  p_request_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, private'
AS $$
DECLARE
  v_request public.requests;
  v_password text;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE request_code = p_request_code LIMIT 1;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.account_password_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  v_password := pgp_sym_decrypt(v_request.account_password_encrypted, private.get_credential_key());

  PERFORM private.log_request_event(
    v_request.id,
    v_request.request_code,
    'password_revealed',
    jsonb_build_object('revealed_at', now())
  );

  RETURN v_password;
END;
$$;

-- User submits manual top-up request
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

-- Admin approve top-up request
CREATE OR REPLACE FUNCTION public.admin_approve_payment_request(
  p_payment_request_id uuid,
  p_admin_note text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.payment_requests;
  v_balance numeric;
  v_new_balance numeric;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_request
  FROM public.payment_requests
  WHERE id = p_payment_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment request already processed';
  END IF;

  SELECT balance_tnd INTO v_balance
  FROM public.profiles
  WHERE id = v_request.user_id
  FOR UPDATE;

  v_new_balance := COALESCE(v_balance, 0) + v_request.amount_tnd;

  UPDATE public.profiles
  SET balance_tnd = v_new_balance
  WHERE id = v_request.user_id;

  UPDATE public.payment_requests
  SET status = 'approved',
      admin_note = p_admin_note,
      admin_id = auth.uid(),
      approved_at = now()
  WHERE id = v_request.id;

  INSERT INTO public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    payment_request_id,
    description
  )
  VALUES (
    v_request.user_id,
    v_request.amount_tnd,
    COALESCE(v_balance, 0),
    v_new_balance,
    'top_up',
    v_request.id,
    'Top-up approved'
  );

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_request.user_id,
    'Top-up approved',
    'Your top-up of ' || v_request.amount_tnd || ' TND has been approved.'
  );

  PERFORM private.log_payment_request_event(
    v_request.id,
    'approved',
    jsonb_build_object('amount_tnd', v_request.amount_tnd, 'admin_note', p_admin_note)
  );
END;
$$;

-- Admin reject top-up request
CREATE OR REPLACE FUNCTION public.admin_reject_payment_request(
  p_payment_request_id uuid,
  p_admin_note text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.payment_requests;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_request
  FROM public.payment_requests
  WHERE id = p_payment_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment request already processed';
  END IF;

  UPDATE public.payment_requests
  SET status = 'rejected',
      admin_note = p_admin_note,
      admin_id = auth.uid(),
      rejected_at = now()
  WHERE id = v_request.id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_request.user_id,
    'Top-up rejected',
    'Your top-up request was rejected. Please review the admin note.'
  );

  PERFORM private.log_payment_request_event(
    v_request.id,
    'rejected',
    jsonb_build_object('admin_note', p_admin_note)
  );
END;
$$;

-- Update balance functions with wallet transaction logging
CREATE OR REPLACE FUNCTION public.top_up_balance(p_amount numeric, p_method text DEFAULT 'D17')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id uuid;
  v_balance numeric;
  v_new_balance numeric;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  SELECT balance_tnd INTO v_balance
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  v_new_balance := COALESCE(v_balance, 0) + p_amount;

  UPDATE public.profiles
  SET balance_tnd = v_new_balance
  WHERE id = auth.uid();

  INSERT INTO public.payments (user_id, amount_tnd, payment_method, status)
  VALUES (auth.uid(), p_amount, p_method, 'Completed')
  RETURNING id INTO v_payment_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (auth.uid(), 'Balance updated', 'Top-up of ' || p_amount || ' TND completed');

  INSERT INTO public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    description
  )
  VALUES (
    auth.uid(),
    p_amount,
    COALESCE(v_balance, 0),
    v_new_balance,
    'adjustment',
    'Admin balance adjustment'
  );

  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_request(p_request_code text, p_method text DEFAULT 'D17')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.requests;
  v_payment_id uuid;
  v_balance numeric;
  v_new_balance numeric;
BEGIN
  SELECT * INTO v_request
  FROM public.requests
  WHERE request_code = p_request_code
    AND user_id = auth.uid()
  LIMIT 1;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status <> 'Awaiting Payment' THEN
    RAISE EXCEPTION 'Request is not awaiting payment';
  END IF;

  SELECT balance_tnd INTO v_balance
  FROM public.profiles
  WHERE id = auth.uid();

  IF COALESCE(v_balance, 0) < v_request.amount_tnd THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  v_new_balance := COALESCE(v_balance, 0) - v_request.amount_tnd;

  UPDATE public.profiles
  SET balance_tnd = v_new_balance
  WHERE id = auth.uid();

  UPDATE public.requests
  SET status = 'Paid', payment_method = p_method, payment_date = now(), updated_at = now()
  WHERE id = v_request.id;

  INSERT INTO public.payments (request_id, user_id, amount_tnd, payment_method, status)
  VALUES (v_request.id, auth.uid(), v_request.amount_tnd, p_method, 'Completed')
  RETURNING id INTO v_payment_id;

  INSERT INTO public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    request_id,
    description
  )
  VALUES (
    auth.uid(),
    v_request.amount_tnd,
    COALESCE(v_balance, 0),
    v_new_balance,
    'service_purchase',
    v_request.id,
    'Service purchase'
  );

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (auth.uid(), 'Payment received', 'Payment received for request ' || v_request.request_code);

  PERFORM private.log_request_event(
    v_request.id,
    v_request.request_code,
    'payment_recorded',
    jsonb_build_object(
      'payment_id', v_payment_id,
      'method', p_method,
      'amount_tnd', v_request.amount_tnd
    )
  );

  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_balance(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance numeric;
  v_payment_id uuid;
  v_new_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  SELECT balance_tnd INTO v_balance FROM public.profiles WHERE id = auth.uid();
  IF COALESCE(v_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  v_new_balance := COALESCE(v_balance, 0) - p_amount;

  UPDATE public.profiles
  SET balance_tnd = v_new_balance
  WHERE id = auth.uid();

  INSERT INTO public.payments (user_id, amount_tnd, payment_method, status)
  VALUES (auth.uid(), p_amount, 'Withdrawal', 'Completed')
  RETURNING id INTO v_payment_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (auth.uid(), 'Withdrawal completed', 'Withdrawal of ' || p_amount || ' TND completed');

  INSERT INTO public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    description
  )
  VALUES (
    auth.uid(),
    p_amount,
    COALESCE(v_balance, 0),
    v_new_balance,
    'adjustment',
    'Withdrawal'
  );

  RETURN v_payment_id;
END;
$$;

-- RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_requests_select" ON public.payment_requests;
CREATE POLICY "payment_requests_select" ON public.payment_requests
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) or (select private.is_admin()));

DROP POLICY IF EXISTS "payment_requests_insert" ON public.payment_requests;
CREATE POLICY "payment_requests_insert" ON public.payment_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "payment_requests_update_admin" ON public.payment_requests;
CREATE POLICY "payment_requests_update_admin" ON public.payment_requests
FOR UPDATE TO authenticated
USING ((select private.is_admin()))
WITH CHECK ((select private.is_admin()));

DROP POLICY IF EXISTS "wallet_transactions_select" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_select" ON public.wallet_transactions
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) or (select private.is_admin()));

DROP POLICY IF EXISTS "payment_request_events_select" ON public.payment_request_events;
CREATE POLICY "payment_request_events_select" ON public.payment_request_events
FOR SELECT TO authenticated
USING (
  exists (
    select 1
    from public.payment_requests pr
    where pr.id = payment_request_events.payment_request_id
      and (
        pr.user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

-- Storage bucket for top-up proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('topup-proofs', 'topup-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "topup_proofs_select" ON storage.objects;
CREATE POLICY "topup_proofs_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

DROP POLICY IF EXISTS "topup_proofs_insert" ON storage.objects;
CREATE POLICY "topup_proofs_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'topup-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

DROP POLICY IF EXISTS "topup_proofs_update" ON storage.objects;
CREATE POLICY "topup_proofs_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
)
WITH CHECK (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

DROP POLICY IF EXISTS "topup_proofs_delete" ON storage.objects;
CREATE POLICY "topup_proofs_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);
