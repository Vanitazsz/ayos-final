import { supabase } from '@/lib/supabase';

export type Subdivision = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  boundary: Record<string, unknown> | null;
  is_active: boolean;
};

export async function fetchActiveSubdivisions(): Promise<Subdivision[]> {
  const { data, error } = await supabase
    .from('subdivisions')
    .select('id,name,center_lat,center_lng,radius_meters,boundary,is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Subdivision[];
}

export async function detectSubdivision(latitude: number, longitude: number) {
  const { data, error } = await supabase
    .rpc('auto_detect_subdivision', { p_lat: latitude, p_lng: longitude })
    .maybeSingle();
  if (error) throw error;
  return data as Subdivision | null;
}

export async function setMySubdivision(subdivisionId: string) {
  const { data, error } = await supabase.rpc('set_my_subdivision', {
    p_subdivision_id: subdivisionId,
  });
  if (error) throw error;
  return data as string;
}
