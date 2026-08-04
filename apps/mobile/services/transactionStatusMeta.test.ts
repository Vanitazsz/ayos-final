import { describe, expect, it } from 'vitest';

import { transactionStatusKind } from './transactionStatusMeta';

describe('transactionStatusKind', () => {
  it('classifies completed as success', () => {
    expect(transactionStatusKind('completed')).toBe('success');
  });

  it('classifies pending as warning', () => {
    expect(transactionStatusKind('pending')).toBe('warning');
  });

  it('classifies everything else as error', () => {
    expect(transactionStatusKind('failed')).toBe('error');
    expect(transactionStatusKind(undefined)).toBe('error');
  });
});
