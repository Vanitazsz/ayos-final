insert into public.permissions (code, description) values
  ('users:view','View users'),('users:manage','Manage users'),
  ('workers:view','View workers'),('workers:manage','Manage workers'),('workers:verify','Review worker verification'),
  ('bookings:view','View bookings'),('bookings:manage','Manage bookings'),
  ('catalog:view','View catalog'),('catalog:manage','Manage catalog'),
  ('payments:view','View payments'),('payments:manage','Manage payments'),
  ('reviews:view','View reviews'),('reviews:moderate','Moderate reviews'),
  ('support:view','View support'),('support:manage','Manage support'),
  ('campaigns:view','View campaigns'),('campaigns:manage','Manage campaigns'),('campaigns:send','Send campaigns'),
  ('analytics:view','View analytics'),('reports:view','View reports'),('reports:manage','Generate reports'),
  ('audit:view','View audit logs'),('settings:view','View settings'),('settings:manage','Manage settings'),
  ('recovery:view','View trash'),('recovery:manage','Restore records'),('recovery:purge','Purge records')
on conflict (code) do update set description = excluded.description;

insert into public.roles (code, name, description) values
  ('customer','Customer','Marketplace customer'),
  ('worker','Worker','Service provider'),
  ('support_agent','Support Agent','Customer support staff'),
  ('operations_admin','Operations Administrator','Operations and worker verification'),
  ('finance_admin','Finance Administrator','Payments and reporting'),
  ('super_admin','Super Administrator','All permissions')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.code = 'super_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'users:view','users:manage','workers:view','workers:manage','workers:verify','bookings:view','bookings:manage',
  'catalog:view','catalog:manage','reviews:view','reviews:moderate','support:view','support:manage',
  'analytics:view','reports:view'
]) where r.code = 'operations_admin' on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'users:view','workers:view','bookings:view','payments:view','payments:manage','analytics:view',
  'reports:view','reports:manage','audit:view'
]) where r.code = 'finance_admin' on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'users:view','workers:view','bookings:view','reviews:view','support:view','support:manage'
]) where r.code = 'support_agent' on conflict do nothing;

insert into public.industries (code, name) values
  ('plumbing','Plumbing'),('electrical','Electrical'),('carpentry','Carpentry'),('hvac','HVAC'),
  ('painting','Painting'),('cleaning','Cleaning'),('landscaping','Landscaping'),
  ('appliance_repair','Appliance Repair'),('general_maintenance','General Maintenance'),('construction','Construction')
on conflict (code) do update set name = excluded.name;

insert into public.skills (industry_id, code, name)
select i.id, values_table.code, values_table.name from public.industries i
join (values
  ('plumbing','pipe_repair','Pipe Repair'),('plumbing','drain_cleaning','Drain Cleaning'),('plumbing','leak_detection','Leak Detection'),
  ('electrical','wiring_installation','Wiring Installation'),('electrical','circuit_breaker_repair','Circuit Breaker Repair'),('electrical','lighting_installation','Lighting Installation'),
  ('carpentry','furniture_assembly','Furniture Assembly'),('carpentry','cabinet_installation','Cabinet Installation'),('carpentry','door_window_repair','Door/Window Repair'),
  ('hvac','ac_installation','AC Installation'),('hvac','ac_repair','AC Repair'),('hvac','duct_cleaning','Duct Cleaning'),
  ('painting','interior_painting','Interior Painting'),('painting','exterior_painting','Exterior Painting'),
  ('cleaning','deep_cleaning','Deep Cleaning'),('cleaning','move_in_out','Move-in/Move-out'),
  ('landscaping','lawn_mowing','Lawn Mowing'),('landscaping','garden_maintenance','Garden Maintenance'),
  ('appliance_repair','refrigerator_repair','Refrigerator Repair'),('appliance_repair','washing_machine_repair','Washing Machine Repair'),
  ('general_maintenance','home_inspection','Home Inspection'),('general_maintenance','drywall_repair','Drywall Repair'),
  ('construction','flooring_installation','Flooring Installation'),('construction','roofing_repair','Roofing Repair')
) as values_table(industry_code, code, name) on values_table.industry_code = i.code
on conflict (industry_id, code) do update set name = excluded.name;

insert into public.service_categories (slug, name, icon, color) values
  ('plumbing','Plumbing','Wrench','#1B5E20'),('electrical','Electrical','Zap','#F9A825'),
  ('hvac','HVAC','Wind','#1565C0'),('cleaning','Cleaning','Sparkles','#7B1FA2'),
  ('repair','Repair','Hammer','#E65100'),('painting','Painting','Paintbrush','#C2185B'),
  ('carpentry','Carpentry','TreePine','#33691E'),('more','More','Grid2x2','#616161')
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, color = excluded.color;

insert into public.services (category_id, slug, name, description, base_price, duration_minutes)
select c.id, v.slug, v.name, v.description, v.base_price, v.duration from public.service_categories c
join (values
  ('plumbing','leak-repair','Leak Repair','Diagnose and repair household plumbing leaks',75000,60),
  ('plumbing','drain-cleaning','Drain Cleaning','Clear blocked household drains',90000,90),
  ('electrical','electrical-repair','Electrical Repair','Diagnose and repair household electrical faults',100000,90),
  ('hvac','aircon-service','Aircon Service','Routine air-conditioning inspection and cleaning',120000,120),
  ('cleaning','home-cleaning','Home Cleaning','General residential cleaning service',85000,180),
  ('painting','interior-painting','Interior Painting','Interior surface preparation and painting',150000,240),
  ('carpentry','furniture-repair','Furniture Repair','Repair common household furniture damage',100000,120),
  ('repair','appliance-repair','Appliance Repair','Troubleshoot and repair home appliances',110000,120)
) as v(category_slug,slug,name,description,base_price,duration) on v.category_slug = c.slug
on conflict (slug) do update set name = excluded.name, description = excluded.description, base_price = excluded.base_price, duration_minutes = excluded.duration_minutes;

insert into public.platform_settings (key, value) values
  ('general.currency','"PHP"'::jsonb),
  ('booking.platform_fee_percent','10'::jsonb),
  ('booking.default_radius_m','10000'::jsonb),
  ('security.require_worker_verification','true'::jsonb),
  ('storage.max_upload_bytes','10485760'::jsonb)
on conflict (key) do update set value = excluded.value;
