import { supabase } from './adminShared';

export async function loadCatalog() {
  const [{ data: services, error: serviceError }, { data: categories, error: categoryError }] =
    await Promise.all([
      supabase
        .from('service_templates')
        .select(
          'id,name,base_price,estimated_duration_minutes,is_active,service_categories(name,worker_skills(count))',
        )
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('service_categories')
        .select('id,name,is_active,service_templates(count)')
        .order('name'),
    ]);
  if (serviceError) throw serviceError;
  if (categoryError) throw categoryError;
  return {
    services: (services ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.service_categories?.name ?? '',
      price: Number(row.base_price ?? 0),
      duration: row.estimated_duration_minutes ? `${row.estimated_duration_minutes} min` : '',
      workers: row.service_categories?.worker_skills?.[0]?.count ?? 0,
      bookings: null,
      status: row.is_active ? 'Active' : 'Inactive',
    })),
    categories: (categories ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.is_active ? 'Enabled' : 'Disabled',
      servicesCount: row.service_templates?.[0]?.count ?? 0,
    })),
  };
}

export async function loadMostBookedService() {
  const { data, error } = await supabase
    .from('bookings')
    .select('service_requests!inner(service_categories!inner(name))');
  if (error) throw error;
  const counts = new Map();
  for (const row of data ?? []) {
    const name = row.service_requests?.service_categories?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function saveService(value, categories) {
  const category = categories.find((item) => item.name === value.category);
  const duration = Number.parseInt(value.duration, 10) || 60;
  const { data, error } = await supabase.rpc('admin_upsert_service', {
    p_id: value.id || null,
    p_name: value.name,
    p_category_id: category?.id,
    p_minimum_price_minor: Math.round(Number(value.price) * 100),
    p_maximum_price_minor: Math.round(Number(value.price) * 100),
    p_duration_minutes: duration,
    p_is_active: value.status === 'Active',
  });
  if (error) throw error;
  return data;
}

export async function saveCategory(value) {
  const { data, error } = await supabase.rpc('admin_upsert_category', {
    p_id: value.id || null,
    p_name: value.name,
    p_is_active: value.status === 'Enabled',
  });
  if (error) throw error;
  return data;
}
