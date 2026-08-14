import { describe, expect, it } from 'vitest';
import { getVerificationPendingNotice } from './verificationStatus';

describe('getVerificationPendingNotice', () => {
  it('returns the approved pending verification notice copy', () => {
    expect(getVerificationPendingNotice()).toEqual({
      title: 'Verification pending',
      message:
        'Verification may take 2–3 days after complete documents are submitted.',
      actionLabel: 'Continue',
    });
  });
});
