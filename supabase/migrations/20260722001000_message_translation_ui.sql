alter table public.user_profiles
  add column if not exists preferred_locale text not null default 'en';
alter table public.worker_profiles
  add column if not exists preferred_locale text not null default 'en';

alter table public.user_profiles drop constraint if exists user_profiles_preferred_locale_check;
alter table public.user_profiles add constraint user_profiles_preferred_locale_check
  check (preferred_locale in ('en', 'fil'));
alter table public.worker_profiles drop constraint if exists worker_profiles_preferred_locale_check;
alter table public.worker_profiles add constraint worker_profiles_preferred_locale_check
  check (preferred_locale in ('en', 'fil'));

drop policy if exists translations_member_read on public.message_translations;
create policy translations_member_read on public.message_translations
for select to authenticated using (
  exists (
    select 1 from public.messages m
    where m.id = message_id and public.is_conversation_participant(m.conversation_id)
  )
);

create or replace function public.set_my_preferred_locale(p_locale text)
returns text language plpgsql security definer set search_path = '' as $$
declare role public.account_role;
begin
  if p_locale not in ('en', 'fil') then
    raise exception using errcode = '22023', message = 'INVALID_LOCALE';
  end if;
  select a.role into role from public.accounts a where a.id = auth.uid();
  if role = 'USER' then
    update public.user_profiles set preferred_locale = p_locale where account_id = auth.uid();
  elsif role = 'WORKER' then
    update public.worker_profiles set preferred_locale = p_locale where account_id = auth.uid();
  else
    raise exception using errcode = '42501', message = 'PROFILE_REQUIRED';
  end if;
  return p_locale;
end $$;

create or replace function public.get_conversation_recipient_locale(p_conversation_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare recipient_id uuid; locale text;
begin
  if not public.is_conversation_participant(p_conversation_id) then
    raise exception using errcode = '42501', message = 'CONVERSATION_UNAVAILABLE';
  end if;
  select participant.account_id into recipient_id
  from public.conversation_participants participant
  where participant.conversation_id = p_conversation_id and participant.account_id <> auth.uid()
  order by participant.joined_at limit 1;
  select coalesce(customer.preferred_locale, worker.preferred_locale, 'en') into locale
  from public.accounts account
  left join public.user_profiles customer on customer.account_id = account.id
  left join public.worker_profiles worker on worker.account_id = account.id
  where account.id = recipient_id;
  return case when locale = 'fil' then 'fil' else 'en' end;
end $$;

revoke all on function public.set_my_preferred_locale(text) from public, anon;
revoke all on function public.get_conversation_recipient_locale(uuid) from public, anon;
grant execute on function public.set_my_preferred_locale(text) to authenticated;
grant execute on function public.get_conversation_recipient_locale(uuid) to authenticated;
