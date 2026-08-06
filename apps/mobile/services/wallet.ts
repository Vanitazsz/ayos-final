import { supabase } from '@/lib/supabase';

export async function getMyWalletAccountId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('wallet_accounts')
    .select('id')
    .eq('account_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export {
  fetchWallet,
  fetchWalletTransactions,
  requestPayout,
  type TransactionStatus,
  type WalletSummary,
  type WalletTransaction,
} from './apiCore';
