-- Free plan limits: 20 saved cases and 10 order files. The Advocate plan (paid) has none.
-- Enforced here so no client can get around them. Nothing is ever deleted when a plan lapses:
-- existing cases stay readable and editable; only adding past the limit is refused.

create or replace function has_paid_plan(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid and s.plan = 'pro' and s.status in ('active', 'trialing', 'past_due')
  )
$$;
revoke all on function has_paid_plan(uuid) from public, anon, authenticated;

create or replace function enforce_case_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.saved then return new; end if;
  if tg_op = 'UPDATE' and old.saved then return new; end if;  -- already counted
  -- "insert … on conflict do update" fires this insert trigger first: a restore of a case
  -- the user already has is about to become an update, so it isn't a new case.
  if tg_op = 'INSERT' and exists (select 1 from cases c where c.user_id = new.user_id and c.cnr = new.cnr) then
    return new;
  end if;
  if has_paid_plan(new.user_id) then return new; end if;
  if (select count(*) from cases c where c.user_id = new.user_id and c.saved and c.id <> new.id) >= 20 then
    raise exception 'free_plan_case_limit: the free plan holds 20 saved cases' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger cases_plan_limit before insert or update of saved on cases
  for each row execute function enforce_case_limit();

create or replace function enforce_order_file_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.storage_path is null then return new; end if;            -- entries without a file are free
  if tg_op = 'UPDATE' and old.storage_path is not null then return new; end if;
  if has_paid_plan(new.user_id) then return new; end if;
  if (select count(*) from orders o where o.user_id = new.user_id and o.storage_path is not null) >= 10 then
    raise exception 'free_plan_order_limit: the free plan holds 10 order files' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger orders_plan_limit before insert or update of storage_path on orders
  for each row execute function enforce_order_file_limit();

-- What the app shows on Account and in upgrade prompts. Only ever about the caller.
create or replace function plan_usage()
returns table (plan text, cases int, case_limit int, order_files int, order_file_limit int)
language sql stable security definer set search_path = public as $$
  select
    case when has_paid_plan(auth.uid()) then 'pro' else 'free' end,
    (select count(*)::int from cases c where c.user_id = auth.uid() and c.saved),
    case when has_paid_plan(auth.uid()) then null else 20 end,
    (select count(*)::int from orders o where o.user_id = auth.uid() and o.storage_path is not null),
    case when has_paid_plan(auth.uid()) then null else 10 end
  where auth.uid() is not null
$$;
revoke all on function plan_usage() from public, anon;
grant execute on function plan_usage() to authenticated;
