import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const moduleByExport: Record<string, string> = {
  EdgeFunctionError: 'functionErrors',
  GeocodingResult: 'geocoding',
  acceptJob: 'bookings',
  archiveConversation: 'messaging',
  archiveConversations: 'messaging',
  arriveAtJob: 'bookings',
  assistRequestMedia: 'ai',
  attachBookingProof: 'bookings',
  attachRequestMedia: 'requests',
  calculateRoute: 'routing',
  cancelBooking: 'bookings',
  completeJob: 'bookings',
  confirmCashPayment: 'payments',
  confirmJobCompletion: 'bookings',
  confirmWorkerArrival: 'workerOperations',
  createReview: 'reviews',
  createSupportTicket: 'support',
  declineAssignedBooking: 'bookings',
  departForJob: 'bookings',
  fetchBookingByRequestId: 'bookings',
  fetchBookingDetail: 'bookings',
  fetchBookingTracking: 'bookings',
  fetchBookings: 'bookings',
  fetchCancellationReasons: 'bookings',
  fetchConversation: 'messaging',
  fetchConversationForBooking: 'messaging',
  fetchConversations: 'messaging',
  fetchCustomerProfile: 'customerProfiles',
  fetchIndustriesAndSkills: 'workerOperations',
  fetchMyWorkerSkillsAndIndustry: 'workerOperations',
  fetchNotifications: 'notifications',
  fetchPaymentForBooking: 'payments',
  fetchPlatformFeeSettings: 'payments',
  fetchProviderById: 'catalog',
  fetchProviderProfile: 'catalog',
  fetchProviders: 'catalog',
  fetchRequest: 'requests',
  fetchReviews: 'reviews',
  fetchServiceCategories: 'catalog',
  fetchWallet: 'wallet',
  fetchWalletTransactions: 'wallet',
  fetchWorkerBookings: 'bookings',
  fetchWorkerProfile: 'workerOperations',
  fetchWorkerRateEstimate: 'workerOperations',
  fetchWorkerReviews: 'reviews',
  fetchWorkerVerification: 'workerOperations',
  generateMatches: 'requests',
  geocodeSearch: 'geocoding',
  IndustrySkill: 'workerOperations',
  IndustryWithSkills: 'workerOperations',
  markJobInProgress: 'bookings',
  markNotificationRead: 'notifications',
  MediaAssistResult: 'ai',
  prepareJob: 'bookings',
  processAiJob: 'ai',
  ProximityArrivalResult: 'workerOperations',
  publishServiceRequest: 'requests',
  queueAiAnalysis: 'ai',
  reportBookingParticipant: 'support',
  requestPayout: 'wallet',
  reverseGeocode: 'geocoding',
  ReviewData: 'reviews',
  selectWorker: 'requests',
  sendMessage: 'messaging',
  setPreferredLocale: 'localization',
  startConversation: 'messaging',
  startJob: 'bookings',
  subscribeToBookingFeed: 'realtime',
  subscribeToConversationBroadcast: 'messaging',
  subscribeToTable: 'realtime',
  TransactionStatus: 'wallet',
  updateMyWorkerSkillsAndIndustry: 'workerOperations',
  WalletSummary: 'wallet',
  WalletTransaction: 'wallet',
  WorkerBooking: 'bookings',
  WorkerProfile: 'workerOperations',
  WorkerRateEstimate: 'workerOperations',
};

export function migrateApiImports(content: string): string {
  return content.replace(
    /\b(import|export)\s*\{([^}]*)\}\s*from\s*['"]@\/services\/api['"];?/g,
    (_match, kind: 'import' | 'export', body: string) => {
      const groups = new Map<string, string[]>();
      for (const raw of body.split(',')) {
        const specifier = raw.trim();
        if (!specifier) continue;
        const name = specifier
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        const target = moduleByExport[name];
        if (!target) throw new Error(`No focused service mapping for ${name}`);
        const values = groups.get(target) ?? [];
        values.push(specifier);
        groups.set(target, values);
      }
      return [...groups]
        .map(([target, values]) => `${kind} { ${values.join(', ')} } from '@/services/${target}';`)
        .join('\n');
    },
  );
}

function run(root: string) {
  const files = execFileSync(
    'rg',
    ['-l', 'from [\'"]@/services/api[\'"]', 'apps/mobile', '--glob', '*.{ts,tsx}'],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter((file) => file !== 'apps/mobile/services/api.ts');
  for (const file of files) {
    const absolute = path.join(root, file);
    writeFileSync(absolute, migrateApiImports(readFileSync(absolute, 'utf8')));
  }
  return files.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  console.info(`Migrated ${run(root)} mobile API importer(s).`);
}
