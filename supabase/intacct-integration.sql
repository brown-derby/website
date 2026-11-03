-- Additive, admin-only foundation for Sage Intacct CSV integration.
-- Never put the private Intacct customer export in the public GitHub repository.
begin;

create table if not exists public.intacct_customers (
  customer_id text primary key check (char_length(customer_id) between 1 and 21),
  customer_name text not null,
  term_name text,
  email text,
  secondary_email text,
  city text,
  province text,
  postal_code text,
  updated_at timestamptz not null default now()
);

alter table public.intacct_customers enable row level security;
revoke all on public.intacct_customers from public, anon, authenticated;
grant select on public.intacct_customers to authenticated;
drop policy if exists intacct_customers_admin_read on public.intacct_customers;
create policy intacct_customers_admin_read on public.intacct_customers
  for select to authenticated using ((select private.is_portal_admin()));

alter table public.customer_accounts
  add column if not exists intacct_customer_id text references public.intacct_customers(customer_id),
  add column if not exists intacct_matched_at timestamptz,
  add column if not exists intacct_matched_by uuid references auth.users(id);

create table if not exists private.intacct_customer_match_audit (
  id bigint generated always as identity primary key,
  website_user_id uuid not null references auth.users(id) on delete cascade,
  old_customer_id text,
  new_customer_id text,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now()
);
revoke all on private.intacct_customer_match_audit from public, anon, authenticated;

create table if not exists public.intacct_order_exports (
  order_id uuid primary key references public.orders(id) on delete cascade,
  customer_id text not null references public.intacct_customers(customer_id),
  reference_no text not null unique,
  exported_at timestamptz not null default now(),
  exported_by uuid not null references auth.users(id),
  imported_at timestamptz,
  imported_by uuid references auth.users(id),
  intacct_document_no text
);
alter table public.intacct_order_exports enable row level security;
revoke all on public.intacct_order_exports from public, anon, authenticated;
grant select on public.intacct_order_exports to authenticated;
drop policy if exists intacct_exports_admin_read on public.intacct_order_exports;
create policy intacct_exports_admin_read on public.intacct_order_exports
  for select to authenticated using ((select private.is_portal_admin()));

create or replace function private.admin_upsert_intacct_customers(rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r record;
  imported integer := 0;
begin
  if not private.is_portal_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) < 1 or jsonb_array_length(rows) > 1000 then
    raise exception 'Import must contain between 1 and 1000 customers';
  end if;
  for r in select * from jsonb_to_recordset(rows) as x(
    customer_id text, customer_name text, term_name text, email text,
    secondary_email text, city text, province text, postal_code text
  ) loop
    if nullif(btrim(r.customer_id), '') is null
       or char_length(r.customer_id) > 21
       or nullif(btrim(r.customer_name), '') is null then
      raise exception 'Every imported customer must have a valid ID and name';
    end if;
    insert into public.intacct_customers (
      customer_id, customer_name, term_name, email, secondary_email, city, province, postal_code
    ) values (
      btrim(r.customer_id), left(btrim(r.customer_name), 255),
      nullif(btrim(r.term_name), ''), nullif(btrim(r.email), ''),
      nullif(btrim(r.secondary_email), ''), nullif(btrim(r.city), ''),
      nullif(btrim(r.province), ''), nullif(btrim(r.postal_code), '')
    )
    on conflict (customer_id) do update set
      customer_name = excluded.customer_name,
      term_name = excluded.term_name,
      email = excluded.email,
      secondary_email = excluded.secondary_email,
      city = excluded.city,
      province = excluded.province,
      postal_code = excluded.postal_code,
      updated_at = now();
    imported := imported + 1;
  end loop;
  return imported;
end;
$$;
revoke all on function private.admin_upsert_intacct_customers(jsonb) from public, anon;
grant execute on function private.admin_upsert_intacct_customers(jsonb) to authenticated;
create or replace function public.admin_upsert_intacct_customers(rows jsonb)
returns integer language sql security invoker set search_path = '' as $$
  select private.admin_upsert_intacct_customers(rows);
$$;
revoke all on function public.admin_upsert_intacct_customers(jsonb) from public, anon;
grant execute on function public.admin_upsert_intacct_customers(jsonb) to authenticated;

create or replace function private.admin_set_intacct_customer(account_id uuid, customer_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare previous text;
begin
  if not private.is_portal_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if customer_id is not null and not exists (
    select 1 from public.intacct_customers c where c.customer_id = customer_id
  ) then
    raise exception 'Customer ID not found in Intacct import';
  end if;
  select ca.intacct_customer_id into previous
  from public.customer_accounts ca
  where ca.user_id = account_id and ca.status = 'approved'
  for update;
  if not found then
    raise exception 'Approved website account not found';
  end if;
  update public.customer_accounts set
    intacct_customer_id = customer_id,
    intacct_matched_at = case when customer_id is null then null else now() end,
    intacct_matched_by = case when customer_id is null then null else auth.uid() end
  where user_id = account_id;
  if previous is distinct from customer_id then
    insert into private.intacct_customer_match_audit(
      website_user_id, old_customer_id, new_customer_id, changed_by
    ) values (account_id, previous, customer_id, auth.uid());
  end if;
end;
$$;
revoke all on function private.admin_set_intacct_customer(uuid,text) from public, anon;
grant execute on function private.admin_set_intacct_customer(uuid,text) to authenticated;
create or replace function public.admin_set_intacct_customer(account_id uuid, customer_id text)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_set_intacct_customer(account_id, customer_id);
$$;
revoke all on function public.admin_set_intacct_customer(uuid,text) from public, anon;
grant execute on function public.admin_set_intacct_customer(uuid,text) to authenticated;

create or replace function private.admin_reserve_intacct_export(target_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  matching_customer text;
  customer_terms text;
  target_status text;
begin
  if not private.is_portal_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select o.status, ca.intacct_customer_id, c.term_name
    into target_status, matching_customer, customer_terms
  from public.orders o
  join public.customer_accounts ca on ca.user_id = o.user_id and ca.status = 'approved'
  join public.intacct_customers c on c.customer_id = ca.intacct_customer_id
  where o.id = target_order_id for update of o;
  if not found or target_status <> 'submitted' then
    raise exception 'Submitted order with approved, matched customer not found';
  end if;
  if coalesce(customer_terms, '') !~ '^NET[0-9]{1,3}$' then
    raise exception 'Customer payment terms need manual review';
  end if;
  if not exists (select 1 from public.order_items oi where oi.order_id = target_order_id) then
    raise exception 'Order has no items';
  end if;
  insert into public.intacct_order_exports(
    order_id, customer_id, reference_no, exported_by
  ) values (
    target_order_id, matching_customer,
    'WEB-' || replace(target_order_id::text, '-', ''), auth.uid()
  );
end;
$$;
revoke all on function private.admin_reserve_intacct_export(uuid) from public, anon;
grant execute on function private.admin_reserve_intacct_export(uuid) to authenticated;
create or replace function public.admin_reserve_intacct_export(target_order_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_reserve_intacct_export(target_order_id);
$$;
revoke all on function public.admin_reserve_intacct_export(uuid) from public, anon;
grant execute on function public.admin_reserve_intacct_export(uuid) to authenticated;

create or replace function private.admin_confirm_intacct_import(target_order_id uuid, document_no text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_portal_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if nullif(btrim(document_no), '') is null or char_length(document_no) > 45 then
    raise exception 'Enter the actual Intacct Sales Order number';
  end if;
  update public.intacct_order_exports set
    imported_at = now(), imported_by = auth.uid(), intacct_document_no = btrim(document_no)
  where order_id = target_order_id and imported_at is null;
  if not found then
    raise exception 'Export not found or already confirmed';
  end if;
end;
$$;
revoke all on function private.admin_confirm_intacct_import(uuid,text) from public, anon;
grant execute on function private.admin_confirm_intacct_import(uuid,text) to authenticated;
create or replace function public.admin_confirm_intacct_import(target_order_id uuid, document_no text)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_confirm_intacct_import(target_order_id, document_no);
$$;
revoke all on function public.admin_confirm_intacct_import(uuid,text) from public, anon;
grant execute on function public.admin_confirm_intacct_import(uuid,text) to authenticated;

commit;
