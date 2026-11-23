-- Brown Derby no-API Sage Intacct Sales Order import safety migration.
-- Run before deploying the updated administrator export route.
-- This does not alter submitted orders or write anything into Sage Intacct.
begin;

alter table public.intacct_order_exports
  add column if not exists csv_content text,
  add column if not exists ship_date date,
  add column if not exists legacy_reviewed_at timestamptz,
  add column if not exists legacy_reviewed_by uuid references auth.users(id);

-- The existing admin-only RLS policy on intacct_order_exports protects csv_content.
-- Retain the original CSV verbatim for recovery if a browser download fails.
create or replace function private.admin_reserve_intacct_export_v2(
  target_order_id uuid,
  requested_ship_date date,
  csv_data text,
  legacy_reviewed boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare
  matching_customer text;
  customer_terms text;
  target_status text;
  submitted_time timestamptz;
  legacy_order boolean;
  external_ref text;
begin
  if not private.is_portal_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if requested_ship_date is null or requested_ship_date < current_date - 365
     or requested_ship_date > current_date + 365 then
    raise exception 'Choose a valid due/ship date (within one year of today)';
  end if;
  if csv_data is null or octet_length(csv_data) < 150
     or octet_length(csv_data) > 500000
     or position('DONOTIMPORT,TRANSACTIONTYPE,DATE,' in csv_data) = 0 then
    raise exception 'Generated Intacct CSV is not valid';
  end if;
  select o.status, o.submitted_at, ca.intacct_customer_id, c.term_name
  into target_status, submitted_time, matching_customer, customer_terms
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
  legacy_order := submitted_time < timestamptz '2026-11-23 03:30:00+00';
  if legacy_order and not legacy_reviewed then
    raise exception 'Older orders require explicit Sage duplicate review before CSV export';
  end if;
  external_ref := 'WEB-' || replace(target_order_id::text, '-', '');
  if position(external_ref in csv_data) = 0 then
    raise exception 'CSV does not contain matching website order reference';
  end if;
  -- Unique order_id and reference_no prevent concurrent double-reservation.
  insert into public.intacct_order_exports(
    order_id, customer_id, reference_no, exported_by,
    csv_content, ship_date, legacy_reviewed_at, legacy_reviewed_by
  ) values (
    target_order_id, matching_customer, external_ref, auth.uid(),
    csv_data, requested_ship_date,
    case when legacy_order then now() else null end,
    case when legacy_order then auth.uid() else null end
  );
end;
$$;
revoke all on function private.admin_reserve_intacct_export_v2(uuid,date,text,boolean) from public, anon, authenticated;
grant execute on function private.admin_reserve_intacct_export_v2(uuid,date,text,boolean) to authenticated;

create or replace function public.admin_reserve_intacct_export_v2(
  target_order_id uuid,
  requested_ship_date date,
  csv_data text,
  legacy_reviewed boolean default false
) returns void language sql security invoker set search_path = '' as $$
  select private.admin_reserve_intacct_export_v2(target_order_id, requested_ship_date, csv_data, legacy_reviewed);
$$;
revoke all on function public.admin_reserve_intacct_export_v2(uuid,date,text,boolean) from public, anon;
grant execute on function public.admin_reserve_intacct_export_v2(uuid,date,text,boolean) to authenticated;

commit;
