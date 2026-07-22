const EMPTY_ERROR_MESSAGES = new Set(['{}', '[]', '[object Object]']);

export function normalizePhilippinePhone(value: string): string {
  const compact = value.trim().replace(/\s+/g, '');
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
  if (/^\+639\d{9}$/.test(compact)) return compact;
  throw new Error('Enter a valid Philippine mobile number.');
}

export function isValidPhilippinePhone(value: string): boolean {
  try {
    normalizePhilippinePhone(value);
    return true;
  } catch {
    return false;
  }
}

function usefulErrorValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const message = value.trim();
  if (!message || EMPTY_ERROR_MESSAGES.has(message)) return null;
  return message;
}

export function workerRegistrationErrorMessage(error: unknown): string {
  const record =
    error && typeof error === 'object'
      ? (error as {
          code?: unknown;
          error_code?: unknown;
          message?: unknown;
          details?: unknown;
          hint?: unknown;
        })
      : null;
  const code = usefulErrorValue(record?.code ?? record?.error_code);
  const message = usefulErrorValue(record?.message);
  const inheritedMessage = usefulErrorValue(
    error instanceof Error ? error.message : null,
  );
  const details = usefulErrorValue(record?.details);
  const hint = usefulErrorValue(record?.hint);
  const values = [code, message, inheritedMessage, details, hint]
    .map(usefulErrorValue)
    .filter((value): value is string => Boolean(value));
  const diagnostic = values.join(' ');

  if (/INVALID_MOBILE_NUMBER|accounts_mobile_check/i.test(diagnostic))
    return 'Enter a valid Philippine mobile number.';
  if (/WORKER_ROLE_REQUIRED|WORKER_PROFILE_NOT_FOUND/i.test(diagnostic))
    return 'Sign in with the worker account used for this registration.';
  if (/INVALID_WORKER_SKILLS/i.test(diagnostic))
    return 'Select active skills that belong to your chosen industry.';
  if (/INVALID_WORKER_ONBOARDING/i.test(diagnostic))
    return 'Review your personal, address, contact, and consent information.';
  if (/INVALID_VERIFICATION_DOCUMENT/i.test(diagnostic))
    return 'The uploaded ID documents could not be validated. Upload them again.';
  if (/VERIFICATION_CANNOT_BE_RESUBMITTED/i.test(diagnostic))
    return 'This worker verification can no longer be resubmitted.';
  if (/user_already_exists|already registered|already exists/i.test(diagnostic))
    return 'An account already exists for this email. Sign in to continue.';
  if (
    /over_email_send_rate_limit|rate.?limit|too many requests/i.test(diagnostic)
  )
    return 'Too many registration attempts. Wait a few minutes and try again.';
  if (/unexpected_failure|database error saving new user/i.test(diagnostic))
    return 'Your worker account could not be created. Check your mobile number and try again.';

  return (
    message ??
    inheritedMessage ??
    details ??
    hint ??
    code ??
    'Worker registration could not be submitted. Please try again.'
  );
}
