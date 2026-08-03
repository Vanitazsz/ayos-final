import { supabase } from './adminShared';

export async function loadSettings() {
  const { data, error } = await supabase.from('system_settings').select('key,value');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

export async function saveSetting(key, value) {
  const { data, error } = await supabase.rpc('admin_set_setting', {
    setting_key: key,
    setting_value: value,
  });
  if (error) throw error;
  return data;
}
