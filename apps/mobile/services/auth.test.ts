import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  createURL: vi.fn(() => 'ayos://auth/callback'),
  maybeCompleteAuthSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  },
}));

vi.mock('@/lib/workerRegistration', () => ({
  normalizePhilippinePhone: vi.fn(() => '+639171234567'),
  signupErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Unable to create your account.',
}));

vi.mock('expo-linking', () => ({
  createURL: mocks.createURL,
}));

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: mocks.maybeCompleteAuthSession,
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('@/services/authenticatedFunctions', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}));

vi.mock('@/services/apiCore', () => ({
  invalidateUserCache: vi.fn(),
}));

describe('signUpCustomer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects an existing confirmed account instead of sending it to OTP verification', async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        session: null,
        user: {
          email: 'existing@example.com',
          email_confirmed_at: '2026-07-22T05:43:44.855Z',
          identities: [],
        },
      },
      error: null,
    });

    const { signUpCustomer } = await import('./auth');

    await expect(
      signUpCustomer({
        email: 'existing@example.com',
        password: 'Password1!',
        name: 'Example User',
        mobile: '+639171234567',
      }),
    ).rejects.toThrow(
      'An account with this email already exists. Sign in to continue.',
    );
  });
});

describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses the recovery-only screen as the Supabase redirect', async () => {
    mocks.createURL.mockReturnValue(
      'ayos://auth/reset-password?flow=recovery',
    );
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    const { requestPasswordReset } = await import('./auth');

    await requestPasswordReset(' User@example.com ');

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      { redirectTo: 'ayos://auth/reset-password?flow=recovery' },
    );
  });

  it('coalesces duplicate reset requests and blocks another request during the cooldown', async () => {
    let resolveRequest!: (value: { error: null }) => void;
    mocks.resetPasswordForEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { requestPasswordReset } = await import('./auth');

    const firstRequest = requestPasswordReset(' User@example.com ');
    const duplicateRequest = requestPasswordReset('user@example.com');

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    resolveRequest({ error: null });
    await Promise.all([firstRequest, duplicateRequest]);

    await expect(requestPasswordReset('user@example.com')).rejects.toThrow(
      'A reset link was already requested recently. Use the newest email before requesting another one.',
    );
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });
});
