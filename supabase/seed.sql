-- Stable, idempotent taxonomy only. Never seed identities or business records.
insert into public.service_categories (name, description, is_active)
values
  ('Plumbing', 'Plumbing installation, diagnosis, and repair services.', true),
  ('Electrical', 'Electrical installation, diagnosis, and repair services.', true),
  ('Appliance Repair', 'Household appliance diagnosis and repair.', true),
  ('Cleaning', 'Residential and commercial cleaning services.', true),
  ('Carpentry', 'Furniture, cabinetry, and general carpentry services.', true),
  ('Painting', 'Interior and exterior painting services.', true),
  ('General Repair', 'General property maintenance and repair.', true)
on conflict (name) do update
set description = excluded.description,
    is_active = excluded.is_active,
    updated_at = now();
