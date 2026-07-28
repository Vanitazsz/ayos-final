export type { Database, Json } from './database.generated.js';

export const PRIVATE_BUCKETS = [
  'request-media',
  'verification-documents',
  'message-attachments',
  'review-media',
  'profile-images',
  'portfolio-media',
  'support-attachments',
  'topup-proofs',
  'report-exports',
] as const;

export function ownedStoragePath(accountId: string, entityId: string, fileName: string): string {
  const safeName = fileName.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  return `${accountId}/${entityId}/${crypto.randomUUID()}-${safeName}`;
}

export function realtimeTopics(id: string) {
  return {
    bookingStatus: `booking:${id}:status`,
    bookingLocation: `booking:${id}:location`,
    conversationMessages: `conversation:${id}:messages`,
    notifications: `user:${id}:notifications`,
  } as const;
}
