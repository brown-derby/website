-- Internal email audit, separate from Sage import confirmation.
begin;
alter table public.intacct_order_exports
  add column if not exists csv_email_status text
    check (csv_email_status in ('sending','accepted','failed','unknown')),
  add column if not exists csv_email_updated_at timestamptz;

create or replace function private.admin_record_intacct_csv_email(
  target_order_id uuid, email_state text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_portal_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if email_state is null or email_state not in ('sending','accepted','failed','unknown') then
    raise exception 'Invalid CSV email status';
  end if;
  update public.intacct_order_exports
    set csv_email_status = email_state, csv_email_updated_at = now()
    where order_id = target_order_id and exported_by = auth.uid()
      and ((email_state = 'sending' and csv_email_status is null)
        or (email_state <> 'sending' and csv_email_status = 'sending'));
  if not found then raise exception 'CSV email status transition not allowed'; end if;
end;
$$;
revoke all on function private.admin_record_intacct_csv_email(uuid,text) from public, anon, authenticated;
grant execute on function private.admin_record_intacct_csv_email(uuid,text) to authenticated;
create or replace function public.admin_record_intacct_csv_email(
  target_order_id uuid, email_state text
) returns void language sql security invoker set search_path = '' as $$
  select private.admin_record_intacct_csv_email(target_order_id,email_state);
$$;
revoke all on function public.admin_record_intacct_csv_email(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_record_intacct_csv_email(uuid,text) to authenticated;
commit;
