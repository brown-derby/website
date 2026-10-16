-- Apply once after schema.sql. Existing customers also require explicit approval.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.customer_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  business_name text not null default '',
  contact_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.customer_accounts enable row level security;
create table private.portal_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.portal_admins from public, anon, authenticated;

create function private.is_portal_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from private.portal_admins a join auth.users u on u.id=a.user_id
    where a.user_id=auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function private.is_portal_admin() from public, anon;
grant execute on function private.is_portal_admin() to authenticated;

create function private.has_pricing_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.customer_accounts a join auth.users u on u.id=a.user_id
    where a.user_id=auth.uid() and a.status='approved' and u.email_confirmed_at is not null
  );
$$;
revoke all on function private.has_pricing_access() from public, anon;
grant execute on function private.has_pricing_access() to authenticated;

create policy customer_accounts_read on public.customer_accounts for select to authenticated
using (user_id=(select auth.uid()) or (select private.is_portal_admin()));
revoke all on public.customer_accounts from public, anon, authenticated;
grant select on public.customer_accounts to authenticated;

create function private.create_customer_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.customer_accounts(user_id,email,business_name,contact_name)
  values(new.id,coalesce(new.email,''),left(coalesce(new.raw_user_meta_data->>'business_name',''),160),
    left(coalesce(new.raw_user_meta_data->>'contact_name',''),160));
  return new;
end;
$$;
revoke all on function private.create_customer_account() from public, anon, authenticated;
create trigger create_customer_account after insert on auth.users
for each row execute function private.create_customer_account();
insert into public.customer_accounts(user_id,email,business_name,contact_name,created_at)
select id,coalesce(email,''),left(coalesce(raw_user_meta_data->>'business_name',''),160),
  left(coalesce(raw_user_meta_data->>'contact_name',''),160),created_at from auth.users;

create function private.portal_access() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  return jsonb_build_object('status',coalesce((select status from public.customer_accounts where user_id=auth.uid()),'pending'),
    'isAdmin',private.is_portal_admin());
end;
$$;
revoke all on function private.portal_access() from public, anon;
grant execute on function private.portal_access() to authenticated;
create function public.portal_access() returns jsonb
language sql stable security invoker set search_path = '' as $$ select private.portal_access(); $$;
revoke all on function public.portal_access() from public, anon;
grant execute on function public.portal_access() to authenticated;

create table private.account_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now()
);
revoke all on private.account_reviews from public, anon, authenticated;
create function private.review_customer_account(account_id uuid, decision text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_portal_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if decision not in ('approved','declined','pending') then raise exception 'Invalid decision'; end if;
  if exists(select 1 from private.portal_admins where user_id=account_id) then
    raise exception 'Administrator accounts cannot be reviewed';
  end if;
  update public.customer_accounts set status=decision,reviewed_at=now(),reviewed_by=auth.uid() where user_id=account_id;
  if not found then raise exception 'Account not found'; end if;
  insert into private.account_reviews(user_id,status,reviewed_by) values(account_id,decision,auth.uid());
end;
$$;
revoke all on function private.review_customer_account(uuid,text) from public, anon;
grant execute on function private.review_customer_account(uuid,text) to authenticated;
create function public.review_customer_account(account_id uuid, decision text) returns void
language sql security invoker set search_path = '' as $$ select private.review_customer_account(account_id,decision); $$;
revoke all on function public.review_customer_account(uuid,text) from public, anon;
grant execute on function public.review_customer_account(uuid,text) to authenticated;

-- Restrictive policies intersect with existing ownership policies, including
-- direct REST access to historical order prices and writes to order items.
create policy approved_customers_only on public.orders as restrictive for all to authenticated
using ((select private.has_pricing_access())) with check ((select private.has_pricing_access()));
create policy approved_customers_only on public.order_items as restrictive for all to authenticated
using ((select private.has_pricing_access())) with check ((select private.has_pricing_access()));
commit;
