export {
  getWorkerMatchingReadiness,
  saveWorkerMatchingSetup,
  type WorkerMatchingReadiness,
} from '@/services/workerMatching';

export const canGoOnline = (
  verificationStatus: string | undefined,
  skillsReady: boolean,
  rateReady: boolean,
): boolean =>
  verificationStatus === 'APPROVED' && skillsReady && rateReady;

export const validateServiceArea = (
  area: string,
): Record<string, string> | null =>
  area.trim().length < 2 ? { serviceArea: 'Enter a service-area name or address.' } : null;
