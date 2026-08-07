import { supabase } from '@/lib/supabase';

export async function getMyWalletAccountId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user.id;
}

export {
  fetchWallet,
  fetchWalletTransactions,
  requestPayout,
  simulateTopUp,
  PLATFORM_COMMISSION_RATE,
  type TransactionStatus,
  type WalletSummary,
  type WalletTransaction,
} from './apiCore';

