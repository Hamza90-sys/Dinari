-- Dinari hardening patch for existing Supabase projects
-- Run this once in Supabase SQL Editor.

create schema if not exists private;

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

update public.profiles
set role = 'user'
where role = 'admin'
  and lower(email) <> 'bestyhamza9@gmail.com';

update public.profiles
set role = 'admin',
    full_name = coalesce(nullif(full_name, ''), 'HAMZA CHARGUI')
where lower(email) = 'bestyhamza9@gmail.com';

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

create or replace function public.set_request_amount()
returns trigger
language plpgsql
set search_path = ''
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

drop trigger if exists trg_set_request_amount on public.requests;
create trigger trg_set_request_amount
before insert on public.requests
for each row execute procedure public.set_request_amount();

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

grant execute on function public.admin_set_request_notes(text, text) to authenticated;

alter table public.service_catalog enable row level security;
alter table public.request_events enable row level security;

drop policy if exists "profiles_insert" on public.profiles;
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

drop policy if exists "profiles_update" on public.profiles;
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

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "notifications_update" on public.notifications;
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

drop policy if exists "service_catalog_select" on public.service_catalog;
create policy "service_catalog_select" on public.service_catalog
for select to authenticated
using (true);

drop policy if exists "request_events_select" on public.request_events;
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
