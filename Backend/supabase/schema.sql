-- Dinari Supabase schema + RLS + helper functions

create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'admin');
create type public.request_status as enum ('Awaiting Payment', 'Paid', 'Processing', 'Completed', 'Failed');
create type public.payment_status as enum ('Completed', 'Failed', 'Pending');
create type public.subscription_status as enum ('Active', 'Cancelled');
create type public.payment_request_status as enum ('pending', 'approved', 'rejected');
create type public.wallet_transaction_type as enum ('top_up', 'service_purchase', 'refund', 'adjustment');
create type public.account_access_type as enum ('existing', 'new');
create type public.preferred_contact_method as enum ('Phone Call', 'WhatsApp', 'SMS');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'user',
  balance_tnd numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create sequence if not exists public.request_code_seq start 1001;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_name text not null,
  plan_name text not null,
  account_email text not null,
  account_access_type public.account_access_type not null default 'existing',
  account_password_encrypted bytea,
  phone_number text,
  preferred_contact_method public.preferred_contact_method,
  amount_tnd numeric(12,2) not null check (amount_tnd >= 0),
  status public.request_status not null default 'Awaiting Payment',
  notes text,
  admin_notes text,
  payment_method text,
  payment_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_tnd numeric(12,2) not null check (amount_tnd >= 0),
  payment_method text not null,
  status public.payment_status not null default 'Completed',
  proof_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_tnd numeric(12,2) not null check (amount_tnd > 0),
  payment_method text not null check (payment_method in ('D17', 'Bank Transfer', 'Flouci')),
  transaction_reference text,
  screenshot_url text,
  note text,
  status public.payment_request_status not null default 'pending',
  admin_note text,
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_tnd numeric(12,2) not null,
  balance_before numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  transaction_type public.wallet_transaction_type not null,
  request_id uuid references public.requests(id) on delete set null,
  payment_request_id uuid references public.payment_requests(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_request_events (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_requests_user_id on public.payment_requests(user_id);
create index if not exists idx_payment_requests_status on public.payment_requests(status);
create index if not exists idx_wallet_transactions_user_id on public.wallet_transactions(user_id);
create index if not exists idx_wallet_transactions_type on public.wallet_transactions(transaction_type);
create index if not exists idx_payment_request_events_request_id on public.payment_request_events(payment_request_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_name text not null,
  plan_name text not null,
  start_date timestamptz not null default now(),
  renewal_date timestamptz not null,
  status public.subscription_status not null default 'Active'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.service_catalog (
  service_name text primary key,
  amount_tnd numeric(12,2) not null check (amount_tnd > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.service_catalog (service_name, amount_tnd, active)
values
  ('ChatGPT', 79, true),
  ('Netflix', 65, true),
  ('Spotify', 49, true),
  ('Disney+', 55, true),
  ('Apple TV+', 45, true),
  ('YouTube Premium', 39, true),
  ('Adobe', 159, true),
  ('Notion', 29, true),
  ('Other', 50, true)
on conflict (service_name) do update
set amount_tnd = excluded.amount_tnd,
    active = excluded.active;

create table if not exists public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  request_code text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create schema if not exists private;

create or replace function private.get_service_price(p_service_name text)
returns numeric
language sql
security definer
set search_path = ''
stable
as $$
  select sc.amount_tnd
  from public.service_catalog sc
  where lower(sc.service_name) = lower(trim(p_service_name))
    and sc.active = true
  limit 1;
$$;

create or replace function private.log_request_event(
  p_request_id uuid,
  p_request_code text,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.user_role;
begin
  select p.role into v_actor_role
  from public.profiles p
  where p.id = auth.uid();

  insert into public.request_events (
    request_id,
    request_code,
    actor_id,
    actor_role,
    event_type,
    details
  )
  values (
    p_request_id,
    p_request_code,
    auth.uid(),
    v_actor_role,
    p_event_type,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function private.get_credential_key()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(current_setting('app.credential_key', true), 'dinari_dev_key');
$$;

create or replace function private.log_payment_request_event(
  p_payment_request_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.user_role;
begin
  select p.role into v_actor_role
  from public.profiles p
  where p.id = auth.uid();

  insert into public.payment_request_events (
    payment_request_id,
    actor_id,
    actor_role,
    event_type,
    details
  )
  values (
    p_payment_request_id,
    auth.uid(),
    v_actor_role,
    p_event_type,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function public.set_request_amount()
returns trigger
language plpgsql
security definer
set search_path = 'public, private'
as $$
declare
  v_catalog_price numeric;
begin
  select private.get_service_price(new.service_name) into v_catalog_price;

  if (select private.is_admin()) and new.amount_tnd is not null and new.amount_tnd > 0 then
    return new;
  end if;

  new.amount_tnd := coalesce(v_catalog_price, new.amount_tnd, 50);

  if new.amount_tnd <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  return new;
end;
$$;

create or replace function public.set_request_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.request_code is null or new.request_code = '' then
    new.request_code := 'REQ-' || nextval('public.request_code_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_request_code on public.requests;
create trigger trg_set_request_code
before insert on public.requests
for each row execute procedure public.set_request_code();

drop trigger if exists trg_set_request_amount on public.requests;
create trigger trg_set_request_amount
before insert on public.requests
for each row execute procedure public.set_request_amount();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at
before update on public.requests
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, balance_tnd)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'user',
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.create_request_secure(
  p_service_name text,
  p_plan_name text,
  p_account_email text,
  p_account_access_type public.account_access_type,
  p_account_password text default null,
  p_notes text default null,
  p_amount_tnd numeric default null,
  p_phone_number text default null,
  p_preferred_contact_method public.preferred_contact_method default null
)
returns public.requests
language plpgsql
security definer
set search_path = 'public, private'
as $$
declare
  v_password_encrypted bytea;
  v_account_email text;
  v_phone_number text;
  v_request public.requests;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_service_name is null or length(trim(p_service_name)) = 0 then
    raise exception 'Service name is required';
  end if;

  if p_plan_name is null or length(trim(p_plan_name)) = 0 then
    raise exception 'Plan name is required';
  end if;

  v_account_email := lower(trim(coalesce(p_account_email, '')));
  if length(v_account_email) = 0 then
    raise exception 'Account email is required';
  end if;

  v_phone_number := regexp_replace(coalesce(p_phone_number, ''), '\s+', '', 'g');
  if v_phone_number = '' then
    raise exception 'Phone number is required';
  end if;
  if v_phone_number !~ '^\+216\d{8}$' then
    raise exception 'Phone number must match +216XXXXXXXX';
  end if;

  if p_preferred_contact_method is null then
    raise exception 'Preferred contact method is required';
  end if;

  if p_account_access_type = 'existing' and length(trim(coalesce(p_account_password, ''))) = 0 then
    raise exception 'Account password is required for existing account upgrades';
  end if;

  if p_account_access_type = 'existing' and p_account_password is not null and length(trim(p_account_password)) > 0 then
    v_password_encrypted := pgp_sym_encrypt(p_account_password, private.get_credential_key());
  end if;

  insert into public.requests (
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
  values (
    auth.uid(),
    trim(p_service_name),
    trim(p_plan_name),
    v_account_email,
    p_account_access_type,
    v_password_encrypted,
    coalesce(p_amount_tnd, 0),
    p_notes,
    v_phone_number,
    p_preferred_contact_method
  )
  returning * into v_request;

  return v_request;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.enforce_admin_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'admin' and lower(new.email) <> 'bestyhamza9@gmail.com' then
    raise exception 'Only bestyhamza9@gmail.com can be admin';
  end if;

  if new.role = 'admin' and (new.full_name is null or trim(new.full_name) = '') then
    new.full_name := 'HAMZA CHARGUI';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_admin_email on public.profiles;
create trigger trg_enforce_admin_email
before insert or update on public.profiles
for each row execute procedure public.enforce_admin_email();

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.get_user_role()
returns public.user_role
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'user'::public.user_role);
$$;

create or replace function public.top_up_balance(p_amount numeric, p_method text default 'D17')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_balance numeric;
  v_new_balance numeric;
begin
  if not private.is_admin() then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  select balance_tnd into v_balance
  from public.profiles
  where id = auth.uid()
  for update;

  v_new_balance := coalesce(v_balance, 0) + p_amount;

  update public.profiles
  set balance_tnd = v_new_balance
  where id = auth.uid();

  insert into public.payments (user_id, amount_tnd, payment_method, status)
  values (auth.uid(), p_amount, p_method, 'Completed')
  returning id into v_payment_id;

  insert into public.notifications (user_id, title, message)
  values (auth.uid(), 'Balance updated', 'Top-up of ' || p_amount || ' TND completed');

  insert into public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    description
  )
  values (
    auth.uid(),
    p_amount,
    coalesce(v_balance, 0),
    v_new_balance,
    'adjustment',
    'Admin balance adjustment'
  );

  return v_payment_id;
end;
$$;

create or replace function public.pay_request(p_request_code text, p_method text default 'D17')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.requests;
  v_payment_id uuid;
  v_balance numeric;
  v_new_balance numeric;
begin
  select * into v_request
  from public.requests
  where request_code = p_request_code
    and user_id = auth.uid()
  limit 1;

  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'Awaiting Payment' then
    raise exception 'Request is not awaiting payment';
  end if;

  select balance_tnd into v_balance
  from public.profiles
  where id = auth.uid();

  if coalesce(v_balance, 0) < v_request.amount_tnd then
    raise exception 'Insufficient balance';
  end if;

  v_new_balance := coalesce(v_balance, 0) - v_request.amount_tnd;

  update public.profiles
  set balance_tnd = v_new_balance
  where id = auth.uid();

  update public.requests
  set status = 'Paid', payment_method = p_method, payment_date = now(), updated_at = now()
  where id = v_request.id;

  insert into public.payments (request_id, user_id, amount_tnd, payment_method, status)
  values (v_request.id, auth.uid(), v_request.amount_tnd, p_method, 'Completed')
  returning id into v_payment_id;

  insert into public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    request_id,
    description
  )
  values (
    auth.uid(),
    v_request.amount_tnd,
    coalesce(v_balance, 0),
    v_new_balance,
    'service_purchase',
    v_request.id,
    'Service purchase'
  );

  insert into public.notifications (user_id, title, message)
  values (auth.uid(), 'Payment received', 'Payment received for request ' || v_request.request_code);

  perform private.log_request_event(
    v_request.id,
    v_request.request_code,
    'payment_recorded',
    jsonb_build_object(
      'payment_id', v_payment_id,
      'method', p_method,
      'amount_tnd', v_request.amount_tnd
    )
  );

  return v_payment_id;
end;
$$;

create or replace function public.withdraw_balance(p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance numeric;
  v_payment_id uuid;
  v_new_balance numeric;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  select balance_tnd into v_balance from public.profiles where id = auth.uid();
  if coalesce(v_balance, 0) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  v_new_balance := coalesce(v_balance, 0) - p_amount;

  update public.profiles
  set balance_tnd = v_new_balance
  where id = auth.uid();

  insert into public.payments (user_id, amount_tnd, payment_method, status)
  values (auth.uid(), p_amount, 'Withdrawal', 'Completed')
  returning id into v_payment_id;

  insert into public.notifications (user_id, title, message)
  values (auth.uid(), 'Withdrawal completed', 'Withdrawal of ' || p_amount || ' TND completed');

  insert into public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    description
  )
  values (
    auth.uid(),
    p_amount,
    coalesce(v_balance, 0),
    v_new_balance,
    'adjustment',
    'Withdrawal'
  );

  return v_payment_id;
end;
$$;

create or replace function public.admin_update_request_status(
  p_request_code text,
  p_status public.request_status,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.requests;
  v_transition_allowed boolean := false;
begin
  if not private.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_request from public.requests where request_code = p_request_code limit 1;

  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  if p_status = v_request.status then
    if p_admin_notes is not null then
      update public.requests
      set admin_notes = p_admin_notes,
          updated_at = now()
      where id = v_request.id;

      perform private.log_request_event(
        v_request.id,
        v_request.request_code,
        'admin_notes_updated',
        jsonb_build_object('admin_notes', p_admin_notes)
      );
    end if;
    return;
  end if;

  v_transition_allowed := case v_request.status
    when 'Awaiting Payment' then p_status in ('Paid', 'Failed')
    when 'Paid' then p_status in ('Processing', 'Failed')
    when 'Processing' then p_status in ('Completed', 'Failed')
    when 'Completed' then p_status = 'Completed'
    when 'Failed' then p_status in ('Processing', 'Failed')
    else false
  end;

  if not v_transition_allowed then
    raise exception 'Invalid status transition from % to %', v_request.status, p_status;
  end if;

  update public.requests
  set status = p_status,
      admin_notes = coalesce(p_admin_notes, admin_notes),
      payment_date = case when p_status = 'Paid' and payment_date is null then now() else payment_date end,
      updated_at = now()
  where id = v_request.id;

  if p_status = 'Completed' then
    insert into public.subscriptions (
      request_id,
      user_id,
      service_name,
      plan_name,
      renewal_date,
      status
    )
    values (
      v_request.id,
      v_request.user_id,
      v_request.service_name,
      v_request.plan_name,
      now() + interval '30 days',
      'Active'
    )
    on conflict (request_id) do nothing;
  end if;

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Request updated',
    'Your request ' || v_request.request_code || ' is now ' || p_status::text
  );

  perform private.log_request_event(
    v_request.id,
    v_request.request_code,
    'status_changed',
    jsonb_build_object(
      'from_status', v_request.status,
      'to_status', p_status,
      'admin_notes', p_admin_notes
    )
  );
end;
$$;

create or replace function public.admin_set_request_notes(
  p_request_code text,
  p_admin_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.requests;
begin
  if not private.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_request from public.requests where request_code = p_request_code limit 1;
  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  update public.requests
  set admin_notes = p_admin_notes,
      updated_at = now()
  where id = v_request.id;

  perform private.log_request_event(
    v_request.id,
    v_request.request_code,
    'admin_notes_updated',
    jsonb_build_object('admin_notes', p_admin_notes)
  );
end;
$$;

create or replace function public.admin_reveal_request_password(
  p_request_code text
)
returns text
language plpgsql
security definer
set search_path = 'public, private'
as $$
declare
  v_request public.requests;
  v_password text;
begin
  if not private.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_request from public.requests where request_code = p_request_code limit 1;
  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  if v_request.account_password_encrypted is null then
    return null;
  end if;

  v_password := pgp_sym_decrypt(v_request.account_password_encrypted, private.get_credential_key());

  perform private.log_request_event(
    v_request.id,
    v_request.request_code,
    'password_revealed',
    jsonb_build_object('revealed_at', now())
  );

  return v_password;
end;
$$;

create or replace function public.create_payment_request(
  p_amount numeric,
  p_method text,
  p_transaction_reference text default null,
  p_screenshot_url text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_method text;
  v_screenshot_url text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  v_method := case lower(trim(coalesce(p_method, '')))
    when 'd17' then 'D17'
    when 'bank transfer' then 'Bank Transfer'
    when 'flouci' then 'Flouci'
    else null
  end;
  if v_method is null then
    raise exception 'Payment method must be D17, Bank Transfer, or Flouci';
  end if;

  v_screenshot_url := trim(coalesce(p_screenshot_url, ''));
  if length(v_screenshot_url) = 0 then
    raise exception 'Payment proof screenshot is required';
  end if;
  if position(auth.uid()::text || '/' in v_screenshot_url) <> 1 then
    raise exception 'Invalid proof path';
  end if;

  insert into public.payment_requests (
    user_id,
    amount_tnd,
    payment_method,
    transaction_reference,
    screenshot_url,
    note
  )
  values (
    auth.uid(),
    p_amount,
    v_method,
    nullif(trim(p_transaction_reference), ''),
    v_screenshot_url,
    nullif(trim(p_note), '')
  )
  returning id into v_request_id;

  insert into public.notifications (user_id, title, message)
  values (
    auth.uid(),
    'Top-up submitted',
    'Your top-up request is awaiting manual verification.'
  );

  perform private.log_payment_request_event(
    v_request_id,
    'submitted',
    jsonb_build_object('amount_tnd', p_amount, 'method', v_method)
  );

  return v_request_id;
end;
$$;

create or replace function public.admin_approve_payment_request(
  p_payment_request_id uuid,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.payment_requests;
  v_balance numeric;
  v_new_balance numeric;
begin
  if not private.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_request
  from public.payment_requests
  where id = p_payment_request_id
  for update;

  if v_request.id is null then
    raise exception 'Payment request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Payment request already processed';
  end if;

  select balance_tnd into v_balance
  from public.profiles
  where id = v_request.user_id
  for update;

  v_new_balance := coalesce(v_balance, 0) + v_request.amount_tnd;

  update public.profiles
  set balance_tnd = v_new_balance
  where id = v_request.user_id;

  update public.payment_requests
  set status = 'approved',
      admin_note = p_admin_note,
      admin_id = auth.uid(),
      approved_at = now()
  where id = v_request.id;

  insert into public.wallet_transactions (
    user_id,
    amount_tnd,
    balance_before,
    balance_after,
    transaction_type,
    payment_request_id,
    description
  )
  values (
    v_request.user_id,
    v_request.amount_tnd,
    coalesce(v_balance, 0),
    v_new_balance,
    'top_up',
    v_request.id,
    'Top-up approved'
  );

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Top-up approved',
    'Your top-up of ' || v_request.amount_tnd || ' TND has been approved.'
  );

  perform private.log_payment_request_event(
    v_request.id,
    'approved',
    jsonb_build_object('amount_tnd', v_request.amount_tnd, 'admin_note', p_admin_note)
  );
end;
$$;

create or replace function public.admin_reject_payment_request(
  p_payment_request_id uuid,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.payment_requests;
begin
  if not private.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_request
  from public.payment_requests
  where id = p_payment_request_id
  for update;

  if v_request.id is null then
    raise exception 'Payment request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Payment request already processed';
  end if;

  update public.payment_requests
  set status = 'rejected',
      admin_note = p_admin_note,
      admin_id = auth.uid(),
      rejected_at = now()
  where id = v_request.id;

  insert into public.notifications (user_id, title, message)
  values (
    v_request.user_id,
    'Top-up rejected',
    'Your top-up request was rejected. Please review the admin note.'
  );

  perform private.log_payment_request_event(
    v_request.id,
    'rejected',
    jsonb_build_object('admin_note', p_admin_note)
  );
end;
$$;

grant execute on function public.top_up_balance(numeric, text) to authenticated;
grant execute on function public.withdraw_balance(numeric) to authenticated;
grant execute on function public.pay_request(text, text) to authenticated;
grant execute on function public.create_request_secure(text, text, text, public.account_access_type, text, text, numeric, text, public.preferred_contact_method) to authenticated;
grant execute on function public.create_payment_request(numeric, text, text, text, text) to authenticated;
grant execute on function public.admin_approve_payment_request(uuid, text) to authenticated;
grant execute on function public.admin_reject_payment_request(uuid, text) to authenticated;
grant execute on function public.admin_reveal_request_password(text) to authenticated;
grant execute on function public.admin_update_request_status(text, public.request_status, text) to authenticated;
grant execute on function public.admin_set_request_notes(text, text) to authenticated;
grant execute on function public.get_user_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.payments enable row level security;
alter table public.payment_requests enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payment_request_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.service_catalog enable row level security;
alter table public.request_events enable row level security;

create policy "profiles_select" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy "profiles_insert" on public.profiles
for insert to authenticated
with check (
  (select private.is_admin())
  or (
    (select auth.uid()) = id
    and role = 'user'
    and balance_tnd = 0
    and length(trim(email)) > 0
  )
);

create policy "profiles_update" on public.profiles
for update to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check (
  (select private.is_admin())
  or (
    (select auth.uid()) = id
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
    and balance_tnd = (select p.balance_tnd from public.profiles p where p.id = (select auth.uid()))
    and email = (select p.email from public.profiles p where p.id = (select auth.uid()))
    and created_at = (select p.created_at from public.profiles p where p.id = (select auth.uid()))
  )
);

create policy "requests_select" on public.requests
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "requests_insert" on public.requests
for insert to authenticated
with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "requests_update_admin" on public.requests
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "requests_delete_admin" on public.requests
for delete to authenticated
using ((select private.is_admin()));

create policy "payments_select" on public.payments
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "payments_insert" on public.payments
for insert to authenticated
with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "payments_update" on public.payments
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "payment_requests_select" on public.payment_requests
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "payment_requests_insert" on public.payment_requests
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "payment_requests_update_admin" on public.payment_requests
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "wallet_transactions_select" on public.wallet_transactions
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "payment_request_events_select" on public.payment_request_events
for select to authenticated
using (
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

create policy "subscriptions_select" on public.subscriptions
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "subscriptions_manage_admin" on public.subscriptions
for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "notifications_select" on public.notifications
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "notifications_insert" on public.notifications
for insert to authenticated
with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "notifications_update" on public.notifications
for update to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()))
with check (
  (select private.is_admin())
  or (
    user_id = (select auth.uid())
    and title = (select n.title from public.notifications n where n.id = notifications.id)
    and message = (select n.message from public.notifications n where n.id = notifications.id)
    and created_at = (select n.created_at from public.notifications n where n.id = notifications.id)
  )
);

create policy "service_catalog_select" on public.service_catalog
for select to authenticated
using (true);

create policy "request_events_select" on public.request_events
for select to authenticated
using (
  exists (
    select 1
    from public.requests r
    where r.id = request_events.request_id
      and (
        r.user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('topup-proofs', 'topup-proofs', false)
on conflict (id) do nothing;

create policy "payment_proofs_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy "payment_proofs_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy "payment_proofs_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
)
with check (
  bucket_id = 'payment-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy "payment_proofs_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy "topup_proofs_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy "topup_proofs_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'topup-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy "topup_proofs_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
)
with check (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy "topup_proofs_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'topup-proofs'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);
