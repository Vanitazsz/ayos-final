import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ auth: {} })),
  addEventListener: vi.fn(),
}));

vi.mock('react-native-url-polyfill/auto', () => ({}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {},
}));

vi.mock('react-native', () => ({
  AppState: { addEventListener: mocks.addEventListener },
  Platform: { OS: 'web' },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

describe('Supabase browser auth configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
  });

  it('uses the browser flow that does not require a locally stored PKCE verifier', async () => {
    await import('./supabase');

    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'publishable-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          detectSessionInUrl: true,
          flowType: 'implicit',
        }),
      }),
    );
  });
});
