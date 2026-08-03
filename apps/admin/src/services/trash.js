import { supabase, status } from './adminShared';

export async function loadTrash() {
  const { data, error } = await supabase
    .from('trash_entries')
    .select('*')
    .is('restored_at', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  const groups = { Users: [], Workers: [], Bookings: [], Services: [], Reviews: [] };
  for (const row of data ?? []) {
    const type = status(row.entity_type);
    const key = type.endsWith('s') ? type : `${type}s`;
    const target = groups[key] ?? groups.Services;
    target.push({
      id: row.id,
      item: row.entity_id,
      type,
      deletedBy: row.deleted_by,
      deletedDate: new Date(row.deleted_at).toLocaleDateString(),
      restoreDeadline: 'Retention policy',
      snapshot: row.snapshot,
    });
  }
  return groups;
}

export async function restoreTrash(id) {
  const { data, error } = await supabase.rpc('restore_from_trash', { trash_id: id });
  if (error) throw error;
  return data;
}

export async function permanentlyDeleteTrash(id) {
  const { error } = await supabase.rpc('permanently_delete', { trash_id: id });
  if (error) throw error;
}
