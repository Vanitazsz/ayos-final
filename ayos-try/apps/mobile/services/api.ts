import type { ProviderData } from '@/components/ProviderCard';
import { randomUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import type { MediaInput } from '@/types/ai';
import {
  invokeAuthenticatedFunction,
  SessionExpiredError,
} from '@/services/authenticatedFunctions';
import {
  getMyProfile,
  requireIdentity,
  resolveProfileAvatar,
  resolveStorageImage,
} from '@/services/profile';

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public code = 'edge_function_error',
    public status?: number,
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

async function normalizeFunctionError(error: unknown, fallback: string) {
  if (error instanceof SessionExpiredError) return error;
  const context = (error as { context?: Response })?.context;
  let payload: Record<string, any> | null = null;
  if (context) {
    try {
      payload = await context.clone().json();
    } catch {
      payload = null;
    }
  }
  const code = String(payload?.code ?? payload?.errors?.code ?? 'edge_function_error');
  return new EdgeFunctionError(
    String(payload?.message ?? fallback),
    code,
    context?.status,
  );
}

function geocodingErrorMessage(error: EdgeFunctionError) {
  if (error.code === 'geocoding_rate_limited')
    return 'Address search is temporarily busy. Wait a minute or enter the address manually.';
  if (error.code === 'outside_philippines')
    return 'Choose a service location within the Philippines.';
  if (error.code === 'authentication_required')
    return 'Your session expired. Sign in again to search for an address.';
  if (error.code === 'invalid_query' || error.code === 'invalid_geocoding_request')
    return 'That address could not be found. Check it or enter the address manually.';
  return 'The address provider is temporarily unavailable. Your map point is still usable.';
}
export interface ReviewData {
  id: string;
  author: string;
  avatarUri: string;
  rating: number;
  date: string;
  comment: string;
  serviceType: string;
}
export interface JobOpportunity {
  id: string;
  customerName: string;
  customerAvatar: string;
  service: string;
  category: string;
  description: string;
  location: string;
  distance: string;
  offeredPrice: string;
  urgency: 'normal' | 'urgent';
  postedTime: string;
  imageUrl?: string;
  commentCount: number;
}
export interface JobComment {
  id: string;
  jobId: string;
  author: string;
  avatarUri: string;
  text: string;
  offerMin?: string;
  offerMax?: string;
  postedTime: string;
}
export interface WorkerBooking {
  id: string;
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
  verificationStatus: 'verified' | 'pending' | 'rejected';
  profileComplete: boolean;
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  earnings: string;
  hourlyRate: string;
  skills: string[];
  serviceAreas: string[];
  portfolioImages: string[];
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
export interface GeocodingResult {
  providerId: string;
  line: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  displayLabel: string;
  confidence: number | null;
  longitude: number;
  latitude: number;
  provider: 'OPENROUTESERVICE';
  raw?: Record<string, unknown>;
}

const money = (value: number | string | null | undefined) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const relative = (date: string) =>
  new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    -Math.max(
      1,
      Math.round((Date.now() - new Date(date).getTime()) / 86400000),
    ),
    'day',
  );
const requireUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Authentication required');
  return user;
};
const wrap = async <T>(load: () => Promise<T>): Promise<ApiResponse<T>> => {
  try {
    return { data: await load() };
  } catch (error) {
    return {
      data: [] as T,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

export function subscribeToTable(
  table: string,
  onChange: () => void,
  filter?: string,
) {
  const channel = supabase
    .channel(`${table}:${filter ?? 'all'}:${randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function fetchProviders(): Promise<ApiResponse<ProviderData[]>> {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select(
        'account_id,display_name,avatar_path,approval_status,worker_skills(years,service_categories(name)),reviews:account_id(stars)',
      )
      .eq('approval_status', 'APPROVED')
      .eq('is_available', true);
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async (row: any) => {
        const reviews = row.reviews ?? [];
        return {
          id: row.account_id,
          name: requireIdentity(row.display_name, 'Worker'),
          category: requireIdentity(
            row.worker_skills?.[0]?.service_categories?.name,
            'Worker service',
          ),
          avatarUri: await resolveProfileAvatar(row.avatar_path),
          rating: reviews.length
            ? reviews.reduce(
                (sum: number, item: any) => sum + Number(item.stars),
                0,
              ) / reviews.length
            : 0,
          reviewCount: reviews.length,
          distance: '',
          eta: '',
          verified: row.approval_status === 'APPROVED',
          price: undefined,
        };
      }),
    );
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
      { data: reviews, error: reviewError },
      { data: skills, error: skillError },
    ] = await Promise.all([
      supabase
        .from('worker_profiles')
        .select('*,worker_skills(years,service_categories(name))')
        .eq('account_id', id)
        .eq('approval_status', 'APPROVED')
        .single(),
      supabase
        .from('reviews')
        .select(
          'id,stars,body,created_at,user_profiles:user_account_id(display_name,avatar_path)',
        )
        .eq('worker_account_id', id)
        .eq('moderation_status', 'PUBLISHED')
        .order('created_at', { ascending: false }),
      supabase
        .from('worker_skills')
        .select(
          'service_categories(name,service_templates(name,base_price,is_active))',
        )
        .eq('worker_id', id),
    ]);
    if (error) throw error;
    if (reviewError) throw reviewError;
    if (skillError) throw skillError;
    const rows = reviews ?? [];
    const templates = (skills ?? [])
      .flatMap(
        (skill: any) => skill.service_categories?.service_templates ?? [],
      )
      .filter((item: any) => item.is_active);
    const rating = rows.length
      ? rows.reduce((sum, row) => sum + row.stars, 0) / rows.length
      : 0;
    return {
      id: profile.account_id,
      name: requireIdentity(profile.display_name, 'Worker'),
      avatarUri: await resolveProfileAvatar(profile.avatar_path),
      category: requireIdentity(
        profile.worker_skills?.[0]?.service_categories?.name,
        'Worker service',
      ),
      verified: profile.approval_status === 'APPROVED',
      rating,
      reviewCount: rows.length,
      distance: '',
      eta: '',
      price: templates.length
        ? money(
            Math.min(...templates.map((row: any) => Number(row.base_price))),
          )
        : '',
      bio: profile.bio ?? '',
      years: Math.max(
        0,
        ...(profile.worker_skills ?? []).map((row: any) => Number(row.years)),
      ),
      services: templates.map((row: any) => row.name).filter(Boolean),
      reviews: await Promise.all(
        rows.map(async (row: any) => ({
          id: row.id,
          author: requireIdentity(
            row.user_profiles?.display_name,
            'Review author',
          ),
          avatarUri: await resolveProfileAvatar(row.user_profiles?.avatar_path),
          rating: row.stars,
          date: relative(row.created_at),
          comment: row.body,
        })),
      ),
    };
  });
}
export async function fetchReviews(): Promise<ApiResponse<ReviewData[]>> {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(
        'id,stars,body,created_at,user_profiles:user_account_id(display_name,avatar_path),service:bookings(service_requests(service_categories(name)))',
      )
      .eq('moderation_status', 'PUBLISHED')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async (row: any) => ({
        id: row.id,
        author: requireIdentity(
          row.user_profiles?.display_name,
          'Review author',
        ),
        avatarUri: await resolveProfileAvatar(row.user_profiles?.avatar_path),
        rating: row.stars,
        date: relative(row.created_at),
        comment: row.body,
        serviceType: requireIdentity(
          row.service?.service_requests?.service_categories?.name,
          'Reviewed service',
        ),
      })),
    );
  });
}
export async function fetchBookings(): Promise<ApiResponse<any[]>> {
  return wrap(async () => {
    await requireUser();
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id,worker_account_id,status,created_at,service_requests(description,scheduled_at,budget,addresses(line1,barangay,city),service_categories(name)),worker_profiles:worker_account_id(display_name,avatar_path,reviews:account_id(stars))',
      )
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async (row: any) => {
        const reviews = row.worker_profiles?.reviews ?? [];
        return {
          id: row.id,
          providerId: row.worker_account_id,
          providerName: requireIdentity(
            row.worker_profiles?.display_name,
            'Booked worker',
          ),
          category: requireIdentity(
            row.service_requests?.service_categories?.name,
            'Booked service',
          ),
          avatarUri: await resolveProfileAvatar(
            row.worker_profiles?.avatar_path,
          ),
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
          price: money(row.service_requests?.budget),
          rating: reviews.length
            ? reviews.reduce(
                (sum: number, item: any) => sum + Number(item.stars),
                0,
              ) / reviews.length
            : 0,
        };
      }),
    );
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
      .order('name');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      label: row.name,
      slug: row.slug,
      minimumPriceMinor: Number(row.minimum_price_minor ?? 0),
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
      { data: reviews },
      { data: bookings },
      { data: wallet },
      { data: portfolio },
      { data: skills },
    ] = await Promise.all([
      supabase
        .from('accounts')
        .select('email,profile_completed_at')
        .eq('id', user.id)
        .single(),
      supabase
        .from('worker_profiles')
        .select('*,worker_skills(years,service_categories(name))')
        .eq('account_id', user.id)
        .single(),
      supabase
        .from('reviews')
        .select('stars')
        .eq('worker_account_id', user.id)
        .eq('moderation_status', 'PUBLISHED'),
      supabase
        .from('bookings')
        .select('id')
        .eq('worker_account_id', user.id)
        .eq('status', 'COMPLETED'),
      supabase
        .from('wallet_accounts')
        .select('wallet_transactions(amount,status)')
        .eq('account_id', user.id)
        .maybeSingle(),
      supabase
        .from('worker_portfolio_items')
        .select('worker_portfolio_media(storage_path)')
        .eq('worker_id', user.id)
        .eq('is_published', true)
        .order('sort_order'),
      supabase
        .from('worker_skills')
        .select('service_categories(service_templates(base_price,is_active))')
        .eq('worker_id', user.id),
    ]);
    if (accountError) throw accountError;
    if (profileError) throw profileError;
    const rating = (reviews ?? []).length
      ? (reviews ?? []).reduce((sum, row) => sum + row.stars, 0) /
        (reviews ?? []).length
      : 0;
    const prices = (skills ?? [])
      .flatMap(
        (skill: any) => skill.service_categories?.service_templates ?? [],
      )
      .filter((item: any) => item.is_active)
      .map((item: any) => Number(item.base_price))
      .filter(Number.isFinite);
    const earnings = (wallet?.wallet_transactions ?? [])
      .filter((item: any) => ['AVAILABLE', 'COMPLETED'].includes(item.status))
      .reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    const portfolioPaths = (portfolio ?? [])
      .flatMap((item: any) => item.worker_portfolio_media ?? [])
      .map((item: any) => item.storage_path);
    return {
      data: {
        id: user.id,
        name: requireIdentity(profile.display_name, 'Worker'),
        email: account.email,
        avatarUri: await resolveProfileAvatar(profile.avatar_path),
        category: profile.worker_skills?.[0]?.service_categories?.name ?? '',
        verificationStatus:
          profile.approval_status === 'APPROVED'
            ? 'verified'
            : profile.approval_status === 'REJECTED'
              ? 'rejected'
              : 'pending',
        profileComplete: Boolean(account.profile_completed_at),
        yearsExperience: Math.max(
          ...(profile.worker_skills ?? []).map((skill: any) => skill.years),
          0,
        ),
        rating,
        reviewCount: (reviews ?? []).length,
        completedJobs: (bookings ?? []).length,
        earnings: money(earnings),
        hourlyRate: prices.length ? money(Math.min(...prices)) : '',
        skills: (profile.worker_skills ?? [])
          .map((skill: any) => skill.service_categories?.name)
          .filter(Boolean),
        serviceAreas: profile.service_area ? [profile.service_area] : [],
        portfolioImages: await Promise.all(
          portfolioPaths.map((path: string) =>
            resolveStorageImage(path, 'portfolio-media'),
          ),
        ),
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
export async function fetchWorkerReviews() {
  return fetchReviews();
}
export async function fetchWorkerJobs(): Promise<
  ApiResponse<JobOpportunity[]>
> {
  return wrap(async () => {
    await requireUser();
    const { data, error } = await supabase
      .from('service_requests')
      .select(
        'id,description,budget,scheduled_at,created_at,user_profiles:user_account_id(display_name,avatar_path),addresses(line1,barangay,city),service_categories(name),service_request_offers(count)',
      )
      .in('status', ['OPEN', 'MATCHED'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async (row: any) => ({
        id: row.id,
        customerName: requireIdentity(
          row.user_profiles?.display_name,
          'Request customer',
        ),
        customerAvatar: await resolveProfileAvatar(
          row.user_profiles?.avatar_path,
        ),
        service: requireIdentity(
          row.service_categories?.name,
          'Requested service',
        ),
        category: requireIdentity(
          row.service_categories?.name,
          'Requested service',
        ),
        description: row.description,
        location: [row.addresses?.barangay, row.addresses?.city]
          .filter(Boolean)
          .join(', '),
        distance: '',
        offeredPrice: money(row.budget),
        urgency:
          new Date(row.scheduled_at).getTime() - Date.now() < 86400000
            ? 'urgent'
            : 'normal',
        postedTime: relative(row.created_at),
        commentCount: row.service_request_offers?.[0]?.count ?? 0,
      })),
    );
  });
}
export async function fetchWorkerBookings(): Promise<
  ApiResponse<WorkerBooking[]>
> {
  return wrap(async () => {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id,status,created_at,service_requests(description,scheduled_at,budget,addresses(line1,barangay,city),service_categories(name)),user_profiles:user_account_id(display_name,avatar_path)',
      )
      .eq('worker_account_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async (row: any) => ({
        id: row.id,
        customerName: requireIdentity(
          row.user_profiles?.display_name,
          'Booking customer',
        ),
        customerAvatar: await resolveProfileAvatar(
          row.user_profiles?.avatar_path,
        ),
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
        price: money(row.service_requests?.budget),
        status: row.status.toLowerCase(),
        distance: '',
      })),
    );
  });
}
async function transition(bookingId: string, status: string, reason?: string) {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('version')
    .eq('id', bookingId)
    .single();
  if (bookingError) throw bookingError;
  const { data, error } = await supabase.rpc('transition_booking', {
    p_booking_id: bookingId,
    p_target_status: status,
    p_expected_version: booking.version,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return { data };
}
export async function acceptJob(bookingId: string) {
  return transition(bookingId, 'ACCEPTED');
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
  return transition(bookingId, 'COMPLETED');
}
export async function cancelBooking(bookingId: string, reason: string) {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('status,version')
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
    p_expected_version: booking.version,
    p_stage: stages[booking.status] ?? 'BEFORE_ACCEPTANCE',
    p_reason_code: 'OTHER',
    p_details: reason,
    p_policy_version: '2026-07-21',
  });
  if (error) throw error;
  return { data };
}

export async function fetchWalletTransactions(): Promise<
  ApiResponse<WalletTransaction[]>
> {
  return wrap(async () => {
    const user = await requireUser();
    const { data: wallet, error: walletError } = await supabase
      .from('wallet_accounts')
      .select('id')
      .eq('account_id', user.id)
      .maybeSingle();
    if (walletError) throw walletError;
    if (!wallet) return [];
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_account_id', wallet.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      label: String(row.kind).replaceAll('_', ' '),
      sub: row.description,
      amount: `${Number(row.amount) >= 0 ? '+' : '-'}${money(Math.abs(Number(row.amount)))}`,
      credit: Number(row.amount) >= 0,
      status:
        row.status === 'FAILED'
          ? 'failed'
          : row.status === 'PENDING'
            ? 'pending'
            : 'completed',
      date: new Date(row.created_at).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
      }),
      createdAt: row.created_at,
    }));
  });
}
export async function fetchWallet(): Promise<ApiResponse<WalletSummary>> {
  return wrap(async () => {
    const user = await requireUser();
    const { data: wallet, error } = await supabase
      .from('wallet_accounts')
      .select('id,wallet_transactions(amount,status)')
      .eq('account_id', user.id)
      .maybeSingle();
    if (error) throw error;
    const walletId = wallet?.id;
    const [
      { data: methods, error: methodsError },
      { data: payouts, error: payoutsError },
    ] = await Promise.all([
      supabase
        .from('payout_destinations')
        .select('id,kind,label,account_reference,is_default')
        .eq('worker_id', user.id)
        .eq('status', 'ACTIVE'),
      walletId
        ? supabase
            .from('payout_requests')
            .select('*')
            .eq('wallet_account_id', walletId)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (methodsError) throw methodsError;
    if (payoutsError) throw payoutsError;
    const transactions = wallet?.wallet_transactions ?? [];
    const available = transactions
      .filter((row: any) => ['AVAILABLE', 'COMPLETED'].includes(row.status))
      .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    const locked = Math.abs(
      transactions
        .filter((row: any) => row.status === 'HELD')
        .reduce((sum: number, row: any) => sum + Number(row.amount), 0),
    );
    return {
      available: money(available),
      locked: money(locked),
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
export async function submitBid(
  serviceRequestId: string,
  amountMinor: number,
  message: string,
  durationMinutes: number,
) {
  const { data, error } = await supabase.rpc('submit_request_bid', {
    p_service_request_id: serviceRequestId,
    p_amount_minor: amountMinor,
    p_message: message,
    p_duration_minutes: durationMinutes,
  });
  if (error) throw error;
  return data;
}
export async function fetchRequestBids(serviceRequestId: string) {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('service_request_offers')
      .select(
        '*,worker_profiles:worker_id(display_name,avatar_path,approval_status)',
      )
      .eq('service_request_id', serviceRequestId)
      .in('status', ['SUBMITTED', 'UPDATED', 'ACCEPTED'])
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...row,
      amount_minor: Math.round(Number(row.amount) * 100),
      estimated_duration_minutes: row.estimated_minutes,
    }));
  });
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
    return data;
  });
}
export async function fetchBookingTracking(id: string) {
  const [{ data: booking, error }, updates] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        '*,service_requests(*,addresses(*)),worker_profiles:worker_account_id(*),user_profiles:user_account_id(*),booking_status_events(*),cancellations(*),payments(*,refunds(*))',
      )
      .eq('id', id)
      .single(),
    supabase.rpc('get_booking_tracking', { p_booking_id: id, p_limit: 100 }),
  ]);
  if (error) throw error;
  if (updates.error) throw updates.error;
  return { booking, updates: updates.data ?? [] };
}
export async function confirmCashPayment(bookingId: string) {
  const { data, error } = await supabase.rpc('confirm_cash_payment', {
    p_booking_id: bookingId,
      p_idempotency_key: randomUUID(),
  });
  if (error) throw error;
  return data;
}
export async function fetchPaymentForBooking(bookingId: string) {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*,receipts(receipt_number,created_at)')
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
    return {
      commissionRate: Number((data as any)?.commissionRate ?? 10),
      homeownerCharge: Number((data as any)?.homeownerCharge ?? 0),
    };
  });
}
export async function createReview(
  bookingId: string,
  stars: number,
  body: string,
  recommendWorker: boolean,
  media: { path: string; contentType: string; byteSize: number }[] = [],
) {
  const { data, error } = await supabase.rpc('create_review', {
    p_booking_id: bookingId,
    stars,
    body,
    recommend_worker: recommendWorker,
  });
  if (error) throw error;
  for (const item of media) {
    const { error: mediaError } = await supabase.rpc('attach_review_media', {
      p_review_id: (data as any).id,
      p_storage_path: item.path,
      p_content_type: item.contentType,
      p_byte_size: item.byteSize,
    });
    if (mediaError) throw mediaError;
  }
  return data;
}
export async function fetchIndustriesAndSkills(): Promise<
  ApiResponse<IndustryWithSkills[]>
> {
  return wrap(async () => {
    const { data, error } = await supabase
      .from('industries')
      .select(
        'id,slug,name,sort_order,service_categories!service_categories_industry_id_fkey(id,slug,name,is_active)',
      )
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
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
export async function publishServiceRequest(input: {
  categoryId: string;
  description: string;
  addressId?: string | null;
  address: string;
  addressDetails?: Record<string, any> | null;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  budgetMinor: number;
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
    budget: Math.max(1, input.budgetMinor) / 100,
    notes: null,
    ai_analysis_id: input.analysisId ?? null,
    notify_on_match: true,
  });
  if (error) throw error;
  return data;
}

export async function attachRequestMedia(requestId: string, media: MediaInput[]) {
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
      { data: conversation, error },
      { data: messages, error: messageError },
    ] = await Promise.all([
      supabase
        .from('conversations')
        .select(
          '*,conversation_participants(account_id,user_profiles:account_id(display_name,avatar_path))',
        )
        .eq('id', conversationId)
        .single(),
      supabase
        .from('messages')
        .select('*,message_translations(target_locale,translated)')
        .eq('conversation_id', conversationId)
        .order('created_at'),
    ]);
    if (error) throw error;
    if (messageError) throw messageError;
    const { error: readError } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
    });
    if (readError) throw readError;
    return {
      conversation,
      preferredLocale,
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
  const user = await requireUser();
  const ownProfile = await getMyProfile();
  const sourceLocale =
    locale ?? (ownProfile.role === 'ADMIN' ? 'en' : ownProfile.preferredLocale);

  // Try RPC first for atomic insert & notification delivery
  const { data: rpcData, error: rpcError } = await supabase.rpc('send_chat_message', {
    p_conversation_id: conversationId,
    p_body: body.trim(),
    p_original_locale: sourceLocale,
  });

  let data = rpcData;

  if (rpcError || !data) {
    // Fallback to direct client insert if RPC is not yet deployed
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: body.trim(),
        original_locale: sourceLocale,
      })
      .select()
      .single();
    if (error) throw error;
    data = inserted;

    void supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    void (async () => {
      try {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('account_id')
          .eq('conversation_id', conversationId);

        const recipientId = participants?.find(
          (p: any) => p.account_id !== user.id,
        )?.account_id;

        if (recipientId) {
          await supabase.from('notifications').insert({
            recipient_id: recipientId,
            title: 'New Chat Message 💬',
            body: `${ownProfile.displayName || 'Participant'}: ${body.trim().slice(0, 80)}`,
            type: 'CHAT',
            payload: { conversation_id: conversationId },
          });
        }
      } catch (notifErr) {
        console.warn('Chat notification error:', notifErr);
      }
    })();
  }

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
        console.warn('[translation] automatic translation failed:', translationError);
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
    let { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (!data) {
      // Find booking details to retrieve user and worker IDs
      const { data: booking } = await supabase
        .from('bookings')
        .select('user_account_id, worker_account_id')
        .eq('id', bookingId)
        .maybeSingle();

      if (booking) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ booking_id: bookingId })
          .select('id')
          .single();

        if (newConv) {
          data = newConv;
          const participants = [booking.user_account_id, booking.worker_account_id].filter(Boolean);
          if (participants.length > 0) {
            await supabase.from('conversation_participants').insert(
              participants.map((accId) => ({
                conversation_id: newConv.id,
                account_id: accId,
              })),
            );
          }
        }
      }
    }
    if (!data) throw new Error('Conversation not available for this booking');
    return data;
  });
}
export async function fetchConversations() {
  return wrap(async () => {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('conversations')
      .select(
        'id,booking_id,updated_at,conversation_participants(account_id,last_read_at,user_profiles:account_id(display_name,avatar_path),worker_profiles:account_id(display_name,avatar_path)),messages(id,body,created_at,sender_id)',
      )
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async (row: any) => {
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
        const participantName =
          participant?.user_profiles?.display_name ??
          participant?.worker_profiles?.display_name ??
          'Chat Participant';
        const avatarPath =
          participant?.user_profiles?.avatar_path ??
          participant?.worker_profiles?.avatar_path ??
          '';

        return {
          id: row.id,
          bookingId: row.booking_id,
          name: participantName,
          avatar: await resolveProfileAvatar(avatarPath),
          lastMessage: latest?.body ?? '',
          time: latest ? relative(latest.created_at) : '',
          unread: messages.filter(
            (message: any) =>
              message.sender_id !== user.id &&
              (!readAt || new Date(message.created_at) > new Date(readAt)),
          ).length,
        };
      }),
    );
  });
}
export async function startDirectConversationWithUser(targetAccountId: string) {
  return wrap(async () => {
    const user = await requireUser();

    // Try RPC first for atomic creation & bypassing client insert RLS
    const { data: rpcData } = await supabase.rpc('start_direct_chat', {
      p_target_account_id: targetAccountId,
    });
    if (rpcData?.id) return { id: rpcData.id };

    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('account_id', user.id);

    if (myConvs && myConvs.length > 0) {
      const convIds = myConvs.map((c: any) => c.conversation_id);
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('account_id', targetAccountId)
        .maybeSingle();

      if (shared) {
        return { id: shared.conversation_id };
      }
    }

    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (convErr || !newConv) throw convErr ?? new Error('Failed to create conversation');

    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, account_id: user.id },
      { conversation_id: newConv.id, account_id: targetAccountId },
    ]);

    return { id: newConv.id };
  });
}
export async function fetchAllAccountsForPoC() {
  return wrap(async () => {
    const user = await requireUser();

    // Query accounts table directly to fetch all active accounts regardless of role
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('id, role, user_profiles(display_name, avatar_path), worker_profiles(display_name, avatar_path)')
      .neq('id', user.id)
      .eq('status', 'ACTIVE');

    if (accountsData && accountsData.length > 0) {
      return Promise.all(
        accountsData.map(async (acc: any) => {
          const uProf = Array.isArray(acc.user_profiles) ? acc.user_profiles[0] : acc.user_profiles;
          const wProf = Array.isArray(acc.worker_profiles) ? acc.worker_profiles[0] : acc.worker_profiles;
          const profile = uProf ?? wProf;
          const name = profile?.display_name || (acc.role === 'WORKER' ? 'Worker Account' : 'Customer Account');
          const avatarPath = profile?.avatar_path || '';
          return {
            id: acc.id,
            name,
            avatar: await resolveProfileAvatar(avatarPath),
            role: acc.role === 'WORKER' ? 'Worker' : acc.role === 'USER' ? 'Customer' : 'Admin',
          };
        }),
      );
    }

    // Fallback if accounts table direct query returns empty
    const [{ data: userProfiles }, { data: workerProfiles }] = await Promise.all([
      supabase.from('user_profiles').select('account_id, display_name, avatar_path'),
      supabase.from('worker_profiles').select('account_id, display_name, avatar_path'),
    ]);

    const map = new Map<string, { id: string; name: string; avatar: string; role: string }>();
    (userProfiles ?? []).forEach((row: any) => {
      if (row.account_id && row.account_id !== user.id) {
        map.set(row.account_id, {
          id: row.account_id,
          name: row.display_name || 'Customer Account',
          avatar: row.avatar_path || '',
          role: 'Customer',
        });
      }
    });
    (workerProfiles ?? []).forEach((row: any) => {
      if (row.account_id && row.account_id !== user.id) {
        map.set(row.account_id, {
          id: row.account_id,
          name: row.display_name || 'Worker Account',
          avatar: row.avatar_path || '',
          role: 'Worker',
        });
      }
    });

    return Array.from(map.values());
  });
}
export async function fetchNotifications() {
  return wrap(async () => {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.body,
      time: relative(row.created_at),
      unread: !row.read_at,
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
    throw await normalizeFunctionError(error, 'AI could not process this media right now.');
  }
}

export async function geocodeSearch(
  query: string,
  coords?: { latitude: number; longitude: number },
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({ q: query });
  if (coords) {
    params.set('lat', String(coords.latitude));
    params.set('lon', String(coords.longitude));
  }
  try {
    const data = await invokeAuthenticatedFunction<any>(`geocode-search?${params}`, {
      method: 'GET',
    });
    return (data?.data?.items ?? []) as GeocodingResult[];
  } catch (error) {
    const normalized = await normalizeFunctionError(error, 'Address search is unavailable.');
    if (normalized instanceof SessionExpiredError) throw normalized;
    normalized.message = geocodingErrorMessage(normalized);
    throw normalized;
  }
}
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodingResult> {
  try {
    const data = await invokeAuthenticatedFunction<any>(
      `geocode-reverse?lat=${latitude}&lon=${longitude}`,
      { method: 'GET' },
    );
    return data.data.result as GeocodingResult;
  } catch (error) {
    const normalized = await normalizeFunctionError(error, 'Address lookup is unavailable.');
    if (normalized instanceof SessionExpiredError) throw normalized;
    normalized.message = geocodingErrorMessage(normalized);
    throw normalized;
  }
}
export async function calculateRoute(
  start: [number, number],
  end: [number, number],
  bookingId?: string,
) {
  const data = await invokeAuthenticatedFunction<any>('route', {
    body: { start, end, bookingId },
  });
  return data.data;
}

export async function fetchMyWorkerSkillsAndIndustry(): Promise<
  ApiResponse<{
    industries: IndustryWithSkills[];
    primaryIndustryId: string | null;
    selectedSkillIds: string[];
    yearsExperience: number;
  }>
> {
  return wrap(async () => {
    const user = await requireUser();
    const [industriesRes, profileRes, skillsRes] = await Promise.all([
      fetchIndustriesAndSkills(),
      supabase
        .from('worker_profiles')
        .select('primary_industry_id')
        .eq('account_id', user.id)
        .maybeSingle(),
      supabase
        .from('worker_skills')
        .select('category_id,years')
        .eq('worker_id', user.id),
    ]);

    const industries = industriesRes.data ?? [];
    const primaryIndustryId = profileRes.data?.primary_industry_id ?? null;
    const selectedSkillIds = (skillsRes.data ?? []).map(
      (row: any) => row.category_id,
    );
    const yearsExperience = Math.max(
      ...(skillsRes.data ?? []).map((row: any) => row.years ?? 0),
      1,
    );

    return {
      industries,
      primaryIndustryId,
      selectedSkillIds,
      yearsExperience,
    };
  });
}

export async function updateMyWorkerSkillsAndIndustry(input: {
  primaryIndustryId: string;
  selectedSkillIds: string[];
  yearsExperience?: number;
}): Promise<ApiResponse<boolean>> {
  return wrap(async () => {
    const user = await requireUser();

    // 1. Update primary_industry_id on worker_profiles using account_id
    const { error: profileError } = await supabase
      .from('worker_profiles')
      .update({
        primary_industry_id: input.primaryIndustryId,
      })
      .eq('account_id', user.id);
    if (profileError) throw profileError;

    // 2. Clear existing worker_skills
    const { error: deleteError } = await supabase
      .from('worker_skills')
      .delete()
      .eq('worker_id', user.id);
    if (deleteError) throw deleteError;

    // 3. Insert new worker_skills using category_id
    if (input.selectedSkillIds.length > 0) {
      const rows = input.selectedSkillIds.map((skillId) => ({
        worker_id: user.id,
        category_id: skillId,
        years: input.yearsExperience ?? 1,
      }));
      const { error: insertError } = await supabase
        .from('worker_skills')
        .insert(rows);
      if (insertError) throw insertError;
    }

    return true;
  });
}
