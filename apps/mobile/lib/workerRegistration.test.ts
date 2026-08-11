import { describe, expect, it } from 'vitest';
import {
  isValidPhilippinePhone,
  normalizePhilippinePhone,
  signupErrorMessage,
  workerRegistrationErrorMessage,
} from './workerRegistration';

describe('normalizePhilippinePhone', () => {
  it('converts a local mobile number starting with 09 to E.164', () => {
    expect(normalizePhilippinePhone('09171234567')).toBe('+639171234567');
  });

  it('converts numbers starting with 9 or 639 to E.164', () => {
    expect(normalizePhilippinePhone('9171234567')).toBe('+639171234567');
    expect(normalizePhilippinePhone('639171234567')).toBe('+639171234567');
  });

  it('preserves an E.164 Philippine mobile number', () => {
    expect(normalizePhilippinePhone('+639171234567')).toBe('+639171234567');
  });

  it('removes surrounding and embedded whitespace or hyphens', () => {
    expect(normalizePhilippinePhone(' 0917 123-4567 ')).toBe('+639171234567');
  });

  it('rejects invalid numbers', () => {
    expect(() => normalizePhilippinePhone('0917123')).toThrow(
      'Enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567).',
    );
  });

  it('provides validation without throwing', () => {
    expect(isValidPhilippinePhone('09171234567')).toBe(true);
    expect(isValidPhilippinePhone('+639171234567')).toBe(true);
    expect(isValidPhilippinePhone('0917123')).toBe(false);
  });
});

describe('workerRegistrationErrorMessage', () => {
  it('replaces an empty JSON error message', () => {
    expect(workerRegistrationErrorMessage({ message: '{}' })).toBe(
      'Worker registration could not be submitted. Please try again.',
    );
  });

  it('maps masked Auth signup failures to an actionable message', () => {
    expect(
      workerRegistrationErrorMessage({
        code: 'unexpected_failure',
        message: '{}',
        status: 500,
      }),
    ).toBe(
      'Your worker account could not be created. Check your mobile number and try again.',
    );
  });

  it('prefers a readable message over an unknown error code', () => {
    expect(
      workerRegistrationErrorMessage({
        code: 'UNKNOWN_CODE',
        message: 'Readable failure',
      }),
    ).toBe('Readable failure');
  });

  it('maps a duplicate mobile to an actionable message', () => {
    expect(
      workerRegistrationErrorMessage({
        code: 'MOBILE_ALREADY_REGISTERED',
        message: '{}',
      }),
    ).toBe(
      'This mobile number is already registered. Sign in or use a different number.',
    );
  });

  it('maps a raw unique-constraint violation on mobile to the same message', () => {
    expect(
      workerRegistrationErrorMessage({
        message: 'Database error saving new user',
        details: 'duplicate key value violates unique constraint "accounts_mobile_key"',
      }),
    ).toBe(
      'This mobile number is already registered. Sign in or use a different number.',
    );
  });
});

describe('signupErrorMessage', () => {
  it('maps a duplicate mobile to an actionable message', () => {
    expect(signupErrorMessage({ code: 'MOBILE_ALREADY_REGISTERED' })).toBe(
      'This mobile number is already registered. Sign in or use a different number.',
    );
  });

  it('maps a masked Auth signup failure to an actionable message', () => {
    expect(
      signupErrorMessage({ code: 'unexpected_failure', message: '{}' }),
    ).toBe('An account with this email or mobile number already exists. Please sign in instead.');
  });

  it('keeps a readable message over an unknown code', () => {
    expect(
      signupErrorMessage({ code: 'UNKNOWN_CODE', message: 'Readable failure' }),
    ).toBe('Readable failure');
  });

  it('falls back when no usable detail is present', () => {
    expect(signupErrorMessage({})).toBe(
      'Registration failed. Please check your details and try again.',
    );
  });
});
