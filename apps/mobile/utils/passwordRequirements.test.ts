import { describe, expect, it } from 'vitest';
import { getPasswordRequirementState } from './passwordRequirements';

describe('getPasswordRequirementState', () => {
  it('reports each requirement independently', () => {
    expect(getPasswordRequirementState('abc', 'abc')).toEqual({
      minLength: false,
      uppercase: false,
      number: false,
      symbol: false,
      matches: true,
    });
    expect(getPasswordRequirementState('Secure1!', 'Secure1')).toEqual({
      minLength: true,
      uppercase: true,
      number: true,
      symbol: true,
      matches: false,
    });
  });

  it('does not mark an empty confirmation as matched', () => {
    expect(getPasswordRequirementState('Secure1!', '')).toMatchObject({
      matches: false,
    });
  });
});
