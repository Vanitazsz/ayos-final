import { describe, expect, it } from 'vitest';
import {
  validateEmailSyntaxAndDomain,
  verifyEmailDeliverability,
} from './emailVerification';

describe('emailVerification', () => {
  describe('validateEmailSyntaxAndDomain', () => {
    it('accepts valid email addresses', () => {
      const res = validateEmailSyntaxAndDomain('user@gmail.com');
      expect(res.valid).toBe(true);
      expect(res.normalizedEmail).toBe('user@gmail.com');
    });

    it('detects common domain typos like gmai.com', () => {
      const res = validateEmailSyntaxAndDomain('user@gmai.com');
      expect(res.valid).toBe(false);
      expect(res.suggestion).toBe('user@gmail.com');
      expect(res.error).toContain('Did you mean user@gmail.com?');
    });

    it('detects domain typos like yaho.com', () => {
      const res = validateEmailSyntaxAndDomain('test@yaho.com');
      expect(res.valid).toBe(false);
      expect(res.suggestion).toBe('test@yahoo.com');
    });

    it('blocks disposable email providers', () => {
      const res = validateEmailSyntaxAndDomain('spammer@tempmail.com');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Temporary or disposable email addresses are not allowed');
    });

    it('blocks mailinator disposable addresses', () => {
      const res = validateEmailSyntaxAndDomain('fake@mailinator.com');
      expect(res.valid).toBe(false);
    });

    it('enforces Gmail username length constraints (3-30 chars)', () => {
      const res = validateEmailSyntaxAndDomain('a@gmail.com');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Gmail usernames must be between 3 and 30 characters long');
    });

    it('rejects invalid email syntax', () => {
      const res1 = validateEmailSyntaxAndDomain('invalid-email');
      expect(res1.valid).toBe(false);

      const res2 = validateEmailSyntaxAndDomain('user..name@gmail.com');
      expect(res2.valid).toBe(false);
    });
  });

  describe('verifyEmailDeliverability', () => {
    it('verifies a real domain like gmail.com', async () => {
      const email = await verifyEmailDeliverability('testuser123@gmail.com');
      expect(email).toBe('testuser123@gmail.com');
    });

    it('throws error for non-existent domain like nonexistentservice123456789.xyz', async () => {
      await expect(
        verifyEmailDeliverability('user@nonexistentservice123456789.xyz'),
      ).rejects.toThrow();
    });
  });
});
