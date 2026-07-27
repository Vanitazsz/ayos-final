import { assertEquals, assertThrows } from 'jsr:@std/assert@1.0.19';
import { parseExpoPushTickets } from './expo-push.ts';

Deno.test('normalizes successful and invalid Expo push tickets', () => {
  assertEquals(
    parseExpoPushTickets(
      {
        data: [
          { status: 'ok', id: 'ticket-1' },
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
        ],
      },
      2,
    ),
    [
      { status: 'SENT', providerReference: 'ticket-1' },
      { status: 'INVALID_TOKEN', failureReason: 'DeviceNotRegistered' },
    ],
  );
});

Deno.test('rejects malformed Expo push responses', () => {
  assertThrows(() => parseExpoPushTickets({ data: [] }, 1), Error, 'EXPO_PUSH_MALFORMED_RESPONSE');
});
