begin;

-- Keep the Auth -> application-account contract explicit. Several historical
-- migrations replace provision_account(); reasserting the trigger here makes
-- the production migration state deterministic and prevents an Auth identity
-- from being created without its application account/profile.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists provision_account_after_auth_insert on auth.users;
create trigger provision_account_after_auth_insert
after insert on auth.users
for each row execute function public.provision_account();

-- A confirmed identity must be immediately usable by the application.
drop trigger if exists on_auth_user_confirmed on auth.users;
drop trigger if exists activate_account_after_email_confirmation on auth.users;
create trigger activate_account_after_email_confirmation
after update of email, email_confirmed_at on auth.users
for each row execute function public.activate_confirmed_account();

-- Repair rows left pending by an earlier deployment before this migration.
update public.accounts account
set email = lower(auth_user.email),
    status = case
      when auth_user.email_confirmed_at is not null
        and account.status = 'PENDING_VERIFICATION'
      then 'ACTIVE'::public.account_status
      else account.status
    end,
    updated_at = now()
from auth.users auth_user
where auth_user.id = account.id
  and account.deleted_at is null;

commit;
