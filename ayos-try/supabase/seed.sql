insert into public.content_pages (key, title, body, version, published_at)
values
  ('TERMS', 'Terms of Service', 'Local development terms. Replace before production.', 'local-1', now()),
  ('PRIVACY', 'Privacy Policy', 'Local development privacy policy. Replace before production.', 'local-1', now()),
  ('REFUND_POLICY', 'Refund Policy', 'Local development refund policy. Replace before production.', 'local-1', now()),
  ('HELP_CENTER', 'Help Center', 'Local development help content. Replace before production.', 'local-1', now())
on conflict (key) do update set title = excluded.title, body = excluded.body, version = excluded.version;

insert into public.service_categories (name, description)
values
  ('Plumbing', 'Plumbing repair and installation'),
  ('Electrical', 'Electrical repair and installation'),
  ('Cleaning', 'Home and property cleaning')
on conflict (name) do nothing;
