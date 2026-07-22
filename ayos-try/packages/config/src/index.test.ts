import { describe, expect, it } from 'vitest';
import { assertProductionProviders } from './index.js';

describe('provider configuration', () => {
  it('fails closed in production', () => {
    expect(() => assertProductionProviders('production', { ai: 'local-test-only' })).toThrow('ai');
    expect(() => assertProductionProviders('development', { ai: 'local-test-only' })).not.toThrow();
  });
});
