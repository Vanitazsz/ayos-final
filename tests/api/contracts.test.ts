import { describe, expect, it } from 'vitest';
import { assertProductionProviders } from '@ayos/config';
import { createPaymentSchema } from '@ayos/contracts';
import { assertPaymentMethodEnabled } from '@ayos/domain';

describe('Supabase boundary contracts', () => {
  it('accepts GCash as an enabled persisted payment method', () => {
    const input = createPaymentSchema.parse({
      bookingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      method: 'GCASH',
      idempotencyKey: '0123456789abcdef',
    });
    expect(input.method).toBe('GCASH');
    expect(() => assertPaymentMethodEnabled(input.method)).not.toThrow();
  });

  it('rejects test-only providers in production', () => {
    expect(() => assertProductionProviders('production', { ai: 'local-test-only' })).toThrow();
  });
});
