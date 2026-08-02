import { supabase } from '@/lib/supabase';

export async function fetchAccountMobile(
  accountId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('mobile')
    .eq('id', accountId)
    .single();
  if (error) throw error;
  return data?.mobile ?? null;
}
