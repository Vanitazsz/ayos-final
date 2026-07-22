import { describe, expect, it } from 'vitest';
import { ownedStoragePath, realtimeTopics } from './index.js';

describe('Supabase client contracts', () => {
  it('creates an owner-prefixed, sanitized private object path', () => {
    expect(ownedStoragePath('account', 'request', '../photo one.png')).toMatch(
      /^account\/request\/[\w-]+-.._photo_one\.png$/,
    );
  });

  it('uses the private topic naming contract', () => {
    expect(realtimeTopics('123').bookingStatus).toBe('booking:123:status');
    expect(realtimeTopics('123').notifications).toBe('user:123:notifications');
  });
});
