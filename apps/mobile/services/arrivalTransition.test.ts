import { describe, expect, it } from 'vitest';
import { shouldTransitionToArrivedAfterProximityCheck } from '@/utils/arrivalTransition';

describe('arrival transition sequencing', () => {
  it('does not repeat the arrival transition after proximity RPC confirms it', () => {
    expect(shouldTransitionToArrivedAfterProximityCheck(true, true)).toBe(false);
  });

  it('uses the client transition when location validation did not run', () => {
    expect(shouldTransitionToArrivedAfterProximityCheck(false, false)).toBe(true);
  });
});
