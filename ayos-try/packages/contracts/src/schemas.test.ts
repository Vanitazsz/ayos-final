import { describe, expect, it } from 'vitest';
import { aiAnalysisRequestSchema, aiAnalysisResultSchema } from './ai.js';
import { geoCoordinateSchema, pointFeature } from './geo.js';
import { registerSchema, resendOtpSchema } from './schemas.js';

describe('registerSchema', () => {
  it('accepts a valid single-role user registration', () => {
    const parsed = registerSchema.parse({
      role: 'USER',
      name: 'Test Account',
      mobile: '+639171234567',
      email: 'USER@example.test',
      password: 'CorrectHorse9',
      confirmPassword: 'CorrectHorse9',
      acceptedTerms: true,
    });

    expect(parsed.email).toBe('user@example.test');
  });

  it('rejects administrator self-registration', () => {
    expect(() =>
      registerSchema.parse({
        role: 'ADMIN',
        name: 'Admin',
        mobile: '+639171234567',
        email: 'admin@example.com',
        password: 'CorrectHorse9',
        confirmPassword: 'CorrectHorse9',
        acceptedTerms: true,
      }),
    ).toThrow();
  });
});

describe('resendOtpSchema', () => {
  it('requires an existing UUID challenge identifier', () => {
    expect(resendOtpSchema.parse({ challengeId: '11111111-1111-4111-8111-111111111111' })).toEqual({
      challengeId: '11111111-1111-4111-8111-111111111111',
    });
    expect(() => resendOtpSchema.parse({ challengeId: 'not-a-challenge' })).toThrow();
  });
});

describe('AI and map contracts', () => {
  it('requires the input appropriate to the selected AI modality', () => {
    expect(() =>
      aiAnalysisRequestSchema.parse({ inputType: 'IMAGE', idempotencyKey: '0123456789abcdef' }),
    ).toThrow();
    expect(
      aiAnalysisRequestSchema.parse({
        inputType: 'TEXT',
        text: 'A leaking pipe below the kitchen sink.',
        idempotencyKey: '0123456789abcdef',
      }).inputType,
    ).toBe('TEXT');
  });

  it('rejects inverted cost estimates and invalid coordinates', () => {
    expect(() =>
      aiAnalysisResultSchema.parse({
        detectedIssue: 'Pipe leak',
        severity: 'MEDIUM',
        possibleCause: 'Loose coupling',
        suggestedCategory: 'Plumbing',
        estimatedCostMinimum: 1000,
        estimatedCostMaximum: 500,
        safetyAdvice: 'Turn off the water supply.',
        requestDraft: 'Repair the leaking pipe below the kitchen sink.',
      }),
    ).toThrow();
    expect(() => geoCoordinateSchema.parse({ latitude: 91, longitude: 121 })).toThrow();
    expect(pointFeature({ latitude: 14.5995, longitude: 120.9842 }).geometry.coordinates).toEqual([
      120.9842, 14.5995,
    ]);
  });
});
