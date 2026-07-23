-- Idempotent hosted-schema reconciliation for the industry and skill taxonomy.
-- Replays the complete contract because hosted migration 20260722000500 was recorded
-- before its pre-existing industries table had the required sort_order column.

begin;
create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique check (length(btrim(name)) between 2 and 120),
  description text check (description is null or length(btrim(description)) between 2 and 1000),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The hosted authoritative schema already contains an earlier industries table
-- without display ordering. CREATE TABLE IF NOT EXISTS does not add columns.
alter table public.industries
  add column if not exists sort_order integer not null default 0 check (sort_order >= 0);
alter table public.service_categories
  add column if not exists industry_id uuid references public.industries(id) on delete restrict;
alter table public.worker_profiles
  add column if not exists primary_industry_id uuid references public.industries(id) on delete restrict;
create index if not exists industries_active_order_idx
  on public.industries(sort_order, name) where is_active;
create index if not exists service_categories_industry_active_name_idx
  on public.service_categories(industry_id, is_active, name);
create index if not exists worker_profiles_primary_industry_idx
  on public.worker_profiles(primary_industry_id) where primary_industry_id is not null;
drop trigger if exists set_updated_at on public.industries;
create trigger set_updated_at before update on public.industries
for each row execute function public.set_updated_at();
alter table public.industries enable row level security;
drop policy if exists industries_public_read on public.industries;
create policy industries_public_read on public.industries
for select to anon, authenticated
using (is_active or public.is_admin(false));
drop policy if exists industries_admin_write on public.industries;
create policy industries_admin_write on public.industries
for all to authenticated
using (public.is_admin(true))
with check (public.is_admin(true));
grant select on public.industries to anon, authenticated;
grant insert, update, delete on public.industries to authenticated;
insert into public.industries(slug, name, description, sort_order, is_active)
values
  ('cleaning', 'Cleaning', 'Residential and property cleaning services.', 10, true),
  ('electrical', 'Electrical', 'Electrical installation, maintenance, and repair services.', 20, true),
  ('plumbing', 'Plumbing', 'Plumbing installation, maintenance, and repair services.', 30, true),
  ('carpentry', 'Carpentry', 'Woodwork, furniture, fixture, and partition services.', 40, true),
  ('painting', 'Painting', 'Interior, exterior, and decorative painting services.', 50, true),
  ('masonry-tiling', 'Masonry & Tiling', 'Masonry, concrete, plastering, and tile services.', 60, true),
  ('air-conditioning-refrigeration', 'Air Conditioning & Refrigeration', 'Cooling and refrigeration installation, maintenance, and repair services.', 70, true),
  ('appliance-repair', 'Appliance Repair', 'Household and small-appliance diagnosis and repair services.', 80, true),
  ('landscaping-gardening', 'Landscaping & Gardening', 'Garden, lawn, planting, irrigation, and yard services.', 90, true),
  ('roofing-waterproofing', 'Roofing & Waterproofing', 'Roof, gutter, leak, and waterproofing services.', 100, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
with catalog(industry_slug, skill_slug, skill_name, skill_description) as (
  values
    ('cleaning', 'cleaning', 'Cleaning', 'General home and property cleaning.'),
    ('cleaning', 'deep-cleaning', 'Deep Cleaning', 'Detailed cleaning of high-use and hard-to-reach areas.'),
    ('cleaning', 'move-in-move-out-cleaning', 'Move-In/Move-Out Cleaning', 'Cleaning before occupancy or after vacating a property.'),
    ('cleaning', 'post-construction-cleaning', 'Post-Construction Cleaning', 'Removal of construction dust and debris after completed work.'),
    ('cleaning', 'carpet-upholstery-cleaning', 'Carpet & Upholstery Cleaning', 'Cleaning of carpets, rugs, and upholstered furniture.'),
    ('electrical', 'electrical', 'Electrical', 'General electrical diagnosis and repair.'),
    ('electrical', 'wiring-rewiring', 'Wiring & Rewiring', 'Installation or replacement of electrical wiring.'),
    ('electrical', 'lighting-installation', 'Lighting Installation', 'Installation and replacement of lighting fixtures.'),
    ('electrical', 'outlet-switch-installation', 'Outlet & Switch Installation', 'Installation and repair of outlets and switches.'),
    ('electrical', 'panel-circuit-breaker-service', 'Panel & Circuit Breaker Service', 'Inspection, repair, and replacement of panels and breakers.'),
    ('plumbing', 'plumbing', 'Plumbing', 'General plumbing diagnosis and repair.'),
    ('plumbing', 'leak-detection-repair', 'Leak Detection & Repair', 'Detection and repair of water leaks.'),
    ('plumbing', 'drain-unclogging', 'Drain Unclogging', 'Clearing blocked sinks, drains, and waste lines.'),
    ('plumbing', 'fixture-installation', 'Fixture Installation', 'Installation and replacement of plumbing fixtures.'),
    ('plumbing', 'pipe-installation-repair', 'Pipe Installation & Repair', 'Installation, replacement, and repair of water pipes.'),
    ('carpentry', 'furniture-repair', 'Furniture Repair', 'Repair and restoration of wooden furniture.'),
    ('carpentry', 'cabinet-installation-repair', 'Cabinet Installation & Repair', 'Installation, alignment, and repair of cabinets.'),
    ('carpentry', 'door-window-repair', 'Door & Window Repair', 'Repair and adjustment of wooden doors and windows.'),
    ('carpentry', 'custom-woodwork', 'Custom Woodwork', 'Made-to-measure wood fixtures and furnishings.'),
    ('carpentry', 'ceiling-partition-installation', 'Ceiling & Partition Installation', 'Installation and repair of ceilings and room partitions.'),
    ('painting', 'interior-painting', 'Interior Painting', 'Painting of indoor walls, ceilings, and fixtures.'),
    ('painting', 'exterior-painting', 'Exterior Painting', 'Weather-resistant painting of exterior surfaces.'),
    ('painting', 'repainting-touch-ups', 'Repainting & Touch-Ups', 'Refresh coats and localized paint repairs.'),
    ('painting', 'surface-preparation', 'Surface Preparation', 'Cleaning, sanding, patching, and priming before painting.'),
    ('painting', 'decorative-finishing', 'Decorative Finishing', 'Decorative paint effects and specialty finishes.'),
    ('masonry-tiling', 'tile-installation-repair', 'Tile Installation & Repair', 'Installation and replacement of wall and floor tiles.'),
    ('masonry-tiling', 'concrete-repair', 'Concrete Repair', 'Repair of damaged concrete surfaces and minor structures.'),
    ('masonry-tiling', 'wall-fence-construction', 'Wall & Fence Construction', 'Construction and repair of masonry walls and fences.'),
    ('masonry-tiling', 'plastering-rendering', 'Plastering & Rendering', 'Application and repair of plaster and cement render.'),
    ('masonry-tiling', 'minor-demolition', 'Minor Demolition', 'Controlled removal of small non-structural masonry work.'),
    ('air-conditioning-refrigeration', 'aircon-cleaning-maintenance', 'Aircon Cleaning & Maintenance', 'Routine cleaning and preventive maintenance of air conditioners.'),
    ('air-conditioning-refrigeration', 'aircon-installation', 'Aircon Installation', 'Installation and commissioning of air-conditioning units.'),
    ('air-conditioning-refrigeration', 'aircon-repair', 'Aircon Repair', 'Diagnosis and repair of air-conditioning faults.'),
    ('air-conditioning-refrigeration', 'refrigerant-charging', 'Refrigerant Charging', 'Leak-aware refrigerant diagnosis and charging.'),
    ('air-conditioning-refrigeration', 'refrigerator-freezer-repair', 'Refrigerator & Freezer Repair', 'Diagnosis and repair of household refrigeration appliances.'),
    ('appliance-repair', 'washing-machine-repair', 'Washing Machine Repair', 'Diagnosis and repair of washing machines.'),
    ('appliance-repair', 'stove-oven-repair', 'Stove & Oven Repair', 'Diagnosis and repair of electric or gas cooking appliances.'),
    ('appliance-repair', 'water-heater-repair', 'Water Heater Repair', 'Diagnosis and repair of household water heaters.'),
    ('appliance-repair', 'electric-fan-repair', 'Electric Fan Repair', 'Diagnosis and repair of electric fans.'),
    ('appliance-repair', 'small-appliance-repair', 'Small Appliance Repair', 'Diagnosis and repair of supported small household appliances.'),
    ('landscaping-gardening', 'lawn-garden-maintenance', 'Lawn & Garden Maintenance', 'Routine lawn and garden care.'),
    ('landscaping-gardening', 'tree-shrub-trimming', 'Tree & Shrub Trimming', 'Pruning and trimming of manageable trees and shrubs.'),
    ('landscaping-gardening', 'garden-design-planting', 'Garden Design & Planting', 'Garden layout, soil preparation, and planting.'),
    ('landscaping-gardening', 'irrigation-installation-repair', 'Irrigation Installation & Repair', 'Installation and repair of garden irrigation systems.'),
    ('landscaping-gardening', 'yard-cleanup', 'Yard Cleanup', 'Removal of leaves, cuttings, and ordinary yard debris.'),
    ('roofing-waterproofing', 'roof-inspection-repair', 'Roof Inspection & Repair', 'Inspection and repair of damaged roofing components.'),
    ('roofing-waterproofing', 'roof-leak-repair', 'Roof Leak Repair', 'Identification and repair of roof water entry points.'),
    ('roofing-waterproofing', 'gutter-installation-cleaning', 'Gutter Installation & Cleaning', 'Installation, repair, and cleaning of roof gutters.'),
    ('roofing-waterproofing', 'waterproofing', 'Waterproofing', 'Application and repair of waterproofing systems.'),
    ('roofing-waterproofing', 'roof-installation-replacement', 'Roof Installation & Replacement', 'Installation or replacement of roof covering systems.')
)
insert into public.service_categories(name, slug, description, is_active, industry_id)
select catalog.skill_name, catalog.skill_slug, catalog.skill_description, true, industry.id
from catalog
join public.industries industry on industry.slug = catalog.industry_slug
on conflict (name) do update
set slug = excluded.slug,
    description = coalesce(public.service_categories.description, excluded.description),
    is_active = true,
    industry_id = excluded.industry_id,
    updated_at = now();
-- Infer a primary industry only when all existing skills resolve to one industry.
with unambiguous_worker_industries as (
  select skill.worker_id, min(category.industry_id::text)::uuid as industry_id
  from public.worker_skills skill
  join public.service_categories category on category.id = skill.category_id
  where category.industry_id is not null
  group by skill.worker_id
  having count(distinct category.industry_id) = 1
)
update public.worker_profiles profile
set primary_industry_id = inferred.industry_id,
    updated_at = now()
from unambiguous_worker_industries inferred
where profile.account_id = inferred.worker_id
  and profile.primary_industry_id is null;
-- Registration skills are written transactionally by the onboarding RPC. Direct
-- writes would bypass active-state and same-industry validation.
revoke insert, update, delete on public.worker_skills from authenticated;
drop policy if exists skills_owner_write on public.worker_skills;
create or replace function public.submit_worker_onboarding_identity(
  p_identity_data jsonb,
  p_document_paths text[]
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare
  result public.worker_verifications;
  selected_industry_id uuid;
  selected_skill_ids uuid[];
  birthday_date date;
  uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
begin
  if public.current_role() is distinct from 'WORKER'
    or jsonb_typeof(p_identity_data) is distinct from 'object'
    or length(btrim(coalesce(p_identity_data->>'firstName', ''))) not between 1 and 80
    or length(btrim(coalesce(p_identity_data->>'lastName', ''))) not between 1 and 80
    or coalesce(p_identity_data->>'phone', '') !~ '^(09|\+639)[0-9]{9}$'
    or coalesce(p_identity_data->>'birthday', '') !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
    or coalesce(p_identity_data->>'gender', '') not in ('', 'male', 'female', 'other')
    or p_identity_data->>'employmentType' not in ('employed', 'freelance')
    or jsonb_typeof(p_identity_data->'address') is distinct from 'object'
    or length(btrim(coalesce(p_identity_data#>>'{address,street}', ''))) not between 1 and 120
    or length(btrim(coalesce(p_identity_data#>>'{address,city}', ''))) not between 2 and 120
    or length(btrim(coalesce(p_identity_data#>>'{address,province}', ''))) not between 2 and 120
    or length(btrim(coalesce(p_identity_data->>'contactPerson', ''))) not between 2 and 120
    or coalesce(p_identity_data->>'contactPhone', '') !~ '^(09|\+639)[0-9]{9}$'
    or coalesce(p_identity_data->>'idType', '') not in ('philsys','drivers_license','passport','umid','postal','prc','voters','senior','other')
    or jsonb_typeof(p_identity_data->'consents') is distinct from 'object'
    or p_identity_data->'consents'->'informationAccurate' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'privacy' is distinct from 'true'::jsonb
    or p_identity_data->'consents'->'terms' is distinct from 'true'::jsonb
    or coalesce(cardinality(p_document_paths), 0) <> 2
    or coalesce(p_identity_data->>'industryId', '') !~ uuid_pattern
    or jsonb_typeof(p_identity_data->'skillIds') is distinct from 'array'
    or jsonb_array_length(p_identity_data->'skillIds') not between 1 and 10
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  begin
    birthday_date := to_date(p_identity_data->>'birthday', 'MM/DD/YYYY');
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end;
  if to_char(birthday_date, 'MM/DD/YYYY') <> p_identity_data->>'birthday'
    or birthday_date > current_date then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ONBOARDING';
  end if;

  if exists (
    select 1 from jsonb_array_elements_text(p_identity_data->'skillIds') item
    where item.value !~ uuid_pattern
  ) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  selected_industry_id := (p_identity_data->>'industryId')::uuid;
  select array_agg(distinct item.value::uuid)
  into selected_skill_ids
  from jsonb_array_elements_text(p_identity_data->'skillIds') item;

  if cardinality(selected_skill_ids) <> jsonb_array_length(p_identity_data->'skillIds')
    or not exists (
      select 1 from public.industries industry
      where industry.id = selected_industry_id and industry.is_active
    )
    or (
      select count(*) from public.service_categories category
      where category.id = any(selected_skill_ids)
        and category.industry_id = selected_industry_id
        and category.is_active
    ) <> cardinality(selected_skill_ids)
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  if exists (
    select 1 from unnest(p_document_paths) path
    where path not like auth.uid()::text || '/%'
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'verification-documents'
          and object.name = path
          and object.owner_id = auth.uid()::text
      )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_DOCUMENT';
  end if;

  insert into public.worker_verifications(worker_id, status, identity_data, document_paths)
  values (auth.uid(), 'PENDING', p_identity_data, p_document_paths)
  on conflict(worker_id) do update
  set status = 'PENDING',
      identity_data = excluded.identity_data,
      document_paths = excluded.document_paths,
      requested_notes = null,
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
  where public.worker_verifications.status in ('PENDING', 'NEEDS_DOCUMENTS', 'REJECTED')
  returning * into result;

  if result.id is null then
    raise exception using errcode = '55000', message = 'VERIFICATION_CANNOT_BE_RESUBMITTED';
  end if;

  update public.worker_profiles
  set primary_industry_id = selected_industry_id,
      updated_at = now()
  where account_id = auth.uid();

  delete from public.worker_skills
  where worker_id = auth.uid()
    and category_id <> all(selected_skill_ids);

  insert into public.worker_skills(worker_id, category_id)
  select auth.uid(), skill_id from unnest(selected_skill_ids) skill_id
  on conflict(worker_id, category_id) do nothing;

  return result;
end $$;
revoke all on function public.submit_worker_onboarding_identity(jsonb, text[]) from public, anon;
grant execute on function public.submit_worker_onboarding_identity(jsonb, text[]) to authenticated;
create or replace function public.submit_worker_application(
  p_identity_data jsonb,
  p_document_paths text[],
  p_bio text,
  p_experience text
) returns public.worker_verifications
language plpgsql security definer set search_path = '' as $$
declare result public.worker_verifications;
begin
  if not exists (
    select 1 from public.accounts account
    where account.id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  update public.worker_profiles
  set bio = nullif(btrim(p_bio), ''),
      experience = nullif(btrim(p_experience), ''),
      updated_at = now()
  where account_id = auth.uid();
  if not found then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  result := public.submit_worker_onboarding_identity(p_identity_data, p_document_paths);

  update public.accounts
  set profile_completed_at = coalesce(profile_completed_at, now()),
      updated_at = now()
  where id = auth.uid();

  return result;
end $$;
revoke all on function public.submit_worker_application(jsonb, text[], text, text) from public, anon;
grant execute on function public.submit_worker_application(jsonb, text[], text, text) to authenticated;
commit;
