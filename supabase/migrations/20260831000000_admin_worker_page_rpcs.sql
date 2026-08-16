-- Admin Workers page RPCs: get_worker_stats + admin_list_worker_page.
-- The ayos-admin Workers page calls both, but they were shipped as scratch SQL
-- and never applied to the hosted project, so the page returned 404 on RPC
-- calls (same root cause documented in 20260827000000_admin_worker_bulk_rpcs.sql).
-- Run in the Supabase SQL editor or via `supabase db push`.

create or replace function public.get_worker_stats()
returns table (
  total bigint,
  active bigint,
  pending_review bigint,
  suspended bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where account.status = 'ACTIVE')::bigint,
    count(*) filter (where exists (
      select 1 from public.worker_verifications verification
      where verification.worker_id = account.id
        and verification.status <> 'APPROVED'
    ))::bigint,
    count(*) filter (where account.status = 'SUSPENDED')::bigint
  from public.accounts account
  where account.role = 'WORKER'
    and account.deleted_at is null;
end
$$;

revoke all on function public.get_worker_stats() from public, anon;
grant execute on function public.get_worker_stats() to authenticated;

create or replace function public.admin_list_worker_page(
  p_search text default null,
  p_status text default 'All',
  p_verified text default 'All',
  p_review_only boolean default false,
  p_field text default 'created',
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_sort text default 'newest',
  p_page integer default 1,
  p_page_size integer default 10
)
returns table (ids uuid[], total_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  filter_status text := upper(btrim(coalesce(p_status, 'All')));
  filter_verified text := lower(btrim(coalesce(p_verified, 'All')));
  filter_field text := lower(btrim(coalesce(p_field, 'created')));
  filter_sort text := lower(btrim(coalesce(p_sort, 'newest')));
  page integer := greatest(1, coalesce(p_page, 1));
  page_size integer := greatest(1, least(100, coalesce(p_page_size, 10)));
  search_term text := nullif(btrim(coalesce(p_search, '')), '');
  trashed_ids text[];
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if filter_status = 'TRASHED' then
    select array_agg(entity_id)
    into trashed_ids
    from public.trash_entries
    where entity_type = 'worker' and restored_at is null;
  end if;

  return query
  with filtered as (
    select
      account.id as account_id,
      account.created_at as created_at,
      profile.updated_at as updated_at
    from public.accounts account
    join public.worker_profiles profile on profile.account_id = account.id
    where account.role = 'WORKER'
      and (filter_status = 'TRASHED' or account.deleted_at is null)
      and (
        filter_status in ('ALL', 'TRASHED')
        or (filter_status = 'PENDING' and account.status = 'PENDING_VERIFICATION')
        or (filter_status = 'ACTIVE' and account.status = 'ACTIVE')
        or (filter_status = 'SUSPENDED' and account.status = 'SUSPENDED')
      )
      and (
        filter_status <> 'TRASHED'
        or account.id::text = any(coalesce(trashed_ids, '{}'))
      )
      and (
        filter_verified = 'all'
        or (filter_verified = 'verified' and profile.approval_status = 'APPROVED')
        or (filter_verified = 'unverified' and profile.approval_status <> 'APPROVED')
      )
      and (
        not p_review_only
        or exists (
          select 1 from public.worker_verifications verification
          where verification.worker_id = account.id
            and verification.status <> 'APPROVED'
        )
      )
      and (
        search_term is null
        or profile.display_name ilike '%' || search_term || '%'
        or account.email ilike '%' || search_term || '%'
        or account.mobile ilike '%' || search_term || '%'
      )
      and (
        p_from is null
        or case filter_field
            when 'modified' then profile.updated_at
            else account.created_at
          end >= p_from
      )
      and (
        p_to is null
        or case filter_field
            when 'modified' then profile.updated_at
            else account.created_at
          end <= p_to
      )
  ),
  ordered as (
    select
      account_id,
      case filter_field
        when 'modified' then updated_at
        else created_at
      end as sort_time,
      count(*) over () as total_count
    from filtered
    order by
      case when filter_sort = 'oldest' then
        case filter_field when 'modified' then updated_at else created_at end
      end asc,
      case when filter_sort = 'newest' then
        case filter_field when 'modified' then updated_at else created_at end
      end desc,
      account_id
    offset (page - 1) * page_size
    limit page_size
  )
  select
    coalesce(array_agg(account_id), '{}'::uuid[]),
    coalesce(max(ordered.total_count), 0)::bigint
  from ordered;
end
$$;

revoke all on function public.admin_list_worker_page(text, text, text, boolean, text, timestamptz, timestamptz, text, integer, integer) from public, anon;
grant execute on function public.admin_list_worker_page(text, text, text, boolean, text, timestamptz, timestamptz, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
