import { describe, expect, it } from 'vitest';
import { getWorkerRegistrationReadiness } from './profileReadiness';

describe('getWorkerRegistrationReadiness', () => {
  it('identifies the first incomplete registration step', () => {
    expect(
      getWorkerRegistrationReadiness({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+639171234567',
        birthday: '01/01/1990',
        industryValue: '',
        selectedSkills: [],
        street: '1 Main St',
        city: 'Manila',
        region: 'NCR',
      }),
    ).toEqual({
      complete: false,
      missing: ['Industry', 'At least one skill'],
      firstIncompleteStep: 2,
    });
  });

  it('is complete when account, service, and address fields are present', () => {
    expect(
      getWorkerRegistrationReadiness({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+639171234567',
        birthday: '01/01/1990',
        industryValue: 'electrical',
        selectedSkills: ['wiring'],
        street: '1 Main St',
        city: 'Manila',
        region: 'NCR',
      }),
    ).toEqual({ complete: true, missing: [], firstIncompleteStep: null });
  });
});
