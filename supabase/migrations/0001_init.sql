-- Almirah — first migration (Postgres / Supabase).
-- Times: timestamptz in UTC, rendered in Asia/Kolkata. Access: row level security on every table.

create extension if not exists pg_trgm;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- reference data: locality cascade (read-only for users) ----------
create table states (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table districts (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references states(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_id, name)
);
create index on districts (state_id);

create table court_complexes (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references districts(id) on delete cascade,
  name text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, name)
);
create index on court_complexes (district_id);

create table court_establishments (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references court_complexes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (complex_id, name)
);
create index on court_establishments (complex_id);

-- ---------- users ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  bar_code text,
  home_state_id uuid references states(id) on delete set null,
  language text not null default 'en'
    check (language in ('en','hi','mr','ta','te','bn','gu','kn','ml','pa','or','as')),
  reminder_lead_days int not null default 1 check (reminder_lead_days between 0 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- cases (user-owned) ----------
create table cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cnr text not null check (cnr ~ '^[A-Z0-9]{16}$'),
  label text check (char_length(label) <= 120),
  case_type text,
  filing_number text,
  filing_date date,
  registration_number text,
  registration_date date,
  establishment_id uuid references court_establishments(id) on delete set null,
  court_no text,
  judge text,
  status text not null default 'pending' check (status in ('pending','disposed')),
  stage text,
  next_hearing_date date,
  nature_of_disposal text,
  source text not null default 'manual' check (source in ('manual','import','seed')),
  saved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cnr)               -- re-import must not duplicate
);
create index on cases (user_id, next_hearing_date);
create index on cases (user_id, status);
create index on cases (establishment_id);
create index cases_label_trgm on cases using gin (label gin_trgm_ops);

create table parties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  role text not null check (role in ('petitioner','respondent')),
  name text not null,
  advocate_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on parties (case_id);
create index parties_name_trgm on parties using gin (name gin_trgm_ops);
create index parties_adv_trgm on parties using gin (advocate_name gin_trgm_ops);

create table acts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  act_name text not null,
  section text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on acts (case_id);

create table firs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null unique references cases(id) on delete cascade,
  police_station text not null,
  fir_number text not null,
  fir_year int check (fir_year between 1950 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on firs (fir_number, fir_year);

create table case_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  judge text,
  business_on date,
  hearing_date date,
  purpose text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on case_history (case_id, hearing_date);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  order_number text,
  order_date date,
  storage_path text,                  -- bucket "orders": <user_id>/<case_id>/<uuid>.pdf
  size_bytes int check (size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on orders (case_id, order_date);

create table interim_apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  ia_number text not null,
  filed_by text,
  status text check (status in ('pending','disposed')),
  filed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on interim_apps (case_id);

create table case_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  old_ref text not null,
  new_ref text not null,
  transfer_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on case_transfers (case_id);

-- A child row must belong to a case owned by the same user.
create or replace function child_owner_matches() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from cases c where c.id = new.case_id and c.user_id = new.user_id) then
    raise exception 'case % does not belong to this user', new.case_id using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------- reminders, billing, jobs ----------
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'email' check (channel in ('email','push')),
  attempts int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, remind_at)         -- the daily sweep can run twice safely
);
create index on reminders (remind_at) where sent_at is null;

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free','pro')),
  status text not null default 'active'
    check (status in ('active','trialing','past_due','canceled','incomplete','unpaid')),
  price_paise int check (price_paise >= 0),
  currency text not null default 'INR',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stripe_events (            -- webhook idempotency: one row per processed event
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table job_failures (             -- dead-letter log for background jobs
  id uuid primary key default gen_random_uuid(),
  job text not null,
  payload jsonb not null default '{}',
  error text not null,
  created_at timestamptz not null default now()
);

-- ---------- triggers ----------
do $$
declare t text;
begin
  foreach t in array array['states','districts','court_complexes','court_establishments','profiles','cases',
                           'parties','acts','firs','case_history','orders','interim_apps','case_transfers',
                           'reminders','subscriptions']
  loop
    execute format('create trigger %I before update on %I for each row execute function set_updated_at()',
                   t || '_updated_at', t);
  end loop;
  foreach t in array array['parties','acts','firs','case_history','orders','interim_apps','case_transfers']
  loop
    execute format('create trigger %I before insert or update on %I for each row execute function child_owner_matches()',
                   t || '_owner_check', t);
  end loop;
end $$;

-- ---------- row level security ----------
do $$
declare t text;
begin
  foreach t in array array['cases','parties','acts','firs','case_history','orders','interim_apps','case_transfers']
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for all to authenticated
                     using (user_id = auth.uid()) with check (user_id = auth.uid())$p$, t || '_owner', t);
  end loop;
end $$;

-- Users read their own reminders and subscription; only the server (service role) writes them.
alter table reminders enable row level security;
create policy reminders_read on reminders for select to authenticated using (user_id = auth.uid());
alter table subscriptions enable row level security;
create policy subscriptions_read on subscriptions for select to authenticated using (user_id = auth.uid());

-- Server-only tables: RLS on, no policies.
alter table stripe_events enable row level security;
alter table job_failures enable row level security;

alter table profiles enable row level security;
create policy profiles_owner on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['states','districts','court_complexes','court_establishments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- ---------- upsert a whole case atomically (add case, restore backup) ----------
-- Runs as the caller, so RLS and the owner checks apply. Matches on (user_id, cnr).
create or replace function upsert_case_tree(payload jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  cid uuid;
  item jsonb;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  insert into cases (user_id, cnr, label, case_type, filing_number, filing_date, registration_number,
                     registration_date, establishment_id, court_no, judge, status, stage, next_hearing_date,
                     nature_of_disposal, source, saved)
  values (auth.uid(), upper(payload->>'cnr'), payload->>'label', payload->>'caseType', payload->>'filingNumber',
          (payload->>'filingDate')::date, payload->>'registrationNumber', (payload->>'registrationDate')::date,
          (payload->>'establishmentId')::uuid, payload->>'courtNo', payload->>'judge',
          coalesce(payload->>'status', 'pending'), payload->>'stage', (payload->>'nextHearingDate')::date,
          payload->>'natureOfDisposal', coalesce(payload->>'source', 'manual'), true)
  on conflict (user_id, cnr) do update set
    label = excluded.label, case_type = excluded.case_type, filing_number = excluded.filing_number,
    filing_date = excluded.filing_date, registration_number = excluded.registration_number,
    registration_date = excluded.registration_date, establishment_id = excluded.establishment_id,
    court_no = excluded.court_no, judge = excluded.judge, status = excluded.status, stage = excluded.stage,
    next_hearing_date = excluded.next_hearing_date, nature_of_disposal = excluded.nature_of_disposal,
    saved = true
  returning id into cid;

  -- Children are replaced wholesale only when the payload carries them, so a partial payload can't wipe data.
  if payload ? 'parties' then
    delete from parties where case_id = cid;
    for item in select * from jsonb_array_elements(payload->'parties') loop
      insert into parties (user_id, case_id, role, name, advocate_name)
      values (auth.uid(), cid, item->>'role', item->>'name', item->>'advocateName');
    end loop;
  end if;
  if payload ? 'acts' then
    delete from acts where case_id = cid;
    for item in select * from jsonb_array_elements(payload->'acts') loop
      insert into acts (user_id, case_id, act_name, section) values (auth.uid(), cid, item->>'actName', item->>'section');
    end loop;
  end if;
  if payload ? 'fir' then
    delete from firs where case_id = cid;
    if jsonb_typeof(payload->'fir') = 'object' then
      insert into firs (user_id, case_id, police_station, fir_number, fir_year)
      values (auth.uid(), cid, payload->'fir'->>'policeStation', payload->'fir'->>'firNumber', (payload->'fir'->>'firYear')::int);
    end if;
  end if;
  if payload ? 'history' then
    delete from case_history where case_id = cid;
    for item in select * from jsonb_array_elements(payload->'history') loop
      insert into case_history (user_id, case_id, judge, business_on, hearing_date, purpose)
      values (auth.uid(), cid, item->>'judge', (item->>'businessOn')::date, (item->>'hearingDate')::date, item->>'purpose');
    end loop;
  end if;
  if payload ? 'interimApps' then
    delete from interim_apps where case_id = cid;
    for item in select * from jsonb_array_elements(payload->'interimApps') loop
      insert into interim_apps (user_id, case_id, ia_number, filed_by, status, filed_on)
      values (auth.uid(), cid, item->>'iaNumber', item->>'filedBy', item->>'status', (item->>'filedOn')::date);
    end loop;
  end if;
  if payload ? 'transfers' then
    delete from case_transfers where case_id = cid;
    for item in select * from jsonb_array_elements(payload->'transfers') loop
      insert into case_transfers (user_id, case_id, old_ref, new_ref, transfer_date)
      values (auth.uid(), cid, item->>'oldRef', item->>'newRef', (item->>'transferDate')::date);
    end loop;
  end if;
  -- Orders keep their files in storage; a restore only adds order entries that aren't there yet.
  if payload ? 'orders' then
    for item in select * from jsonb_array_elements(payload->'orders') loop
      insert into orders (user_id, case_id, order_number, order_date)
      select auth.uid(), cid, item->>'orderNumber', (item->>'orderDate')::date
      where not exists (
        select 1 from orders o where o.case_id = cid
          and o.order_number is not distinct from item->>'orderNumber'
          and o.order_date is not distinct from (item->>'orderDate')::date);
    end loop;
  end if;

  return cid;
end $$;

-- ---------- reminders due today (service role only) ----------
create or replace function due_reminders(on_day date)
returns table (user_id uuid, email text, case_id uuid, cnr text, label text, case_type text,
               registration_number text, next_hearing_date date)
language sql security definer set search_path = public as $$
  select c.user_id, u.email::text, c.id, c.cnr, c.label, c.case_type, c.registration_number, c.next_hearing_date
  from cases c
  join profiles p on p.id = c.user_id
  join auth.users u on u.id = c.user_id
  where c.saved and c.status = 'pending'
    and c.next_hearing_date = on_day + p.reminder_lead_days
    and u.email is not null
$$;
revoke all on function due_reminders(date) from public, anon, authenticated;

-- ---------- order files: private bucket, one folder per user ----------
insert into storage.buckets (id, name, public) values ('orders', 'orders', false) on conflict do nothing;

create policy orders_files_read on storage.objects for select to authenticated
  using (bucket_id = 'orders' and (storage.foldername(name))[1] = auth.uid()::text);
create policy orders_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'orders' and (storage.foldername(name))[1] = auth.uid()::text);
create policy orders_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'orders' and (storage.foldername(name))[1] = auth.uid()::text);
