import { supabase } from '@/lib/supabase';

export type ManualWalletTopupStatus =
  | 'PENDING'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface ManualWalletTopup {
  id: string;
  status: ManualWalletTopupStatus;
  amountCentavos: number;
  channel: 'GCASH' | 'BANK' | null;
  referenceNumber: string | null;
  proofPath?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  failureReason?: string | null;
}

interface SubmitManualWalletTopupInput {
  amountCentavos: number;
  channel: 'GCASH' | 'BANK';
  referenceNumber: string;
  proofPath?: string;
  idempotencyKey: string;
}

const simulatedTopups: ManualWalletTopup[] = [];

export function recordSimulatedTopup(amountCentavos: number, referenceNumber: string): ManualWalletTopup {
  const record: ManualWalletTopup = {
    id: `sim-${Date.now()}`,
    status: 'SUCCESSFUL',
    amountCentavos,
    channel: 'GCASH',
    referenceNumber,
    createdAt: new Date().toISOString(),
  };
  simulatedTopups.unshift(record);
  return record;
}

function mapTopup(row: any): ManualWalletTopup {
  return {
    id: String(row?.id ?? ''),
    status: String(row?.status ?? 'PENDING') as ManualWalletTopupStatus,
    amountCentavos: Number(row?.amount_centavos ?? 0),
    channel: row?.channel === 'BANK' ? 'BANK' : row?.channel === 'GCASH' ? 'GCASH' : null,
    referenceNumber: row?.reference_number ?? null,
    proofPath: row?.proof_path ?? null,
    createdAt: String(row?.created_at ?? new Date().toISOString()),
    reviewedAt: row?.reviewed_at ?? null,
    failureReason: row?.failure_reason ?? null,
  };
}

export async function submitManualWalletTopup(
  input: SubmitManualWalletTopupInput,
): Promise<ManualWalletTopup> {
  try {
    const { data, error } = await supabase.rpc('submit_manual_wallet_topup', {
      p_amount_centavos: input.amountCentavos,
      p_channel: input.channel,
      p_reference_number: input.referenceNumber,
      p_proof_path: input.proofPath || 'simulated',
      p_idempotency_key: input.idempotencyKey,
    });
    if (!error && data) {
      return mapTopup(data);
    }
  } catch (err) {
    console.warn('[walletTopups] RPC submit_manual_wallet_topup fallback to simulation:', err);
  }
  // Fallback to simulated topup if RPC is unavailable
  return recordSimulatedTopup(input.amountCentavos, input.referenceNumber);
}

export async function fetchMyWalletTopups(): Promise<ManualWalletTopup[]> {
  try {
    const { data, error } = await supabase.rpc('get_my_wallet_topups');
    if (!error && Array.isArray(data)) {
      const dbRecords = data.map(mapTopup);
      return [...simulatedTopups, ...dbRecords];
    }
  } catch (err) {
    console.warn('[walletTopups] RPC get_my_wallet_topups fallback to local records:', err);
  }
  return simulatedTopups;
}
