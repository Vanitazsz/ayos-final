import { supabase } from './adminShared';

export async function loadSubdivisions() {
  const { data, error } = await supabase.rpc('admin_list_subdivisions');
  if (error) throw error;
  return data ?? [];
}

export async function saveSubdivision(input) {
  const params = {
    p_name: input.name,
    p_lat: Number(input.center_lat),
    p_lng: Number(input.center_lng),
    p_radius_meters: Number(input.radius_meters),
    p_boundary: input.boundary ?? null,
  };
  const { data, error } = input.id
    ? await supabase.rpc('admin_update_subdivision', {
        p_id: input.id,
        ...params,
        p_is_active: Boolean(input.is_active),
      })
    : await supabase.rpc('admin_create_subdivision', params);
  if (error) throw error;
  return data;
}
