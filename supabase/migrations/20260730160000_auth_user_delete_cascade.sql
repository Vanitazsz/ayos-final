begin;

-- Auth dashboard deletion must be able to remove the application account row.
-- Dependent application records retain their own policies; this constraint
-- was incorrectly RESTRICT, causing Supabase Auth to return an empty error.
alter table public.accounts
  drop constraint if exists accounts_id_fkey;

alter table public.accounts
  add constraint accounts_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

commit;
