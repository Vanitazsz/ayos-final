import { supabase } from './adminShared';

export async function deleteAccount(id, email) {
  const { error } = await supabase.rpc('admin_delete_account', {
    p_account_id: id,
    p_confirmation_email: email,
  });
  if (error) throw error;
}

export async function previewAccountPurge(id) {
  const { data, error } = await supabase.rpc('admin_preview_account_purge', {
    p_account_id: id,
  });
  if (error) throw error;
  return {
    totalRows: Number(data?.total_rows ?? 0),
    storageFiles: Number(data?.storage_files ?? 0),
    tables: Object.entries(data?.tables ?? {})
      .map(([table, count]) => ({ table, count: Number(count) }))
      .sort((left, right) => right.count - left.count || left.table.localeCompare(right.table)),
  };
}

export async function setAccountStatus(id, nextStatus) {
  const { data, error } = await supabase.rpc('set_account_status', {
    account_id: id,
    next_status: nextStatus,
  });
  if (error) throw error;
  return data;
}

export async function softDeleteAccount(id) {
  const { data, error } = await supabase.rpc('admin_soft_delete_account', {
    p_account_id: id,
  });
  if (error) throw error;
  return data;
}
