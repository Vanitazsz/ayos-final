begin;

create or replace function public.activate_confirmed_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.accounts
  set email=lower(new.email),
      status=case
        when new.email_confirmed_at is not null and status='PENDING_VERIFICATION' then 'ACTIVE'::public.account_status
        else status
      end,
      updated_at=now()
  where id=new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
after update of email,email_confirmed_at on auth.users
for each row execute function public.activate_confirmed_account();

update public.accounts account
set status='ACTIVE',updated_at=now()
where status='PENDING_VERIFICATION'
  and exists(select 1 from auth.users auth_user where auth_user.id=account.id and auth_user.email_confirmed_at is not null);

commit;
