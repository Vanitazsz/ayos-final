export {
  fetchWorkerRateEstimate,
  type WorkerRateEstimate,
} from '@/services/workerOperations';
import type { WorkerRateEstimate } from '@/services/workerOperations';
export { processAiJob, queueAiAnalysis } from '@/services/ai';
export { subscribeToAiAnalysisJob } from '@/services/aiAnalysisSubscription';
import { formatPesoMinor } from '@/utils/format';
export { formatPesoMinor } from '@/utils/format';
export {
  MIN_DESCRIPTION_LENGTH,
  descriptionIsValid,
} from './NewRequestCreateScreenLogic';

export const AI_CONSENT_VERSION_DEFAULT = '2026-07-21';

export const aiConsentVersion = (): string =>
  process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? AI_CONSENT_VERSION_DEFAULT;

export const rateEstimateLabel = (
  rateLoading: boolean,
  rateError: string,
  rateEstimate: WorkerRateEstimate | null,
): string => {
  if (rateLoading) return 'Checking eligible worker rates…';
  const minimum = rateEstimate?.minimumRateMinor;
  const maximum = rateEstimate?.maximumRateMinor;
  if (
    rateError ||
    minimum == null ||
    maximum == null ||
    !rateEstimate?.workerCount
  )
    return 'No live worker-rate estimate is currently available.';
  const format = (minor: number) => formatPesoMinor(minor);
  return minimum === maximum
    ? `${format(minimum)} worker rate`
    : `${format(minimum)} – ${format(maximum)} worker-rate range`;
};
