/**
 * Email Verification & Deliverability Utility
 * 
 * Verifies email syntax, detects common domain typos, blocks disposable/temporary email providers,
 * and performs DNS MX record checks to ensure the email address is real and deliverable before sending OTP.
 */

// Known disposable / temporary email domains to block
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  '10minutemail.com',
  '10minutemail.net',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'dispostable.com',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'tempmailaddress.com',
  'mytemp.email',
  'chacuo.net',
  'crazymailing.com',
  'generator.email',
  'inboxkitten.com',
  'minuteinbox.com',
]);

// Map of common domain typos to their corrected domain
const DOMAIN_TYPO_MAP: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.co': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmial.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yaho.com.ph': 'yahoo.com.ph',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'icould.com': 'icloud.com',
  'iclod.com': 'icloud.com',
};

export interface EmailVerificationResult {
  valid: boolean;
  normalizedEmail: string;
  suggestion?: string;
  error?: string;
}

/**
 * Validates email format and checks for domain typos and disposable emails synchronously.
 */
export function validateEmailSyntaxAndDomain(rawEmail: string): EmailVerificationResult {
  const trimmed = rawEmail.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, normalizedEmail: '', error: 'Email address is required.' };
  }

  // Basic RFC 5322 syntax regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: 'Please enter a valid email address format (e.g. name@example.com).',
    };
  }

  const [localPart, domain] = trimmed.split('@');

  // Check local-part constraints
  if (!localPart || localPart.length > 64) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: 'The email username part is invalid or too long.',
    };
  }

  // Check double dots or leading/trailing dots in local-part
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: 'Email address cannot contain consecutive, leading, or trailing dots.',
    };
  }

  // Check domain constraints
  if (!domain || domain.length > 253 || !domain.includes('.')) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: 'The email domain name is invalid.',
    };
  }

  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: 'The email domain top-level extension (e.g. .com, .ph) is invalid.',
    };
  }

  // Check for known domain typos
  if (DOMAIN_TYPO_MAP[domain]) {
    const suggestedDomain = DOMAIN_TYPO_MAP[domain];
    const suggestedEmail = `${localPart}@${suggestedDomain}`;
    return {
      valid: false,
      normalizedEmail: trimmed,
      suggestion: suggestedEmail,
      error: `Did you mean ${suggestedEmail}? Please double-check your email domain.`,
    };
  }

  // Check for disposable / temporary email domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      normalizedEmail: trimmed,
      error: 'Temporary or disposable email addresses are not allowed. Please use a valid personal or work email.',
    };
  }

  // Gmail specific username validation
  if (domain === 'gmail.com') {
    const cleanLocal = localPart.replace(/\./g, '');
    if (cleanLocal.length < 3 || cleanLocal.length > 30) {
      return {
        valid: false,
        normalizedEmail: trimmed,
        error: 'Gmail usernames must be between 3 and 30 characters long.',
      };
    }
  }

  return { valid: true, normalizedEmail: trimmed };
}

/**
 * Checks DNS MX (Mail Exchange) records for the domain using a fast DNS over HTTPS query.
 * Returns true if the domain has valid mail servers configured to receive email.
 */
export async function verifyDomainMXRecord(domain: string): Promise<{ deliverable: boolean; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // Query Google Public DNS over HTTPS for MX records
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // Fallback: assume deliverable if DNS query times out or fails
      return { deliverable: true };
    }

    const data = await res.json();

    // Status 0 is NOERROR in DNS
    if (data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0) {
      return { deliverable: true };
    }

    // Status 3 is NXDOMAIN (Domain does not exist)
    if (data.Status === 3) {
      return {
        deliverable: false,
        reason: `The email domain '${domain}' does not exist. Please check your email address.`,
      };
    }

    // If no MX records, check if domain has an A record (fallback mail server)
    const aRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`);
    if (aRes.ok) {
      const aData = await aRes.json();
      if (aData.Status === 0 && Array.isArray(aData.Answer) && aData.Answer.length > 0) {
        return { deliverable: true };
      }
    }

    return {
      deliverable: false,
      reason: `The domain '${domain}' does not have active mail servers (MX records) to receive emails.`,
    };
  } catch (err) {
    // If DNS check fails due to network or offline mode, do not block registration
    console.warn('[emailVerification] DNS MX check warning:', err);
    return { deliverable: true };
  }
}

/**
 * Full Email Deliverability Verification.
 * Performs syntax check, typo detection, disposable domain check, and DNS MX verification.
 * Throws an Error with a user-friendly message if the email is invalid or undeliverable.
 */
export async function verifyEmailDeliverability(rawEmail: string): Promise<string> {
  const syncCheck = validateEmailSyntaxAndDomain(rawEmail);
  if (!syncCheck.valid) {
    throw new Error(syncCheck.error || 'Please provide a valid email address.');
  }

  const [_, domain] = syncCheck.normalizedEmail.split('@');
  const mxCheck = await verifyDomainMXRecord(domain);
  if (!mxCheck.deliverable) {
    throw new Error(mxCheck.reason || `The domain '${domain}' cannot receive emails.`);
  }

  return syncCheck.normalizedEmail;
}
