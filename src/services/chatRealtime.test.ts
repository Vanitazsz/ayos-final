import { describe, expect, it } from 'vitest';
import {
  createOptimisticMessage,
  mergeConversationMessages,
} from './chatRealtime';

describe('chat realtime message reconciliation', () => {
  it('creates an optimistic self message with a stable timestamp', () => {
    const now = new Date('2026-07-28T08:00:00.000Z');
    const message = createOptimisticMessage('Hello', now);
    expect(message).toEqual(
      expect.objectContaining({
        id: `optimistic:${now.getTime()}`,
        text: 'Hello',
        sender: 'self',
        createdAt: now.toISOString(),
        optimistic: true,
      }),
    );
    expect(message).not.toHaveProperty('originalText');
    expect(message).not.toHaveProperty('translatedText');
    expect(message).not.toHaveProperty('isTranslated');
  });

  it('deduplicates realtime reloads and preserves chronological order', () => {
    const later = {
      ...createOptimisticMessage(
        'Later',
        new Date('2026-07-28T08:01:00.000Z'),
      ),
      id: 'later',
      optimistic: false,
    };
    const earlier = {
      ...createOptimisticMessage(
        'Earlier',
        new Date('2026-07-28T08:00:00.000Z'),
      ),
      id: 'earlier',
      optimistic: false,
    };

    expect(
      mergeConversationMessages([later, earlier, { ...later }]).map(
        (message) => message.id,
      ),
    ).toEqual(['earlier', 'later']);
  });
});
