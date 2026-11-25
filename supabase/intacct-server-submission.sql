-- Atomic website submission and frozen, manual-import CSV. No Sage API or Windows agent.
begin;
-- The previous broad permissive pricing policy allowed approved customers to read/write
-- other customers' order rows. Retain ownership policies and allow administrator reads.
drop policy if exists approved_customers_only on public.orders;
drop policy if exists approved_customers_only on public.order_items;
create policy orders_approved_guard on public.orders as restrictive for all to authenticated
  using ((select private.has_pricing_access()) or (select private.is_portal_admin()))
  with check ((select private.has_pricing_access()) or (select private.is_portal_admin()));
create policy items_approved_guard on public.order_items as restrictive for all to authenticated
  using ((select private.has_pricing_access()) or (select private.is_portal_admin()))
  with check ((select private.has_pricing_access()) or (select private.is_portal_admin()));
create policy orders_admin_read on public.orders for select to authenticated
  using ((select private.is_portal_admin()));
create policy items_admin_read on public.order_items for select to authenticated
  using ((select private.is_portal_admin()));

-- Serialize item mutations with submission so the emailed snapshot cannot be edited.
create or replace function private.lock_draft_item_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parent_id uuid; parent_status text;
begin
  if current_user = 'postgres' and auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'UPDATE' and new.order_id <> old.order_id then
    raise exception 'Order item cannot be moved';
  end if;
  parent_id := case when tg_op = 'DELETE' then old.order_id else new.order_id end;
  select status into parent_status from public.orders where id=parent_id for update;
  if parent_status is distinct from 'draft' then
    raise exception 'Only draft order items can be edited';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
revoke all on function private.lock_draft_item_parent() from public, anon, authenticated;
drop trigger if exists lock_draft_item_parent on public.order_items;
create trigger lock_draft_item_parent before insert or update or delete on public.order_items
for each row execute function private.lock_draft_item_parent();

create or replace function private.intacct_csv_cell(raw text) returns text
language sql immutable set search_path = '' as $$
  select '"' || replace(case when coalesce(raw,'') ~ '^[=+@' || chr(9) || chr(13) || ']' then chr(39) || raw else coalesce(raw,'') end,'"','""') || '"'
$$;
revoke all on function private.intacct_csv_cell(text) from public, anon, authenticated;

-- Generate from stored items, not from caller-supplied CSV or customer/terms fields.
create or replace function private.submit_website_order(target_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype; matched public.intacct_customers%rowtype;
  prices jsonb; csv text; ref text; ship date; stamp timestamptz; warning text;
  item_data jsonb; existing public.intacct_order_exports%rowtype;
begin
  if auth.uid() is null or not private.has_pricing_access() then
    raise exception 'Approved customer access required' using errcode='42501';
  end if;
  select * into o from public.orders where id=target_order_id and user_id=auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode='42501'; end if;
  if o.status <> 'draft' then
    raise exception 'Order already submitted';
  end if;
  prices := private.catalog_prices_for_customer();
  if not exists(select 1 from public.order_items where order_id=o.id) then
    raise exception 'Order has no items';
  end if;
  if exists(select 1 from public.order_items i where i.order_id=o.id
    and (not (prices ? i.product_id) or coalesce((prices->>i.product_id)::numeric,0)<=0)) then
    raise exception 'One or more items no longer have an available price';
  end if;
  update public.order_items i set unit_price=(prices->>i.product_id)::numeric
    where i.order_id=o.id;
  stamp := clock_timestamp();
  ship := (stamp at time zone 'America/St_Johns')::date;
  ref := 'WEB-' || replace(o.id::text,'-','');
  select c.* into matched from public.customer_accounts a
    join public.intacct_customers c on c.customer_id=a.intacct_customer_id
    where a.user_id=o.user_id and a.status='approved';
  if not found then
    warning := 'No confirmed Sage customer match. Match the account in the admin portal and download the CSV before importing.';
  elsif coalesce(matched.term_name,'') !~* '^NET[0-9]{1,3}$'
    or case when coalesce(matched.term_name,'') ~* '^NET[0-9]{1,3}$' then substring(matched.term_name from 4)::int > 365 else true end then
    warning := 'Sage payment terms need review. Correct the customer mapping or terms and download the CSV from the admin portal.';
  else
    select chr(65279) || 'DONOTIMPORT,TRANSACTIONTYPE,DATE,GLPOSTINGDATE,DOCUMENTNO,CUSTOMER_ID,TERMNAME,DATEDUE,REFERENCENO,MESSAGE,SHIPPINGMETHOD,BILLTO,SHIPTO,CURRENCY,BASECURR,EXCHRATEDATE,EXCHRATETYPE,EXCHRATE,STATE,NEEDBYDATE,SHIPBYDATE,CANCELAFTERDATE,DONOTSHIPBEFOREDATE,DONOTSHIPAFTERDATE,SERVICEDELIVERYDATE,TRACKINGNUMBER,SHIPPEDDATE,CUSTOMERPONUMBER,LINE,ITEMID,ITEMDESC,ITEMALIASID,WAREHOUSEID,QUANTITY,UNIT,LINELEVELSIMPLETAXTYPE,PRICE,TAXABLE,DISCOUNT_MEMO,REVREC_TEMPLATE,REVREC_STARTDATE,REVREC_ENDDATE,BILLING_TEMPLATE,RENEWAL_MACRO,DEPARTMENTID,LOCATIONID,SODOCUMENTENTRY_CLASSID,SODOCUMENTENTRY_PROJECTID,SODOCUMENTENTRY_CUSTOMERID,SODOCUMENTENTRY_EMPLOYEEID,SODOCUMENTENTRY_VENDORID,SUB_LINE_NO,SUBDESC,ABSVAL,PERCENTVAL,SUBLOCATIONID,SUBDEPARTMENTID,SODOCUMENTSUBTOTALS_CLASSID,SODOCUMENTSUBTOTALS_PROJECTID,SODOCUMENTSUBTOTALS_CUSTOMERID,SODOCUMENTSUBTOTALS_EMPLOYEEID,SODOCUMENTSUBTOTALS_VENDORID,MEMO,SODOCUMENTENTRY_TASKID,SODOCUMENTENTRY_GLDIMRELEASE,SODOCUMENTENTRY_GLDIMATTENDEE,SODOCUMENTENTRY_NEEDBYDATE,SODOCUMENTENTRY_SHIPBY,SODOCUMENTENTRY_DONOTSHIPBEFOREDATE,SODOCUMENTENTRY_DONOTSHIPAFTERDATE,SODOCUMENTENTRY_DATEPICKTICKETPRINTED,SODOCUMENTENTRY_CANCELAFTERDATE,SODOCUMENTENTRY_SHIPPEDDATE,COMPONENTID,TRACK_QUANTITY,SERIALNO,AISLEID,ROWID,BINID,LOTNO,EXPIRATION,DROPSHIP,SODOCUMENTENTRY_BUYTOORDERSHIPTO,BUYTOORDER,ENABLEEP,RETAINAGEPERCENTAGE,PROJECTID,CHANGELOGNUMBER,ORIGDOCDATE,CONVERSIONTYPE,TAXSCHEDULEID,SODOCUMENTENTRY_TASKKEY,SODOCUMENTENTRY_RETAINAGEPERCENTAGE,SODOCUMENTENTRY_TRX_AMOUNTRETAINED,SODOCUMENTENTRY_AMOUNTRETAINED,SODOCUMENTENTRY_SHIPTO,SCOPE,INCLUSIONS,EXCLUSIONS,TERMS,SCHEDULESTARTDATE,ACTUALSTARTDATE,SCHEDULEDCOMPLETIONDATE,REVISEDCOMPLETIONDATE,SUBSTANTIALCOMPLETIONDATE,ACTUALCOMPLETIONDATE,NOTICETOPROCEEDDATE,RESPONSEDUEDATE,EXECUTEDONDATE,SCHEDULEIMPACT,INTERNALREFNO,INTERNALINITIATEDBY,INTERNALVERBALBY,INTERNALISSUEDBY,INTERNALISSUEDONDATE,INTERNALAPPROVEDBY,INTERNALAPPROVEDONDATE,INTERNALSIGNEDBY,INTERNALSIGNEDONDATE,INTERNALSOURCE,INTERNALSOURCEREFNO,EXTERNALREFNO,EXTERNALVERBALBY,EXTERNALAPPROVEDBY,EXTERNALAPPROVEDONDATE,EXTERNALSIGNEDBY,EXTERNALSIGNEDONDATE,PERFORMANCEBONDREQUIRED,PERFORMANCEBONDRECEIVED,PERFORMANCEBONDAMOUNT,PERFORMANCESURETYCOMPANY,PAYMENTBONDREQUIRED,PAYMENTBONDRECEIVED,PAYMENTBONDAMOUNT,PAYMENTSURETYCOMPANY,INVOICE_TYPE,INVOICE_MODE,TAXSOLUTIONID,SODOCUMENTSUBTOTALS_ITEMID' || chr(13)||chr(10)
      || string_agg((select string_agg(private.intacct_csv_cell(v),',' order by ord)
        from unnest(array[
        '',
        case when i.line=1 then 'Sales Order' else '' end,
        case when i.line=1 then to_char(ship,'FMMM/FMDD/YYYY') else '' end,
        '',
        '',
        case when i.line=1 then matched.customer_id else '' end,
        case when i.line=1 then matched.term_name else '' end,
        case when i.line=1 then to_char(ship,'FMMM/FMDD/YYYY') else '' end,
        case when i.line=1 then ref else '' end,
        case when i.line=1 then left(btrim(o.notes),1000) else '' end,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        case when i.line=1 then 'Draft' else '' end,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        i.line::text,
        i.product_id,
        '',
        '',
        'WH001',
        i.quantity::text,
        'Each',
        '',
        to_char(i.unit_price,'FM999999999999990.00'),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        left(btrim(i.item_notes),4000),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
        ]) with ordinality as col(v,ord)),chr(13)||chr(10) order by i.line)
      || chr(13)||chr(10)
    into csv from (select oi.*,row_number() over(order by oi.id) as line
      from public.order_items oi where oi.order_id=o.id) i;
    if csv is null or octet_length(csv)>500000 then
      csv := null;
      warning := 'CSV exceeds the supported export size. Review this order in the admin portal.';
    end if;
  end if;
  update public.orders set status='submitted',submitted_at=stamp,email_status='not_sent'
    where id=o.id returning * into o;
  if csv is not null then
    insert into public.intacct_order_exports(order_id,customer_id,reference_no,exported_by,csv_content,ship_date,csv_email_status,csv_email_updated_at)
      values(o.id,matched.customer_id,ref,auth.uid(),csv,ship,'sending',now());
  end if;
  select jsonb_agg(to_jsonb(i) order by i.id) into item_data from public.order_items i where i.order_id=o.id;
  return jsonb_build_object('order',to_jsonb(o)||jsonb_build_object('order_items',item_data),
    'csv',csv,'warning',warning,'reference',ref);
end; $$;
revoke all on function private.submit_website_order(uuid) from public, anon, authenticated;
grant execute on function private.submit_website_order(uuid) to authenticated;
create or replace function public.submit_website_order(target_order_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
 select private.submit_website_order(target_order_id);
$$;
revoke all on function public.submit_website_order(uuid) from public, anon;
grant execute on function public.submit_website_order(uuid) to authenticated;

-- Only the owner can record the outcome of their own submission; never marks Sage imported.
create or replace function private.record_website_order_email(target_order_id uuid, sent boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.has_pricing_access() then
    raise exception 'Approved customer access required' using errcode='42501';
  end if;
  update public.orders set email_status=case when sent then 'sent' else 'failed' end
  where id=target_order_id and user_id=auth.uid() and status='submitted' and email_status='not_sent';
  if not found then raise exception 'Order email status transition not allowed'; end if;
  update public.intacct_order_exports set csv_email_status=case when sent then 'accepted' else 'unknown' end,csv_email_updated_at=now()
    where order_id=target_order_id and exported_by=auth.uid() and csv_email_status='sending';
end; $$;
revoke all on function private.record_website_order_email(uuid,boolean) from public, anon, authenticated;
grant execute on function private.record_website_order_email(uuid,boolean) to authenticated;
create or replace function public.record_website_order_email(target_order_id uuid, sent boolean) returns void
language sql security invoker set search_path = '' as $$
 select private.record_website_order_email(target_order_id,sent);
$$;
revoke all on function public.record_website_order_email(uuid,boolean) from public, anon;
grant execute on function public.record_website_order_email(uuid,boolean) to authenticated;
commit;
