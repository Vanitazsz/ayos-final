/**
 * Compatibility facade for callers outside the mobile workspace.
 * Feature code imports the focused services directly.
 */
export * from './ai';
export * from './bookings';
export * from './catalog';
export * from './customerProfiles';
export * from './geocoding';
export * from './localization';
export * from './messaging';
export * from './notifications';
export * from './payments';
export * from './requests';
export * from './routing';
export * from './support';
export * from './wallet';
export * from './workerFeedback';
export * from './workerOperations';
export {
  apiErrorMessage,
  type ApiResponse,
  type IndustrySkill,
  type IndustryWithSkills,
  type MediaAssistResult,
  type TransactionStatus,
  type WalletSummary,
  type WalletTransaction,
  type WorkerBooking,
  type WorkerProfile,
  type WorkerRateEstimate,
} from './apiCore';
export { EdgeFunctionError } from './functionErrors';
export { subscribeToBookingFeed, subscribeToTable } from './realtime';
