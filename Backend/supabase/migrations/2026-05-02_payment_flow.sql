-- Payment Flow Enhancement Migration
-- Adds payment reference tracking and enhanced payment session support

-- Add payment reference to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_reference text unique,
ADD COLUMN IF NOT EXISTS payment_method_type text DEFAULT 'sandbox',
ADD COLUMN IF NOT EXISTS session_id text unique,
ADD COLUMN IF NOT EXISTS sandbox_status text DEFAULT 'pending';

-- Add payment tracking to requests table
ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS last_payment_attempt_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_attempts integer DEFAULT 0;

-- Create payment sessions table for checkout flow
CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_reference text NOT NULL UNIQUE,
  session_id text UNIQUE,
  checkout_url text,
  status text NOT NULL DEFAULT 'pending',
  amount_tnd numeric(12,2) NOT NULL CHECK (amount_tnd >= 0),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indices for efficient querying
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON public.payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_request_id ON public.payment_sessions(request_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON public.payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_payment_reference ON public.payment_sessions(payment_reference);

CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON public.payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON public.payments(session_id);

CREATE INDEX IF NOT EXISTS idx_requests_payment_reference ON public.requests(payment_reference);

-- Create payment events table for audit trail
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.payment_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_session_id ON public.payment_events(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON public.payment_events(event_type);

-- Helper function to generate payment reference
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS text AS $$
DECLARE
  year integer;
  counter integer;
  reference text;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::integer;
  counter := (EXTRACT(EPOCH FROM NOW()) * 1000)::integer % 9000 + 1000;
  reference := 'DIN-' || year || '-' || counter;
  RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for payment_sessions
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment sessions"
  ON public.payment_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create payment sessions for their requests"
  ON public.payment_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payment sessions"
  ON public.payment_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for payment_events
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment events for their payments"
  ON public.payment_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_events.payment_id
    AND p.user_id = auth.uid()
  ));

-- Admin policies for payment_sessions
CREATE POLICY "Admins can view all payment sessions"
  ON public.payment_sessions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Admin policies for payment_events  
CREATE POLICY "Admins can view all payment events"
  ON public.payment_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
