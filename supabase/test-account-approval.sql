-- All fixtures and approval decisions are rolled back, including audit rows.
begin;
select set_config('test.customer_id',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values(current_setting('test.customer_id')::uuid,'approval-test@example.invalid',now(),
  '{"business_name":"Approval test","approved":true,"isAdmin":true}');
insert into public.orders(user_id,customer_email,customer_business_name)
values(current_setting('test.customer_id')::uuid,'approval-test@example.invalid','Approval test');
insert into public.order_items(order_id,product_id,product_name,category,unit_price,quantity)
select id,'test','Private pricing test','test',12.34,1 from public.orders
where user_id=current_setting('test.customer_id')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.customer_id'),true);
set local role authenticated;
do $$ begin
  if public.portal_access()->>'status' <> 'pending' then raise exception 'New accounts must be pending'; end if;
  if (public.portal_access()->>'isAdmin')::boolean then raise exception 'Metadata granted admin access'; end if;
  if private.has_pricing_access() then raise exception 'Pending customer has pricing access'; end if;
  if (select count(*) from public.customer_accounts) <> 1 then raise exception 'Account data leaked'; end if;
  if exists(select 1 from public.orders) or exists(select 1 from public.order_items) then raise exception 'Pending order prices leaked'; end if;
  begin
    update public.customer_accounts set status='approved' where user_id=auth.uid();
    raise exception 'Self approval permitted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.review_customer_account(auth.uid(),'approved');
    raise exception 'Customer review RPC permitted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='csr@brownderby.ca'),true);
set local role authenticated;
do $$ begin
  if not (public.portal_access()->>'isAdmin')::boolean then raise exception 'Owner admin missing'; end if;
  perform public.review_customer_account(current_setting('test.customer_id')::uuid,'approved');
  begin
    perform public.review_customer_account(auth.uid(),'declined');
    raise exception 'Owner account can be revoked';
  exception when raise_exception then
    if sqlerrm <> 'Administrator accounts cannot be reviewed' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer_id'),true);
set local role authenticated;
do $$ begin
  if not private.has_pricing_access() then raise exception 'Approved pricing access missing'; end if;
  if (select count(*) from public.order_items) <> 1 then raise exception 'Approved order history unavailable'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='csr@brownderby.ca'),true);
set local role authenticated;
select public.review_customer_account(current_setting('test.customer_id')::uuid,'declined');
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.customer_id'),true);
set local role authenticated;
do $$ begin
  if private.has_pricing_access() then raise exception 'Revoked access remains active'; end if;
  if exists(select 1 from public.order_items) then raise exception 'Revoked order prices leaked'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from private.account_reviews where user_id=current_setting('test.customer_id')::uuid) <> 2
  then raise exception 'Approval audit missing'; end if;
end $$;
rollback;
select 'Account approval database tests passed; all fixtures rolled back.' as result;
