import { describe, expect, it } from 'vitest';
import { redact } from './index.js';

describe('redaction', () => {
  it('redacts secrets and precise locations recursively', () => {
    expect(redact({ email: 'a@example.com', token: 'secret', nested: { latitude: 14.5 } })).toEqual(
      {
        email: 'a@example.com',
        token: '[REDACTED]',
        nested: { latitude: '[REDACTED]' },
      },
    );
  });
});
