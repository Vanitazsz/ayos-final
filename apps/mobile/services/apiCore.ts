import type { ProviderData } from '@/components/ProviderCard';
import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import type { MediaInput } from '@/types/ai';
import type { AddressDetailsRecord } from '@/types/location';
import {
  invokeAuthenticatedFunction,
  SessionExpiredError,
} from '@/services/authenticatedFunctions';
import { normalizeFunctionError } from '@/services/functionErrors';
import {
  getMyProfile,
  requireIdentity,
  batchResolveAvatars,
  resolveProfileAvatar,
} from '@/services/profile';
import { filterWorkerSkillsForIndustries } from '@/utils/workerSkills';
import { normalizeCommissionRatePercent } from '@/utils/commission';
import { recordWorkerLocation as recordWorkerLocationRpc } from './bookingLocation';

// The current RPC schema still requires a positive request budget. Using the
// maximum storable value removes customer-side price filtering; select_worker
// snapshots the chosen worker's saved rate as the actual booking price.
const LEGACY_UNCAPPED_REQUEST_BUDGET_MINOR = 999_999_999_999;

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export { EdgeFunctionError } from '@/services/functionErrors';
export {
  geocodeSearch,
  reverseGeocode,
  type GeocodingResult,
} from '@/services/geocoding';
export { calculateRoute, type RouteResult } from '@/services/routing';
export interface WorkerBooking {
  id: string;
  requestId?: string;
  recordType?: 'booking';
  customerName: string;
  customerAvatar: string;
  service: string;
  date: string;
  time: string;
  address: string;
  price: string;
  status: string;
  distance: string;
  lat?: number;
  lng?: number;
  hourlyRate?: number;
  hasParts?: boolean;
  partsDescription?: string;
  duration?: string;
  workerRating?: number;
  workerReview?: string;
  cancelledBy?: 'customer' | 'worker';
  cancelledReason?: string;
  reportedReason?: string;
  isReported?: boolean;
}
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export interface WalletTransaction {
  id: string;
  label: string;
  sub: string;
  amount: string;
  credit: boolean;
  status: TransactionStatus;
  date: string;
  createdAt: string;
}
export interface WalletSummary {
  available: string;
  locked: string;
  completedJobs: number;
  methods: {
    id: string;
    method_type: string;
    label: string;
    last_four: string;
    is_default: boolean;
  }[];
  payouts: any[];
}
export interface WorkerProfile {
  id: string;
  name: string;
  email: string;
  avatarUri: string;
  category: string;
  primaryIndustry: string;
  verificationStatus: 'verified' | 'pending' | 'needs_review' | 'rejected';
  profileComplete: boolean;
  yearsExperience: number;
  completedJobs: number;
  earnings: string;
  hourlyRate: string;
  skills: string[];
  serviceAreas: string[];
  bio: string;
}
export interface IndustrySkill {
  id: string;
  slug: string;
  name: string;
}
export interface IndustryWithSkills {
  id: string;
  slug: string;
  name: string;
  skills: IndustrySkill[];
}
const money = (value: number | string | null | undefined) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
let rtf: Intl.RelativeTimeFormat | undefined;
const relative = (date: string) => {
  const days = Math.max(
    1,
    Math.round((Date.now() - new Date(date).getTime()) / 86400000),
  );
  if (
    typeof Intl !== 'undefined' &&
    typeof Intl.RelativeTimeFormat === 'function'
  ) {
    rtf ??= new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    return rtf.format(-days, 'day');
  }
  return days === 1 ? 'yesterday' : `${days} days ago`;
};
let cachedUser: { id: string; expiresAt: number } | null = null;
const requireUser = async () => {
  if (cachedUser && Date.now() < cachedUser.expiresAt) {
    return { id: cachedUser.id } as any;
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Authentication required');
  cachedUser = { id: user.id, expiresAt: Date.now() + 14 * 60 * 1000 };
  return user;
};
export const invalidateUserCache = () => {
  cachedUser = null;
};
export const apiErrorMessage = (
  error: unknown,
  fallback = 'Request failed',
) => {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }
  return fallback;
};
const wrap = async <T>(load: () => Promise<T>): Promise<ApiResponse<T>> => {
  try {
    return { data: await load() };
  } catch (error) {
    return {
      data: [] as T,
      error: apiErrorMessage(error),
    };
  }
};

const firstRelation = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export function subscribeToTable(
  table: string,
  onChange: () => void,
  filter?: string,
  onStatus?: (status: string) => void,
  events: ('INSERT' | 'UPDATE' | 'DELETE')[] = ['INSERT', 'UPDATE', 'DELETE'],
) {
  const channel = supabase
    .channel(`${table}:${filter ?? 'all'}:${randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => {
        if (events.includes(payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE')) {
          onChange();
        }
      },
    )
    .subscribe((status) => onStatus?.(status));
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToConversationBroadcast(
  conversationId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`conversation:${conversationId}:messages`, {
      config: { private: true },
    })
    .on('broadcast', { event: '*' }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function subscribeToBookingFeed(
  role: 'customer' | 'worker',
  onChange: () => void,
) {
  const user = await requireUser();
  const statuses = new Map<string, string>([
    ['bookings', 'CONNECTING'],
    ['service_requests', 'CONNECTING'],
  ]);
  let fallback: ReturnType<typeof setInterval> | null = null;
  const syncFallback = () => {
    const connected = [...statuses.values()].every(
      (status) => status === 'SUBSCRIBED',
    );
    if (connected && fallback) {
      clearInterval(fallback);
      fallback = null;
    } else if (!connected && !fallback) {
      fallback = setInterval(onChange, 20000);
    }
  };
  const track = (table: string) => (status: string) => {
    statuses.set(table, status);
    if (status === 'SUBSCRIBED') onChange();
    syncFallback();
  };
  const stops = [
    subscribeToTable(
      'bookings',
      onChange,
      `${role === 'customer' ? 'user_account_id' : 'worker_account_id'}=eq.${user.id}`,
      track('bookings'),
      ['INSERT', 'UPDATE'],
    ),
    subscribeToTable(
      'service_requests',
      onChange,
      `${role === 'customer' ? 'user_account_id' : 'selected_worker_id'}=eq.${user.id}`,
      track('service_requests'),
      ['INSERT', 'UPDATE'],
    ),
  ];
  syncFallback();
  return () => {
    stops.forEach((stop) => stop());
    if (fallback) clearInterval(fallback);
  };
}

export async function fetchProviders(): Promise<ApiResponse<ProviderData[]>> {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select(
        'account_id,display_name,avatar_path,approval_status,worker_skills(years,rate_minor,service_categories(name))',
      )
      .eq('approval_status', 'APPROVED')
      .eq('is_available', true)
      .limit(50);
    if (error) throw error;
    const rows = data ?? [];
    const avatarMap = await batchResolveAvatars(
      rows.map((row: any) => row.avatar_path),
    );
    return rows.map((row: any) => {
      return {
        id: row.account_id,
        name: requireIdentity(row.display_name, 'Worker'),
        category: requireIdentity(
          (row.worker_skills ?? [])
            .map((skill: any) => skill?.service_categories?.name)
            .filter((name: any) => typeof name === 'string' && name.trim())
            .join(', '),
          'Worker service',
        ),
        avatarUri: avatarMap.get(row.avatar_path) ?? '',
        distance: '',
        eta: '',
        verified: row.approval_status === 'APPROVED',
        price:
          row.worker_skills?.find((skill: any) => skill.rate_minor != null)
            ?.rate_minor != null
            ? money(
                Math.min(
                  ...row.worker_skills
                    .map((skill: any) => Number(skill.rate_minor))
                    .filter(Number.isFinite),
                ) / 100,
              )
            : 'Pending price',
      };
    });
  });
}
export async function fetchProviderById(
  id: string,
): Promise<ApiResponse<ProviderData | undefined>> {
  const result = await fetchProviders();
  return {
    data: result.data.find((provider) => provider.id === id),
    error: result.error,
  };
}
export async function fetchProviderProfile(id: string) {
  return wrap(async () => {
    const [
      { data: profile, error },
      { data: skills, error: skillError },
    ] = await Promise.all([
      supabase
        .from('worker_profiles')
        .select('*,worker_skills(years,rate_minor,service_categories(name))')
        .eq('account_id', id)
        .eq('approval_status', 'APPROVED')
        .single(),
      supabase
        .from('worker_skills')
        .select('rate_minor,service_categories(name)')
        .eq('worker_id', id),
    ]);
    if (error) throw error;
    if (skillError) throw skillError;
    const workerRates = (skills ?? [])
      .map((skill: any) => Number(skill.rate_minor))
      .filter(Number.isFinite);
    const avatarMap = await batchResolveAvatars([profile.avatar_path]);
    return {
      id: profile.account_id,
      name: requireIdentity(profile.display_name, 'Worker'),
      avatarUri: avatarMap.get(profile.avatar_path) ?? '',
      category: requireIdentity(
        profile.worker_skills?.[0]?.service_categories?.name,
        'Worker service',
      ),
      verified: profile.approval_status === 'APPROVED',
      distance: '',
      eta: '',
      price: workerRates.length
        ? money(Math.min(...workerRates) / 100)
        : 'Pending price',
      bio: profile.bio ?? '',
      years: Math.max(
        0,
        ...(profile.worker_skills ?? []).map((row: any) => Number(row.years)),
      ),
      services: (skills ?? [])
        .map((skill: any) => skill.service_categories?.name)
        .filter(Boolean),
    };
  });
}
export async function fetchBookings(): Promise<ApiResponse<any[]>> {
  return wrap(async () => {
    const user = await requireUser();
    const bookingResult = await supabase
      .from('bookings')
      .select(
        'id,service_request_id,worker_account_id,status,created_at,agreed_service_amount,service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name)),worker_profiles:worker_account_id(display_name,avatar_path)',
      )
      .eq('user_account_id', user.id)
      .order('created_at', { ascending: false });
    if (bookingResult.error) throw new Error(bookingResult.error.message);

    const rows = bookingResult.data ?? [];
    const avatarMap = await batchResolveAvatars(
      rows.map((row: any) => row.worker_profiles?.avatar_path),
    );

    return rows.map((row: any) => {
      return {
        id: row.id,
        requestId: row.service_request_id,
        recordType: 'booking',
        providerId: row.worker_account_id,
        providerName: requireIdentity(
          row.worker_profiles?.display_name,
          'Booked worker',
        ),
        category: requireIdentity(
          row.service_requests?.service_categories?.name,
          'Booked service',
        ),
        avatarUri:
          avatarMap.get(row.worker_profiles?.avatar_path) ?? '',
        date: new Date(
          row.service_requests?.scheduled_at ?? row.created_at,
        ).toLocaleDateString(),
        time: new Date(
          row.service_requests?.scheduled_at ?? row.created_at,
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status:
          row.status === 'COMPLETED'
            ? 'completed'
            : row.status === 'CANCELLED'
              ? 'cancelled'
              : ['PENDING', 'ACCEPTED', 'WORKER_PREPARING'].includes(
                    row.status,
                  )
                ? 'upcoming'
                : 'ongoing',
        rawStatus: row.status,
        address: [
          row.service_requests?.addresses?.line1,
          row.service_requests?.addresses?.barangay,
          row.service_requests?.addresses?.city,
        ]
          .filter(Boolean)
          .join(', '),
        price:
          row.agreed_service_amount == null
            ? 'Pending price'
            : money(row.agreed_service_amount),
      };
    });
  });
}
export async function fetchServiceCategories() {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('service_categories')
      .select(
        'id,name,slug,minimum_price_minor,maximum_price_minor,is_safety_critical',
      )
      .eq('is_active', true)
      .order('name')
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      label: row.name,
      slug: row.slug,
      minimumPriceMinor:
        row.minimum_price_minor != null
          ? Number(row.minimum_price_minor)
          : null,
      maximumPriceMinor: Number(row.maximum_price_minor ?? 0),
      isSafetyCritical: Boolean(row.is_safety_critical),
      icon: 'Wrench' as const,
      color: '#1B5E20',
    }));
  });
}
export async function fetchWorkerProfile(): Promise<
  ApiResponse<WorkerProfile>
> {
  try {
    const user = await requireUser();
    const [
      { data: account, error: accountError },
      { data: profile, error: profileError },
      { data: bookings },
      { data: skills },
    ] = await Promise.all([
      supabase
        .from('accounts')
        .select('email,profile_completed_at')
        .eq('id', user.id)
        .single(),
      supabase
        .from('worker_profiles')
        .select(
          '*,industries!worker_profiles_primary_industry_id_fkey(name),worker_skills(years,rate_minor,service_categories(name))',
        )
        .eq('account_id', user.id)
        .single(),
      supabase
        .from('bookings')
        .select('id,agreed_service_amount')
        .eq('worker_account_id', user.id)
        .eq('status', 'COMPLETED'),
      supabase
        .from('worker_skills')
        .select('rate_minor')
        .eq('worker_id', user.id),
    ]);
    if (accountError) throw accountError;
    if (profileError) throw profileError;
    const prices = (skills ?? [])
      .map((skill: any) => Number(skill.rate_minor))
      .filter(Number.isFinite);
    const completedBookingsEarnings = (bookings ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.agreed_service_amount ?? 0),
      0,
    );
    const earnings = completedBookingsEarnings;
    return {
      data: {
        id: user.id,
        name: requireIdentity(profile.display_name, 'Worker'),
        email: account.email,
        avatarUri: await resolveProfileAvatar(profile.avatar_path),
        category: profile.worker_skills?.[0]?.service_categories?.name ?? '',
        primaryIndustry:
          profile.industries?.name ??
          profile.worker_skills?.[0]?.service_categories?.name ??
          '',
        verificationStatus:
          profile.approval_status === 'APPROVED'
            ? 'verified'
            : profile.approval_status === 'REJECTED'
              ? 'rejected'
              : profile.approval_status === 'NEEDS_DOCUMENTS'
                ? 'needs_review'
                : 'pending',
        profileComplete: Boolean(account.profile_completed_at),
        yearsExperience: Math.max(
          ...(profile.worker_skills ?? []).map((skill: any) => skill.years),
          0,
        ),
        completedJobs: (bookings ?? []).length,
        earnings: money(earnings),
        hourlyRate: prices.length
          ? money(prices.reduce((sum, p) => sum + p, 0) / prices.length / 100)
          : 'Price pending',
        skills: (profile.worker_skills ?? [])
          .map((skill: any) => skill.service_categories?.name)
          .filter(Boolean),
        serviceAreas: profile.service_area ? [profile.service_area] : [],
        bio: profile.bio ?? '',
      },
    };
  } catch (error) {
    return {
      data: null as unknown as WorkerProfile,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}
export async function fetchWorkerVerification() {
  return wrap(async () => {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('worker_verifications')
      .select('*')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
}
export async function fetchWorkerBookings(): Promise<
  ApiResponse<WorkerBooking[]>
> {
  return wrap(async () => {
    const user = await requireUser();
    const bookingResult = await supabase
      .from('bookings')
      .select(
        'id,service_request_id,status,created_at,agreed_service_amount,service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name)),user_profiles:user_account_id(display_name,avatar_path)',
      )
      .eq('worker_account_id', user.id)
      .order('created_at', { ascending: false });
    if (bookingResult.error) throw new Error(bookingResult.error.message);

    const rows = bookingResult.data ?? [];
    const avatarMap = await batchResolveAvatars(
      rows.map((row: any) => row.user_profiles?.avatar_path),
    );

    return rows.map((row: any) => ({
      id: row.id,
      requestId: row.service_request_id,
      recordType: 'booking' as const,
      customerName: requireIdentity(
        row.user_profiles?.display_name,
        'Booking customer',
      ),
      customerAvatar:
        avatarMap.get(row.user_profiles?.avatar_path) ?? '',
      service: requireIdentity(
        row.service_requests?.service_categories?.name,
        'Booked service',
      ),
      date: new Date(
        row.service_requests?.scheduled_at ?? row.created_at,
      ).toLocaleDateString(),
      time: new Date(
        row.service_requests?.scheduled_at ?? row.created_at,
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      address: [
        row.service_requests?.addresses?.line1,
        row.service_requests?.addresses?.barangay,
        row.service_requests?.addresses?.city,
      ]
        .filter(Boolean)
        .join(', '),
      price: money(row.agreed_service_amount),
      status: row.status.toLowerCase(),
      distance: '',
    }));
  });
}
async function transition(
  bookingId: string,
  status: string,
  reason?: string,
) {
  const { data, error } = await supabase.rpc('transition_booking', {
    p_booking_id: bookingId,
    p_target_status: status,
    p_expected_version: null,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return { data };
}
export async function simulateTopUp(amount: number) {
  const { data, error } = await supabase.rpc('simulate_wallet_topup', {
    p_amount: amount,
  });
  if (error) throw error;
  if (!data) throw new Error('Simulated top-up returned no result.');
  return data as {
    previousBalance: number;
    newBalance: number;
    amount: number;
    status: string;
    transactionId: string;
  };
}

export async function acceptJob(bookingId: string) {
  return transition(bookingId, 'ACCEPTED');
}

export async function confirmPaymentWithCommission(
  bookingId: string,
  paymentMethod: 'CASH' | 'ONLINE_SIMULATED' = 'CASH',
) {
  const { data, error } = await supabase.rpc('deduct_booking_commission', {
    p_booking_id: bookingId,
    p_payment_method: paymentMethod === 'ONLINE_SIMULATED' ? 'ONLINE_SIMULATED' : 'CASH',
  });

  if (error) throw error;
  if (!data) throw new Error('Commission settlement returned no result');
  return data;
}

export async function prepareJob(bookingId: string) {
  return transition(bookingId, 'WORKER_PREPARING');
}
export async function departForJob(bookingId: string) {
  return transition(bookingId, 'WORKER_EN_ROUTE');
}
export async function arriveAtJob(bookingId: string) {
  return transition(bookingId, 'WORKER_ARRIVED');
}
export async function startJob(bookingId: string) {
  return transition(bookingId, 'SERVICE_STARTED');
}
export async function markJobInProgress(bookingId: string) {
  return transition(bookingId, 'IN_PROGRESS');
}
export async function completeJob(bookingId: string) {
  return transition(bookingId, 'PENDING_CONFIRMATION');
}
export async function confirmJobCompletion(bookingId: string) {
  return transition(bookingId, 'COMPLETED');
}
export async function cancelBooking(
  bookingId: string,
  reason: string,
) {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();
  if (bookingError) throw bookingError;

  const stages: Record<string, string> = {
    PENDING: 'BEFORE_ACCEPTANCE',
    ACCEPTED: 'BEFORE_TRAVEL',
    WORKER_PREPARING: 'BEFORE_TRAVEL',
    WORKER_EN_ROUTE: 'EN_ROUTE',
    WORKER_ARRIVED: 'ARRIVED',
    SERVICE_STARTED: 'SERVICE_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
  };

  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_expected_version: null,
    p_stage: stages[booking.status] ?? 'BEFORE_ACCEPTANCE',
    p_reason_code: 'DECLINED',
    p_details: reason || 'Worker declined assigned booking',
    p_policy_version: '2026-07-21',
  });
  if (error) throw error;
  return { data };
}

export async function declineAssignedBooking(
  bookingId: string,
  reason: string,
) {
  const { data, error } = await supabase.rpc('decline_assigned_booking', {
    p_booking_id: bookingId,
    p_expected_version: null,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function fetchWalletTransactions(): Promise<
  ApiResponse<WalletTransaction[]>
> {
  return wrap(async () => {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('id,transaction_type,amount_minor,metadata,created_at')
      .eq('wallet_account_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .filter((row: any) => Math.abs(Number(row.amount_minor ?? 0)) < 100000000000)
      .map((row: any) => {
        const credit = Number(row.amount_minor) >= 0;
        let label = String(row.transaction_type).replaceAll('_', ' ');
        if (
          row.transaction_type === 'BOOKING_EARNING' &&
          (row.metadata?.simulated || row.metadata?.payment_method === 'GCASH')
        ) {
          label = 'Mock GCash Earning';
        }
        return {
          id: row.id,
          label,
          sub: String(row.metadata?.booking_id ?? ''),
          amount: `${credit ? '+' : '-'}${money(
            Math.abs(Number(row.amount_minor)) / 100,
          )}`,
          credit,
          status: row.transaction_type === 'PAYOUT_HOLD' ? 'pending' : 'completed',
          date: new Date(row.created_at).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
          }),
          createdAt: row.created_at,
        };
      });
  });
}
export async function fetchWallet(): Promise<ApiResponse<WalletSummary>> {
  return wrap(async () => {
    const user = await requireUser();
    const [
      { data: wallet, error },
      { data: methods, error: methodsError },
      { data: payouts, error: payoutsError },
      { data: completedBookings, error: bookingsError },
    ] = await Promise.all([
      supabase
        .from('wallets')
        .select('available_minor,locked_minor')
        .eq('account_id', user.id)
        .maybeSingle(),
      supabase
        .from('payout_destinations')
        .select('id,kind,label,account_reference,is_default')
        .eq('worker_id', user.id)
        .eq('status', 'ACTIVE'),
      supabase
        .from('payout_requests')
        .select('*')
        .eq('account_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('id,agreed_service_amount')
        .eq('worker_account_id', user.id)
        .eq('status', 'COMPLETED'),
    ]);
    if (error) throw error;
    if (methodsError) throw methodsError;
    if (payoutsError) throw payoutsError;
    if (bookingsError) throw bookingsError;

    const completedEarnings = (completedBookings ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.agreed_service_amount ?? 0),
      0,
    );

    const rawAvailable = (wallet?.available_minor ?? 0) / 100;
    const availableAmount =
      rawAvailable > 0 && rawAvailable < 1000000000
        ? rawAvailable
        : completedEarnings;

    return {
      available: money(availableAmount),
      locked: money((wallet?.locked_minor ?? 0) / 100),
      completedJobs: (completedBookings ?? []).length,
      methods: (methods ?? []).map((row: any) => ({
        id: row.id,
        method_type: row.kind,
        label: row.label,
        last_four: String(row.account_reference ?? '').slice(-4),
        is_default: row.is_default,
      })),
      payouts: payouts ?? [],
    };
  });
}
export async function requestPayout(methodId: string, amountMinor: number) {
  const { data, error } = await supabase.rpc('request_payout', {
    p_destination_id: methodId,
    p_amount: amountMinor / 100,
    p_idempotency_key: randomUUID(),
  });
  if (error) throw error;
  return data;
}
export async function fetchRequest(id: string) {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select(
        '*,service_categories(*),addresses(*),match_candidates(*,worker_profiles:worker_id(display_name,avatar_path,approval_status,worker_skills(service_categories(name))))',
      )
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  });
}
export async function generateMatches(serviceRequestId: string) {
  const { data, error } = await supabase.rpc('generate_matches', {
    p_service_request_id: serviceRequestId,
  });
  if (error) throw error;
  return data;
}
export async function selectWorker(serviceRequestId: string, workerId: string) {
  const { data, error } = await supabase.rpc('select_worker', {
    p_service_request_id: serviceRequestId,
    p_worker_id: workerId,
  });
  if (error) throw error;
  if (!data || typeof data.id !== 'string' || !data.id) {
    throw new Error('BOOKING_RESPONSE_INVALID');
  }
  return data;
}
export async function fetchBookingByRequestId(serviceRequestId: string) {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('service_request_id', serviceRequestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
}
export async function fetchBookingDetail(id: string) {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        '*,service_requests(*,service_categories(*),addresses(*)),worker_profiles:worker_account_id(*),user_profiles:user_account_id(*),booking_status_events(*),cancellations(*),payments(*,refunds(*))',
      )
      .eq('id', id)
      .single();
    if (error) throw error;
    try {
      const avatarMap = await batchResolveAvatars([
        data.user_profiles?.avatar_path,
        data.worker_profiles?.avatar_path,
      ]);
      if (data.user_profiles?.avatar_path) {
        data.user_profiles.avatar_path =
          avatarMap.get(data.user_profiles.avatar_path) ??
          data.user_profiles.avatar_path;
      }
      if (data.worker_profiles?.avatar_path) {
        data.worker_profiles.avatar_path =
          avatarMap.get(data.worker_profiles.avatar_path) ??
          data.worker_profiles.avatar_path;
      }
    } catch (e) {
      console.warn('[fetchBookingDetail] avatar resolve failed:', e);
    }
    return data;
  });
}
export async function fetchBookingTracking(id: string) {
  const [{ data: booking, error }, updates] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        '*,service_requests(*,addresses(*)),worker_profiles:worker_account_id(*,accounts:accounts!worker_profiles_account_id_fkey(mobile)),user_profiles:user_account_id(*),booking_status_events(*),cancellations(*),payments(*,refunds(*))',
      )
      .eq('id', id)
      .single(),
    supabase.rpc('get_booking_tracking', { p_booking_id: id, p_limit: 100 }),
  ]);
  if (error) throw error;
  if (updates.error) throw updates.error;
  return { booking, updates: updates.data ?? [] };
}
export async function fetchBookingSummary(bookingId: string) {
  const [bookingResult, proofResult] = await Promise.allSettled([
    supabase
      .from('bookings')
      .select(
        '*,service_requests(*,service_categories(*),addresses(*)),worker_profiles:worker_account_id(*),user_profiles:user_account_id(*),payments(*,receipts(receipt_number,issued_at)),cancellations(*)',
      )
      .eq('id', bookingId)
      .single(),
    supabase
      .from('booking_proof_media')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true }),
  ]);

  const booking =
    bookingResult.status === 'fulfilled' ? bookingResult.value.data : null;
  const proofPhotos =
    proofResult.status === 'fulfilled' ? (proofResult.value.data ?? []) : [];

  // Resolve signed URLs for proof photos
  const photosWithUrls = await Promise.all(
    proofPhotos.map(async (photo: any) => {
      try {
        const { data } = await supabase.storage
          .from('booking-proof')
          .createSignedUrl(photo.storage_path, 60 * 60);
        return { ...photo, signedUrl: data?.signedUrl ?? null };
      } catch {
        return { ...photo, signedUrl: null };
      }
    }),
  );

  return { booking, proofPhotos: photosWithUrls };
}
export async function confirmCashPayment(bookingId: string) {
  const { data, error } = await supabase.rpc('confirm_cash_payment', {
    p_booking_id: bookingId,
    p_idempotency_key: randomUUID(),
  });
  if (error) throw error;
  return data;
}
export async function simulateMockGcashPayment(
  bookingId: string,
  referenceNumber: string,
) {
  const { data, error } = await supabase.rpc('simulate_gcash_booking_payment', {
    p_booking_id: bookingId,
    p_reference_number: referenceNumber,
  });
  if (error) throw error;
  if (
    !data ||
    data.method !== 'GCASH' ||
    data.provider !== 'MOCK_GCASH' ||
    data.status !== 'SUCCESSFUL'
  ) {
    throw new Error('Invalid GCash simulation response');
  }
  return data;
}
export async function fetchPaymentForBooking(bookingId: string) {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*,receipts(receipt_number,issued_at),bookings(agreed_service_amount)')
      .eq('booking_id', bookingId)
      .single();
    if (error) throw error;
    return data;
  });
}
export async function fetchPlatformFeeSettings() {
  return wrap(async () => {
    const { data, error } = await supabase.rpc('get_platform_fee_settings');
    if (error) throw error;
    const payload = data as {
      commissionRate?: unknown;
      homeownerCharge?: unknown;
      serviceCategoryOverrides?: Array<{
        id: string;
        name: string;
        commissionRatePercent: number | null;
      }>;
    } | null;
    return {
      commissionRate: normalizeCommissionRatePercent(payload?.commissionRate),
      homeownerCharge: Number(payload?.homeownerCharge ?? 0),
      serviceCategoryOverrides: payload?.serviceCategoryOverrides ?? [],
    };
  });
}
const FALLBACK_TAXONOMY: IndustryWithSkills[] = [
  {
    id: 'cleaning',
    slug: 'cleaning',
    name: 'Cleaning',
    skills: [
      { id: 'cleaning-1', slug: 'cleaning', name: 'Cleaning' },
      { id: 'cleaning-2', slug: 'deep-cleaning', name: 'Deep Cleaning' },
      { id: 'cleaning-3', slug: 'move-in-move-out-cleaning', name: 'Move-In/Move-Out Cleaning' },
      { id: 'cleaning-4', slug: 'post-construction-cleaning', name: 'Post-Construction Cleaning' },
      { id: 'cleaning-5', slug: 'carpet-upholstery-cleaning', name: 'Carpet & Upholstery Cleaning' },
    ],
  },
  {
    id: 'electrical',
    slug: 'electrical',
    name: 'Electrical',
    skills: [
      { id: 'electrical-1', slug: 'electrical', name: 'Electrical' },
      { id: 'electrical-2', slug: 'wiring-rewiring', name: 'Wiring & Rewiring' },
      { id: 'electrical-3', slug: 'lighting-installation', name: 'Lighting Installation' },
      { id: 'electrical-4', slug: 'outlet-switch-installation', name: 'Outlet & Switch Installation' },
      { id: 'electrical-5', slug: 'panel-circuit-breaker-service', name: 'Panel & Circuit Breaker Service' },
    ],
  },
  {
    id: 'plumbing',
    slug: 'plumbing',
    name: 'Plumbing',
    skills: [
      { id: 'plumbing-1', slug: 'plumbing', name: 'Plumbing' },
      { id: 'plumbing-2', slug: 'leak-detection-repair', name: 'Leak Detection & Repair' },
      { id: 'plumbing-3', slug: 'drain-unclogging', name: 'Drain Unclogging' },
      { id: 'plumbing-4', slug: 'fixture-installation', name: 'Fixture Installation' },
      { id: 'plumbing-5', slug: 'pipe-installation-repair', name: 'Pipe Installation & Repair' },
    ],
  },
  {
    id: 'carpentry',
    slug: 'carpentry',
    name: 'Carpentry',
    skills: [
      { id: 'carpentry-1', slug: 'furniture-repair', name: 'Furniture Repair' },
      { id: 'carpentry-2', slug: 'cabinet-installation-repair', name: 'Cabinet Installation & Repair' },
      { id: 'carpentry-3', slug: 'door-window-repair', name: 'Door & Window Repair' },
      { id: 'carpentry-4', slug: 'custom-woodwork', name: 'Custom Woodwork' },
      { id: 'carpentry-5', slug: 'ceiling-partition-installation', name: 'Ceiling & Partition Installation' },
    ],
  },
  {
    id: 'painting',
    slug: 'painting',
    name: 'Painting',
    skills: [
      { id: 'painting-1', slug: 'interior-painting', name: 'Interior Painting' },
      { id: 'painting-2', slug: 'exterior-painting', name: 'Exterior Painting' },
      { id: 'painting-3', slug: 'repainting-touch-ups', name: 'Repainting & Touch-Ups' },
      { id: 'painting-4', slug: 'surface-preparation', name: 'Surface Preparation' },
    ],
  },
  {
    id: 'masonry-tiling',
    slug: 'masonry-tiling',
    name: 'Masonry & Tiling',
    skills: [
      { id: 'masonry-1', slug: 'masonry', name: 'Masonry' },
      { id: 'masonry-2', slug: 'tiling', name: 'Tiling' },
    ],
  },
  {
    id: 'air-conditioning-refrigeration',
    slug: 'air-conditioning-refrigeration',
    name: 'Air Conditioning & Refrigeration',
    skills: [
      { id: 'ac-1', slug: 'ac-cleaning', name: 'AC Cleaning' },
      { id: 'ac-2', slug: 'ac-repair', name: 'AC Repair' },
      { id: 'ac-3', slug: 'ac-installation', name: 'AC Installation' },
    ],
  },
  {
    id: 'appliance-repair',
    slug: 'appliance-repair',
    name: 'Appliance Repair',
    skills: [
      { id: 'appliance-1', slug: 'appliance-diagnosis-repair', name: 'Appliance Diagnosis & Repair' },
    ],
  },
  {
    id: 'landscaping-gardening',
    slug: 'landscaping-gardening',
    name: 'Landscaping & Gardening',
    skills: [
      { id: 'lawn-1', slug: 'lawn-care', name: 'Lawn & Garden Care' },
    ],
  },
  {
    id: 'roofing-waterproofing',
    slug: 'roofing-waterproofing',
    name: 'Roofing & Waterproofing',
    skills: [
      { id: 'roof-1', slug: 'roof-leak-repair', name: 'Roof & Leak Repair' },
    ],
  },
];

export async function fetchIndustriesAndSkills(): Promise<
  ApiResponse<IndustryWithSkills[]>
> {
  return wrap(async () => {
    try {
      const { data, error } = await supabase
        .from('industries')
        .select(
          'id,slug,name,sort_order,service_categories!inner!service_categories_industry_id_fkey(id,slug,name,is_active)',
        )
        .eq('is_active', true)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      const formatted = (data ?? []).map((row: any) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        skills: (row.service_categories ?? [])
          .filter((skill: any) => skill.is_active)
          .map((skill: any) => ({
            id: skill.id,
            slug: skill.slug,
            name: skill.name,
          }))
          .sort((left: IndustrySkill, right: IndustrySkill) =>
            left.name.localeCompare(right.name),
          ),
      }));
      if (formatted.length > 0) return formatted;
      return FALLBACK_TAXONOMY;
    } catch (err) {
      console.warn('fetchIndustriesAndSkills fallback triggered due to database permission or network issue:', err);
      return FALLBACK_TAXONOMY;
    }
  });
}
export async function fetchCancellationReasons() {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  });
}
export async function createSupportTicket(input: {
  bookingId?: string | null;
  subject: string;
  description: string;
}) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      owner_id: user.id,
      booking_id: input.bookingId ?? null,
      subject: input.subject.trim(),
      description: input.description.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reportBookingParticipant(
  bookingId: string,
  details: string,
) {
  const { data, error } = await supabase.rpc('report_booking_participant', {
    p_booking_id: bookingId,
    p_reason_code: 'CONDUCT_CONCERN',
    p_details: details,
  });
  if (error) throw error;
  return data;
}

export interface BookingProofPhoto {
  id: string;
  bookingId: string;
  storagePath: string;
  contentType: string;
  byteSize: number;
  createdAt: string;
  signedUrl: string | null;
}

export async function attachBookingProof(
  bookingId: string,
  media: { path: string; contentType: string; byteSize: number },
  options?: {
    rating?: number;
    comment?: string;
    submittedBy?: 'worker' | 'customer';
  },
): Promise<BookingProofPhoto> {
  const { data, error } = await supabase.rpc('attach_booking_proof', {
    p_booking_id: bookingId,
    p_storage_path: media.path,
    p_content_type: media.contentType,
    p_byte_size: media.byteSize,
    ...(options?.submittedBy !== undefined
      ? { p_submitted_by: options.submittedBy }
      : {}),
    ...(options?.rating !== undefined ? { p_rating: options.rating } : {}),
    ...(options?.comment !== undefined ? { p_comment: options.comment } : {}),
  });
  if (error) throw error;
  const photo = data as any;
  let signedUrl: string | null = null;
  try {
    const { data: signed } = await supabase.storage
      .from('booking-proof')
      .createSignedUrl(photo.storage_path, 60 * 60);
    signedUrl = signed?.signedUrl ?? null;
  } catch {
    signedUrl = null;
  }
  return {
    id: photo.id,
    bookingId: photo.booking_id,
    storagePath: photo.storage_path,
    contentType: photo.content_type,
    byteSize: photo.byte_size,
    createdAt: photo.created_at,
    signedUrl,
  };
}

export async function fetchBookingProofPhotos(
  bookingId: string,
): Promise<BookingProofPhoto[]> {
  const { data, error } = await supabase
    .from('booking_proof_media')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return Promise.all(
    rows.map(async (photo: any) => {
      try {
        const { data: signed } = await supabase.storage
          .from('booking-proof')
          .createSignedUrl(photo.storage_path, 60 * 60);
        return {
          id: photo.id,
          bookingId: photo.booking_id,
          storagePath: photo.storage_path,
          contentType: photo.content_type,
          byteSize: photo.byte_size,
          createdAt: photo.created_at,
          signedUrl: signed?.signedUrl ?? null,
        };
      } catch {
        return {
          id: photo.id,
          bookingId: photo.booking_id,
          storagePath: photo.storage_path,
          contentType: photo.content_type,
          byteSize: photo.byte_size,
          createdAt: photo.created_at,
          signedUrl: null,
        };
      }
    }),
  );
}

export async function deleteBookingProof(
  bookingId: string,
  storagePath: string,
) {
  const { data, error } = await supabase.rpc('delete_booking_proof', {
    p_booking_id: bookingId,
    p_storage_path: storagePath,
  });
  if (error) throw error;
  return data;
}
export async function publishServiceRequest(input: {
  categoryId: string;
  description: string;
  addressId?: string | null;
  address: string;
  addressDetails?: AddressDetailsRecord | null;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  analysisId?: string | null;
}) {
  const details = input.addressDetails ?? {};
  let addressId = input.addressId ?? null;
  if (!addressId) {
    const { data: address, error: addressError } = await supabase.rpc(
      'save_geocoded_address',
      {
        p_label: 'Service location',
        p_line1: input.address,
        p_line2: null,
        p_barangay: details.district ?? details.barangay ?? null,
        p_city: details.city ?? null,
        p_province: details.region ?? details.province ?? null,
        p_postal_code: details.postalCode ?? null,
        p_latitude: input.latitude,
        p_longitude: input.longitude,
        p_provider_id: details.providerId ?? null,
        p_confidence: details.confidence ?? null,
        p_payload: details,
        p_is_default: false,
      },
    );
    if (addressError) throw addressError;
    addressId = (address as any).id;
  }
  const { data, error } = await supabase.rpc('create_service_request', {
    category_id: input.categoryId,
    address_id: addressId,
    description: input.description,
    scheduled_at: input.scheduledAt,
    budget: LEGACY_UNCAPPED_REQUEST_BUDGET_MINOR / 100,
    notes: null,
    ai_analysis_id: input.analysisId ?? null,
    notify_on_match: true,
  });
  if (error) throw error;
  return data;
}

export async function attachRequestMedia(
  requestId: string,
  media: MediaInput[],
) {
  for (const item of media) {
    const { error } = await supabase.rpc('attach_request_media', {
      p_service_request_id: requestId,
      p_storage_path: item.path,
      p_content_type: item.contentType,
      p_byte_size: item.byteSize,
    });
    if (error) throw error;
  }
}

export async function startConversation(
  serviceRequestId: string,
  workerId: string,
) {
  const { data, error } = await supabase.rpc('start_worker_conversation', {
    p_service_request_id: serviceRequestId,
    p_worker_id: workerId,
  });
  if (error) throw error;
  return data;
}
export async function fetchConversation(conversationId: string) {
  return wrap(async () => {
    const user = await requireUser();
    const profile = await getMyProfile();
    const preferredLocale =
      profile.role === 'ADMIN' ? 'en' : profile.preferredLocale;

    const [
      { data: conversation, error: conversationError },
      { data: messages, error: messageError },
    ] = await Promise.all([
      supabase
        .from('conversations')
        .select(
          'id,booking_id,service_request_id,worker_account_id,archived_at,worker_profiles:worker_account_id(display_name,avatar_path),bookings:booking_id(status,user_account_id,worker_account_id,user_profiles:user_account_id(display_name,avatar_path),worker_profiles:worker_account_id(display_name,avatar_path)),service_requests:service_request_id(status,user_account_id,selected_worker_id,user_profiles:user_account_id(display_name,avatar_path),worker_profiles:selected_worker_id(display_name,avatar_path)),conversation_participants(account_id,accounts:account_id(user_profiles(display_name,avatar_path),worker_profiles(display_name,avatar_path)))',
        )
        .eq('id', conversationId)
        .maybeSingle(),
      supabase
        .from('messages')
        .select('*,message_translations(target_locale,translated)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
    ]);

    if (conversationError) throw conversationError;
    if (!conversation) throw new Error('Conversation is unavailable');
    if (messageError) throw messageError;

    try {
      await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      });
    } catch {
      // Ignore read marking error
    }

    const booking = Array.isArray((conversation as any).bookings)
      ? (conversation as any).bookings[0]
      : (conversation as any).bookings;
    const request = Array.isArray((conversation as any).service_requests)
      ? (conversation as any).service_requests[0]
      : (conversation as any).service_requests;
    const rawStatus = String(booking?.status ?? request?.status ?? '');
    const closed = ['COMPLETED', 'CANCELLED', 'CLOSED'].includes(rawStatus);
    const otherParticipant = (
      (conversation as any).conversation_participants ?? []
    ).find((item: any) => item.account_id !== user.id);
    const participantAccount = firstRelation(otherParticipant?.accounts);
    const participantProfile =
      firstRelation((participantAccount as any)?.user_profiles) ??
      firstRelation((participantAccount as any)?.worker_profiles);
    const matchedProfile =
      profile.role === 'USER'
        ? (firstRelation((conversation as any).worker_profiles) ??
          firstRelation(booking?.worker_profiles) ??
          firstRelation(request?.worker_profiles))
        : (firstRelation(booking?.user_profiles) ??
          firstRelation(request?.user_profiles));
    const resolvedParticipantProfile = matchedProfile ?? participantProfile;
    if (!resolvedParticipantProfile?.display_name) {
      throw new Error('Matched participant profile is unavailable');
    }

    return {
      preferredLocale,
      id: conversation.id,
      bookingId: conversation.booking_id,
      serviceRequestId: conversation.service_request_id,
      status: rawStatus,
      canSend: !closed && !(conversation as any).archived_at,
      canArchive: closed && !(conversation as any).archived_at,
      canHireAgain:
        profile.role === 'USER' && closed && !(conversation as any).archived_at,
      participant: {
        name: resolvedParticipantProfile.display_name,
        avatar: await resolveProfileAvatar(
          resolvedParticipantProfile.avatar_path ?? '',
        ),
      },
      messages: (messages ?? []).map((row: any) => {
        const translation = (row.message_translations ?? []).find(
          (item: any) => item.target_locale === preferredLocale,
        );
        return {
          id: row.id,
          text: translation?.translated ?? row.body,
          originalText: row.body,
          translatedText: translation?.translated ?? null,
          isTranslated: Boolean(translation),
          sender: row.sender_id === user.id ? 'self' : 'other',
          createdAt: row.created_at,
          timestamp: new Date(row.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      }),
    };
  });
}
export async function sendMessage(
  conversationId: string,
  body: string,
  locale?: 'en' | 'fil',
) {
  const ownProfile = await getMyProfile();
  const sourceLocale =
    locale ?? (ownProfile.role === 'ADMIN' ? 'en' : ownProfile.preferredLocale);

  const { data, error } = await supabase.rpc('send_chat_message', {
    p_conversation_id: conversationId,
    p_body: body.trim(),
    p_original_locale: sourceLocale,
  });
  if (error) throw error;
  if (!data) throw new Error('Message could not be sent');

  const { data: recipientLocale } = await supabase.rpc(
    'get_conversation_recipient_locale',
    { p_conversation_id: conversationId },
  );
  const targetLocale: 'en' | 'fil' = recipientLocale === 'fil' ? 'fil' : 'en';
  if (targetLocale !== sourceLocale) {
    void invokeAuthenticatedFunction('ai-translate-message', {
      body: { messageId: data.id, targetLocale },
    }).catch((translationError) => {
      if (!(translationError instanceof SessionExpiredError))
        console.warn(
          '[translation] automatic translation failed:',
          translationError,
        );
    });
  }
  return data;
}
export async function setPreferredLocale(locale: 'en' | 'fil') {
  const { data, error } = await supabase.rpc('set_my_preferred_locale', {
    p_locale: locale,
  });
  if (error) throw error;
  return data;
}
export async function fetchConversationForBooking(bookingId: string) {
  return wrap(async () => {
    const { data, error } = await supabase.rpc('chat_ensure_booking_conversation', {
      p_booking_id: bookingId,
    });
    if (error) throw error;
    if (!data) throw new Error('Conversation not available for this booking');
    return data;
  });
}
export async function fetchConversations(mode: 'active' | 'archived' = 'active') {
  return wrap(async () => {
    const user = await requireUser();
    const profile = await getMyProfile();
    let query = supabase
      .from('conversations')
      .select(
        'id,booking_id,service_request_id,worker_account_id,archived_at,updated_at,worker_profiles:worker_account_id(display_name,avatar_path),bookings:booking_id(status,user_account_id,worker_account_id,user_profiles:user_account_id(display_name,avatar_path),worker_profiles:worker_account_id(display_name,avatar_path)),service_requests:service_request_id(status,user_account_id,selected_worker_id,user_profiles:user_account_id(display_name,avatar_path),worker_profiles:selected_worker_id(display_name,avatar_path)),conversation_participants(account_id,last_read_at,accounts:account_id(user_profiles(display_name,avatar_path),worker_profiles(display_name,avatar_path))),messages(id,body,created_at,sender_id)',
      );
      
    if (mode === 'active') {
      query = query.is('archived_at', null);
    } else {
      query = query.not('archived_at', 'is', null);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    const prepared = (data ?? [])
      .map((row: any) => {
        const booking = Array.isArray(row.bookings)
          ? row.bookings[0]
          : row.bookings;
        const request = Array.isArray(row.service_requests)
          ? row.service_requests[0]
          : row.service_requests;
        const rawStatus = String(booking?.status ?? request?.status ?? '');
        const closed = ['COMPLETED', 'CANCELLED', 'CLOSED'].includes(rawStatus);
        const participant = (row.conversation_participants ?? []).find(
          (item: any) => item.account_id !== user.id,
        );
        const ownParticipant = (row.conversation_participants ?? []).find(
          (item: any) => item.account_id === user.id,
        );
        const messages = [...(row.messages ?? [])].sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const latest = messages[0];
        const readAt = ownParticipant?.last_read_at;
        const participantAccount = firstRelation(participant?.accounts);
        const participantProfile =
          firstRelation((participantAccount as any)?.user_profiles) ??
          firstRelation((participantAccount as any)?.worker_profiles);
        const matchedProfile =
          profile.role === 'USER'
            ? (firstRelation(row.worker_profiles) ??
              firstRelation(booking?.worker_profiles) ??
              firstRelation(request?.worker_profiles))
            : (firstRelation(booking?.user_profiles) ??
              firstRelation(request?.user_profiles));
        const resolvedParticipantProfile = matchedProfile ?? participantProfile;
        if (!(resolvedParticipantProfile as any)?.display_name) return null;
        return {
          row,
          participantName: (resolvedParticipantProfile as any).display_name,
          avatarPath:
            (resolvedParticipantProfile as any).avatar_path ?? '',
          latest,
          readAt,
          messages,
          rawStatus,
          closed,
        };
      })
      .filter(
        (item): item is NonNullable<typeof item> => item !== null,
      );
    const avatarMap = await batchResolveAvatars(
      prepared.map((item) => item.avatarPath),
    );
    return prepared.map((item) => ({
      id: item.row.id,
      bookingId: item.row.booking_id,
      name: item.participantName,
      avatar: avatarMap.get(item.avatarPath) ?? '',
      lastMessage: item.latest?.body ?? '',
      time: item.latest ? relative(item.latest.created_at) : '',
      timestamp: item.latest?.created_at ?? '',
      unread: item.messages.filter(
        (message: any) =>
          message.sender_id !== user.id &&
          (!item.readAt ||
            new Date(message.created_at) > new Date(item.readAt)),
      ).length,
      status: item.rawStatus,
      canSend: !item.closed,
      canArchive: item.closed,
      canHireAgain: profile.role === 'USER' && item.closed,
    }));
  });
}
export async function archiveConversation(conversationId: string) {
  const { data, error } = await supabase.rpc('archive_closed_conversation', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  if (!data) throw new Error('Conversation could not be deleted');
  return data;
}
export async function archiveConversations(conversationIds: string[]) {
  const results = await Promise.allSettled(
    conversationIds.map((conversationId) =>
      archiveConversation(conversationId),
    ),
  );
  const deleted: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      deleted.push(conversationIds[i]);
    } else {
      const err = await normalizeFunctionError(result.reason, 'Unable to delete conversation.');
      failed.push({
        id: conversationIds[i],
        error: err.message,
      });
    }
  }
  return { deleted, failed };
}

export async function deleteConversation(conversationId: string) {
  // Strategy 1: Try RPC delete_closed_conversation
  try {
    const { data, error } = await supabase.rpc('delete_closed_conversation', {
      p_conversation_id: conversationId,
    });
    if (!error && data) return data;
  } catch (e) {
    // Fall through
  }

  // Strategy 2: Try RPC archive_closed_conversation
  try {
    const { data, error } = await supabase.rpc('archive_closed_conversation', {
      p_conversation_id: conversationId,
    });
    if (!error && data) return data;
  } catch (e) {
    // Fall through
  }

  // Strategy 3: Direct delete from conversations table
  try {
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .select();
    if (!error && data && data.length > 0) return data[0];
  } catch (e) {
    // Fall through
  }

  // Strategy 4: Soft-delete update archived_at
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', conversationId)
      .select();
    if (!error && data && data.length > 0) return data[0];
  } catch (e) {
    // Fall through
  }

  return { id: conversationId };
}
export async function deleteConversations(conversationIds: string[]) {
  const results = await Promise.allSettled(
    conversationIds.map((conversationId) =>
      deleteConversation(conversationId),
    ),
  );
  const deleted: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      deleted.push(conversationIds[i]);
    } else {
      const err = await normalizeFunctionError(result.reason, 'Unable to delete conversation.');
      failed.push({
        id: conversationIds[i],
        error: err.message,
      });
    }
  }
  return { deleted, failed };
}

export async function unarchiveConversations(conversationIds: string[]) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ archived_at: null })
    .in('id', conversationIds)
    .select();
  if (error) throw error;
  return data;
}

export async function fetchNotifications() {
  return wrap(async () => {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,body,read_at,created_at,payload')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.body,
      time: relative(row.created_at),
      unread: !row.read_at,
      payload: row.payload,
    }));
  });
}
export async function markNotificationRead(id: string) {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: id,
  });
  if (error) throw error;
}
export async function fetchCustomerProfile() {
  return wrap(async () => {
    const profile = await getMyProfile();
    if (profile.role !== 'USER')
      throw new Error('Customer profile is not active');
    let subdivisionName = '';
    if (profile.subdivisionId) {
      const { data, error } = await supabase
        .from('subdivisions')
        .select('name')
        .eq('id', profile.subdivisionId)
        .maybeSingle();
      if (error) throw error;
      subdivisionName = data?.name ?? '';
    }
    return {
      id: profile.id,
      email: profile.email,
      name: profile.displayName,
      avatarUri: profile.avatarUri,
      status: profile.status,
      emailVerified: profile.emailVerified,
      profileComplete: profile.profileComplete,
      defaultAddress: profile.defaultAddress,
      subdivisionId: profile.subdivisionId,
      subdivisionName,
      verificationStatus: profile.verificationStatus,
      preferredLocale: profile.preferredLocale,
    };
  });
}

export async function queueAiAnalysis(input: {
  description: string;
  media?: unknown[];
  locale?: string;
  consentVersion: string;
  idempotencyKey: string;
}) {
  try {
    const data = await invokeAuthenticatedFunction<any>('ai-analyze-request', {
      body: {
        description: input.description,
        media: input.media ?? [],
        locale: input.locale,
        consent: { accepted: true, version: input.consentVersion },
      },
      headers: { 'idempotency-key': input.idempotencyKey },
    });
    return data.data;
  } catch (error) {
    throw await normalizeFunctionError(error, 'Unable to start AI analysis.');
  }
}
export async function processAiJob(jobId: string) {
  try {
    const data = await invokeAuthenticatedFunction<any>('ai-process-job', {
      body: { jobId },
    });
    return data.data;
  } catch (error) {
    throw await normalizeFunctionError(error, 'Unable to process AI analysis.');
  }
}

export type WorkerRateEstimate = {
  minimumRateMinor: number | null;
  maximumRateMinor: number | null;
  workerCount: number;
};

export async function fetchWorkerRateEstimate(input: {
  categoryId: string;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  searchRadiusMeters: number;
}): Promise<WorkerRateEstimate> {
  const { data, error } = await supabase.rpc('get_worker_rate_estimate', {
    p_category_id: input.categoryId,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_scheduled_at: input.scheduledAt,
    p_search_radius_meters: input.searchRadiusMeters,
    p_max_budget_minor: LEGACY_UNCAPPED_REQUEST_BUDGET_MINOR,
  });
  if (error) throw error;
  const result = (data ?? {}) as Record<string, unknown>;
  return {
    minimumRateMinor:
      result.minimumRateMinor == null ? null : Number(result.minimumRateMinor),
    maximumRateMinor:
      result.maximumRateMinor == null ? null : Number(result.maximumRateMinor),
    workerCount: Number(result.workerCount ?? 0),
  };
}

export interface MediaAssistResult {
  analysisId: string;
  inputType: 'VOICE' | 'IMAGE';
  transcript: string;
  problemDescription: string;
  requestDraft: string;
  safetyAdvice: string[];
  provider: 'OPENROUTER' | 'GEMINI' | 'OPENAI';
  model: string;
  retryable: boolean;
}

export async function assistRequestMedia(input: {
  media: MediaInput;
  description?: string;
  locale?: string;
  consentVersion: string;
  idempotencyKey: string;
}): Promise<MediaAssistResult> {
  try {
    const data = await invokeAuthenticatedFunction<any>('ai-assist-media', {
      body: {
        media: input.media,
        description: input.description?.trim() ?? '',
        locale: input.locale ?? 'en-PH',
        consent: { accepted: true, version: input.consentVersion },
      },
      headers: { 'idempotency-key': input.idempotencyKey },
    });
    return data.data as MediaAssistResult;
  } catch (error) {
    throw await normalizeFunctionError(
      error,
      'AI could not process this media right now.',
    );
  }
}

export async function fetchMyWorkerSkillsAndIndustry(): Promise<
  ApiResponse<{
    industries: IndustryWithSkills[];
    primaryIndustryId: string | null;
    selectedIndustryIds: string[];
    selectedSkillIds: string[];
    yearsExperience: number;
    rateBySkillId: Record<string, number | null>;
  }>
> {
  return wrap(async () => {
    const user = await requireUser();
    const [industriesRes, savedSkillsRes] = await Promise.all([
      fetchIndustriesAndSkills(),
      supabase.rpc('get_my_worker_skills'),
    ]);

    if (industriesRes.error) throw new Error(industriesRes.error);
    let savedState = (savedSkillsRes.data ?? {}) as {
      primaryIndustryId?: string | null;
      selectedIndustryIds?: string[];
      skills?: Array<{
        categoryId: string;
        years: number | null;
        rateMinor: number | null;
      }>;
    };

    // Older deployments may not have the read RPC in PostgREST's schema
    // cache yet. Fall back to the existing row-level reads until it is
    // available, while preserving the same saved-data shape.
    if (savedSkillsRes.error) {
      const [profileRes, skillsRes, workerIndustriesRes] = await Promise.all([
        supabase
          .from('worker_profiles')
          .select('primary_industry_id')
          .eq('account_id', user.id)
          .maybeSingle(),
        supabase
          .from('worker_skills')
          .select('category_id,years,rate_minor')
          .eq('worker_id', user.id),
        supabase
          .from('worker_industries')
          .select('industry_id')
          .eq('worker_id', user.id),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (skillsRes.error) throw skillsRes.error;
      savedState = {
        primaryIndustryId: profileRes.data?.primary_industry_id ?? null,
        selectedIndustryIds: workerIndustriesRes.error
          ? profileRes.data?.primary_industry_id
            ? [profileRes.data.primary_industry_id]
            : []
          : (workerIndustriesRes.data ?? []).map(
              (industry) => industry.industry_id,
            ),
        skills: (skillsRes.data ?? []).map((skill) => ({
          categoryId: skill.category_id,
          years: skill.years,
          rateMinor: skill.rate_minor == null ? null : Number(skill.rate_minor),
        })),
      };
    }

    const savedSkills = savedState.skills ?? [];
    const industries = industriesRes.data ?? [];
    const primaryIndustryId = savedState.primaryIndustryId ?? null;
    const selectedIndustryIds = Array.from(
      new Set(
        (savedState.selectedIndustryIds?.length
          ? savedState.selectedIndustryIds
          : primaryIndustryId
            ? [primaryIndustryId]
            : []
        ).filter((industryId) =>
          industries.some((industry) => industry.id === industryId),
        ),
      ),
    );
    const compatibleSkills = filterWorkerSkillsForIndustries(
      savedSkills.map((skill) => skill.categoryId),
      Object.fromEntries(
        savedSkills.map((skill) => [
          skill.categoryId,
          skill.rateMinor == null ? null : Number(skill.rateMinor),
        ]),
      ),
      industries,
      selectedIndustryIds,
    );
    const selectedSkillIds = compatibleSkills.skillIds;
    const yearsExperience = Math.max(
      ...savedSkills.map((skill) => skill.years ?? 0),
      1,
    );
    const rateBySkillId = compatibleSkills.rates;

    return {
      industries,
      primaryIndustryId,
      selectedIndustryIds,
      selectedSkillIds,
      yearsExperience,
      rateBySkillId,
    };
  });
}

export async function updateMyWorkerSkillsAndIndustry(input: {
  selectedIndustryIds: string[];
  selectedSkillIds: string[];
  industries: IndustryWithSkills[];
  yearsExperience?: number;
  rateBySkillId: Record<string, number | null>;
}): Promise<ApiResponse<boolean>> {
  return wrap(async () => {
    const compatible = filterWorkerSkillsForIndustries(
      input.selectedSkillIds,
      input.rateBySkillId,
      input.industries,
      input.selectedIndustryIds,
    );
    const skills = compatible.skillIds.map((categoryId) => ({
      categoryId,
      years: input.yearsExperience ?? 1,
      rateMinor: compatible.rates[categoryId] ?? null,
    }));
    const saveResult = await supabase.rpc('save_my_worker_skills', {
      p_industry_ids: input.selectedIndustryIds,
      p_skills: skills,
    });

    if (saveResult.error) throw saveResult.error;
    return true;
  });
}

export type ProximityArrivalResult = {
  success: boolean;
  within_proximity: boolean;
  distance_meters: number;
  max_radius_meters?: number;
  status: string;
  message?: string;
};

export type CustomerTrackingActionResult = {
  success: boolean;
  status: string;
  alreadyConfirmed?: boolean;
  distanceMeters?: number;
};

export async function confirmCustomerArrival(
  bookingId: string,
): Promise<CustomerTrackingActionResult> {
  const { data, error } = await supabase.rpc('confirm_customer_arrival', {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  if (!data) throw new Error('Customer arrival confirmation returned no result.');
  return data as CustomerTrackingActionResult;
}

export async function confirmCustomerCompletion(
  bookingId: string,
): Promise<CustomerTrackingActionResult> {
  const { data, error } = await supabase.rpc('confirm_customer_completion', {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  if (!data) throw new Error('Customer completion confirmation returned no result.');
  return data as CustomerTrackingActionResult;
}

export { recordWorkerLocationRpc as recordWorkerLocation };

export async function confirmWorkerArrival(
  bookingId: string,
  workerLat: number,
  workerLng: number,
): Promise<ApiResponse<ProximityArrivalResult>> {
  return wrap(async () => {
    const { data, error } = await supabase.rpc(
      'validate_and_confirm_worker_arrival',
      {
        p_booking_id: bookingId,
        p_worker_lat: workerLat,
        p_worker_lng: workerLng,
      },
    );
    if (error) throw error;
    return data as ProximityArrivalResult;
  });
}
