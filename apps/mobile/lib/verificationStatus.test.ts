import { describe, expect, it, vi } from 'vitest';
import {
  getVerificationPendingAlert,
  getVerificationPendingNotice,
  isVerificationPendingStatus,
} from './verificationStatus';

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

describe('isVerificationPendingStatus', () => {
  it('only treats submitted pending statuses as pending', () => {
    expect(isVerificationPendingStatus('PENDING')).toBe(true);
    expect(isVerificationPendingStatus('NEEDS_DOCUMENTS')).toBe(true);
    expect(isVerificationPendingStatus('APPROVED')).toBe(false);
    expect(isVerificationPendingStatus('REJECTED')).toBe(false);
    expect(isVerificationPendingStatus(null)).toBe(false);
    expect(isVerificationPendingStatus(undefined)).toBe(false);
  });
});

describe('getVerificationPendingAlert', () => {
  it('creates a non-dismissible continue alert', () => {
    const onContinue = vi.fn();
    const alert = getVerificationPendingAlert(onContinue);

    expect(alert.options).toEqual({ cancelable: false });
    expect(alert.buttons[0]?.text).toBe('Continue');
    alert.buttons[0]?.onPress?.();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
