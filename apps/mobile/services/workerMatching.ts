import { supabase } from '@/lib/supabase';

export type WorkerMatchingReadiness = {
  accountEligible: boolean;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_DOCUMENTS';
  skillsReady: boolean;
  rateReady: boolean;
  serviceAreaReady: boolean;
  online: boolean;
  setupComplete: boolean;
  matchable: boolean;
  latitude: number | null;
  longitude: number | null;
  serviceArea: string | null;
  radiusMeters: number | null;
};

export type MatchDiagnosticReason =
  | 'NO_ACTIVE_WORKERS'
  | 'NO_CATEGORY_WORKERS'
  | 'NO_APPROVED_WORKERS'
  | 'WORKERS_MISSING_SERVICE_AREA'
  | 'OUTSIDE_SERVICE_RADIUS'
  | 'WORKERS_OFFLINE'
  | 'NO_MATCHES';

export type MatchDiagnostics = {
  serviceRequestId: string;
  category: string;
  reasonCode: MatchDiagnosticReason;
  counts: {
    active: number;
    skilled: number;
    approved: number;
    configured: number;
    nearby: number;
    online: number;
  };
};

function matchingErrorMessage(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : '';
  switch (message) {
    case 'WORKER_NOT_READY':
      return 'Complete verification, skills, a service rate, and a service area before going online.';
    case 'INVALID_WORKER_MATCHING_SETUP':
      return 'Confirm your location, service area, and radius.';
    case 'WORKER_ROLE_REQUIRED':
      return 'Sign in with a worker account to manage matching availability.';
    default:
      return message || 'Unable to update worker matching settings.';
  }
}

export async function getWorkerMatchingReadiness() {
  const { data, error } = await supabase.rpc(
    'get_my_worker_matching_readiness',
  );
  if (error) throw new Error(matchingErrorMessage(error));
  return data as WorkerMatchingReadiness;
}

export async function saveWorkerMatchingSetup(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  serviceArea: string;
  online: boolean;
}) {
  const { data, error } = await supabase.rpc('save_my_worker_matching_setup', {
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_radius_meters: input.radiusMeters,
    p_service_area: input.serviceArea.trim(),
    p_online: input.online,
  });
  if (error) throw new Error(matchingErrorMessage(error));
  return data as WorkerMatchingReadiness;
}

export async function getMatchDiagnostics(serviceRequestId: string) {
  const { data, error } = await supabase.rpc('get_match_diagnostics', {
    p_service_request_id: serviceRequestId,
  });
  if (error) throw error;
  return data as MatchDiagnostics;
}

export function matchDiagnosticMessage(diagnostic: MatchDiagnostics | null) {
  const category = diagnostic?.category || 'service';
  switch (diagnostic?.reasonCode) {
    case 'NO_ACTIVE_WORKERS':
      return 'There are no active worker accounts available yet.';
    case 'NO_CATEGORY_WORKERS':
      return `No workers currently offer ${category}.`;
    case 'NO_APPROVED_WORKERS':
      return `${category} workers are still completing verification.`;
    case 'WORKERS_MISSING_SERVICE_AREA':
      return `${category} workers have not finished setting their service area.`;
    case 'OUTSIDE_SERVICE_RADIUS':
      return 'Verified workers are currently outside the service radius for this address.';
    case 'WORKERS_OFFLINE':
      return 'Eligible nearby workers are currently offline. Try again shortly or schedule for later.';
    default:
      return 'No eligible workers are available for this request right now.';
  }
}
