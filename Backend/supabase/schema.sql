-- Dinari Supabase schema + RLS + helper functions

create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'admin');
create type public.request_status as enum ('Awaiting Payment', 'Paid', 'Processing', 'Completed', 'Failed');
create type public.payment_status as enum ('Completed', 'Failed', 'Pending');
create type public.subscription_status as enum ('Active', 'Cancelled');

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  update public.profiles
  set balance_tnd = balance_tnd + p_amount
  where id = auth.uid();

  insert into public.payments (user_id, amount_tnd, payment_method, status)
  values (auth.uid(), p_amount, p_method, 'Completed')
  returning id into v_payment_id;

  insert into public.notifications (user_id, title, message)
  values (auth.uid(), 'Balance updated', 'Top-up of ' || p_amount || ' TND completed');

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
begin
  select * into v_request
  from public.requests
  where request_code = p_request_code
    and user_id = auth.uid()
  limit 1;

  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  select balance_tnd into v_balance
  from public.profiles
  where id = auth.uid();

  if coalesce(v_balance, 0) < v_request.amount_tnd then
    raise exception 'Insufficient balance';
  end if;

  update public.profiles
  set balance_tnd = balance_tnd - v_request.amount_tnd
  where id = auth.uid();

  update public.requests
  set status = 'Paid', payment_method = p_method, payment_date = now(), updated_at = now()
  where id = v_request.id;

  insert into public.payments (request_id, user_id, amount_tnd, payment_method, status)
  values (v_request.id, auth.uid(), v_request.amount_tnd, p_method, 'Completed')
  returning id into v_payment_id;

  insert into public.notifications (user_id, title, message)
  values (auth.uid(), 'Payment received', 'Payment received for request ' || v_request.request_code);

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
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  select balance_tnd into v_balance from public.profiles where id = auth.uid();
  if coalesce(v_balance, 0) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.profiles
  set balance_tnd = balance_tnd - p_amount
  where id = auth.uid();

  insert into public.payments (user_id, amount_tnd, payment_method, status)
  values (auth.uid(), p_amount, 'Withdrawal', 'Completed')
  returning id into v_payment_id;

  insert into public.notifications (user_id, title, message)
  values (auth.uid(), 'Withdrawal completed', 'Withdrawal of ' || p_amount || ' TND completed');

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
begin
  if not private.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_request from public.requests where request_code = p_request_code limit 1;

  if v_request.id is null then
    raise exception 'Request not found';
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
end;
$$;

grant execute on function public.top_up_balance(numeric, text) to authenticated;
grant execute on function public.withdraw_balance(numeric) to authenticated;
grant execute on function public.pay_request(text, text) to authenticated;
grant execute on function public.admin_update_request_status(text, public.request_status, text) to authenticated;
grant execute on function public.get_user_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy "profiles_insert" on public.profiles
for insert to authenticated
with check ((select auth.uid()) = id or (select private.is_admin()));

create policy "profiles_update" on public.profiles
for update to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check ((select auth.uid()) = id or (select private.is_admin()));

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
using (user_id = (select auth.uid()) or (select private.is_admin()))
with check (user_id = (select auth.uid()) or (select private.is_admin()));

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
with check (user_id = (select auth.uid()) or (select private.is_admin()));

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
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
