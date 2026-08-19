import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createURL: vi.fn(),
  getSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      verifyOtp: mocks.verifyOtp,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock('expo-linking', () => ({
  createURL: mocks.createURL,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mocks.storage,
}));

describe('password recovery flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('builds a recovery-only redirect URL instead of the normal auth callback', async () => {
    mocks.createURL.mockReturnValue(
      'ayos://auth/reset-password?flow=recovery',
    );
    const { createPasswordRecoveryRedirect } = await import('./passwordRecovery');

    expect(createPasswordRecoveryRedirect()).toBe(
      'ayos://auth/reset-password?flow=recovery',
    );
    expect(mocks.createURL).toHaveBeenCalledWith('/auth/reset-password', {
      queryParams: { flow: 'recovery' },
    });
  });

  it('exchanges a recovery code without loading the app profile', async () => {
    const session = { access_token: 'recovery-token' };
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session },
      error: null,
    });
    const { loadPasswordRecoverySession } = await import('./passwordRecovery');

    await expect(loadPasswordRecoverySession('one-time-code')).resolves.toBe(
      session,
    );
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
  });

  it('rejects a recovery flow when no session is available', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const { loadPasswordRecoverySession } = await import('./passwordRecovery');

    await expect(loadPasswordRecoverySession()).rejects.toThrow(
      'This password reset link is invalid or has expired. Request a new one.',
    );
  });

  it('verifies a token-hash recovery link only when the reset screen asks for it', async () => {
    const session = { access_token: 'recovery-token' };
    mocks.verifyOtp.mockResolvedValue({
      data: { session },
      error: null,
    });
    const { verifyPasswordRecoveryToken } = await import('./passwordRecovery');

    await expect(
      verifyPasswordRecoveryToken('token-hash-from-email'),
    ).resolves.toBe(session);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'token-hash-from-email',
      type: 'recovery',
    });
  });

  it('closes only the local recovery session after a password change', async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    const { closePasswordRecoverySession } = await import('./passwordRecovery');

    await closePasswordRecoverySession();

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.storage.removeItem).toHaveBeenCalledWith(
      'password_recovery_pending',
    );
  });

  it('keeps the recovery lock when local sign-out fails', async () => {
    mocks.signOut.mockResolvedValue({ error: new Error('sign-out failed') });
    const { closePasswordRecoverySession } = await import('./passwordRecovery');

    await expect(closePasswordRecoverySession()).rejects.toThrow(
      'sign-out failed',
    );
    expect(mocks.storage.removeItem).not.toHaveBeenCalled();
  });

  it('persists the recovery lock until the local session is closed', async () => {
    const {
      hasPendingPasswordRecovery,
      markPasswordRecoveryPending,
    } = await import('./passwordRecovery');
    mocks.storage.getItem.mockResolvedValue('true');

    await markPasswordRecoveryPending();

    await expect(hasPendingPasswordRecovery()).resolves.toBe(true);
    expect(mocks.storage.setItem).toHaveBeenCalledWith(
      'password_recovery_pending',
      'true',
    );
  });

  it('provides confirmation copy after a password reset completes', async () => {
    const {
      PASSWORD_RECOVERY_SUCCESS_MESSAGE,
      PASSWORD_RECOVERY_SUCCESS_TITLE,
    } = await import('./passwordRecovery');

    expect(PASSWORD_RECOVERY_SUCCESS_TITLE).toBe('Password changed');
    expect(PASSWORD_RECOVERY_SUCCESS_MESSAGE).toBe(
      'Your password has been changed successfully. Please sign in with your new password.',
    );
  });

  it('starts recovery for a reset route only once per route lifecycle', async () => {
    const { shouldStartPasswordRecoveryForRoute } = await import(
      './passwordRecovery'
    );

    expect(shouldStartPasswordRecoveryForRoute(true, false)).toBe(true);
    expect(shouldStartPasswordRecoveryForRoute(true, true)).toBe(false);
    expect(shouldStartPasswordRecoveryForRoute(false, false)).toBe(false);
  });

  it('recognizes a session created through password recovery', async () => {
    const payload = JSON.stringify({
      amr: [{ method: 'recovery', timestamp: 1 }],
    });
    const accessToken = `header.${Buffer.from(payload).toString('base64url')}.sig`;
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
      error: null,
    });
    const { hasActiveRecoverySession } = await import('./passwordRecovery');

    await expect(hasActiveRecoverySession()).resolves.toBe(true);
  });

  it('recognizes a recovery method in the RFC-8176 string form', async () => {
    const payload = JSON.stringify({ amr: ['recovery'] });
    const accessToken = `header.${Buffer.from(payload).toString('base64url')}.sig`;
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
      error: null,
    });
    const { hasActiveRecoverySession } = await import('./passwordRecovery');

    await expect(hasActiveRecoverySession()).resolves.toBe(true);
  });

  it('does not treat a normal password session as recovery', async () => {
    const payload = JSON.stringify({
      amr: [{ method: 'password', timestamp: 1 }],
    });
    const accessToken = `header.${Buffer.from(payload).toString('base64url')}.sig`;
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
      error: null,
    });
    const { hasActiveRecoverySession } = await import('./passwordRecovery');

    await expect(hasActiveRecoverySession()).resolves.toBe(false);
  });

  it('reports no active recovery when there is no session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { hasActiveRecoverySession } = await import('./passwordRecovery');

    await expect(hasActiveRecoverySession()).resolves.toBe(false);
  });

  it('keeps the lock and starts recovery while a recovery session is active', async () => {
    const payload = JSON.stringify({
      amr: [{ method: 'recovery', timestamp: 1 }],
    });
    const accessToken = `header.${Buffer.from(payload).toString('base64url')}.sig`;
    mocks.storage.getItem.mockResolvedValue('true');
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
      error: null,
    });
    const { resolvePendingPasswordRecovery } = await import('./passwordRecovery');

    await expect(resolvePendingPasswordRecovery()).resolves.toBe(true);
    expect(mocks.storage.removeItem).not.toHaveBeenCalled();
  });

  it('clears a stale lock when the session is not a recovery session', async () => {
    const payload = JSON.stringify({
      amr: [{ method: 'password', timestamp: 1 }],
    });
    const accessToken = `header.${Buffer.from(payload).toString('base64url')}.sig`;
    mocks.storage.getItem.mockResolvedValue('true');
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken } },
      error: null,
    });
    const { resolvePendingPasswordRecovery } = await import('./passwordRecovery');

    await expect(resolvePendingPasswordRecovery()).resolves.toBe(false);
    expect(mocks.storage.removeItem).toHaveBeenCalledWith(
      'password_recovery_pending',
    );
  });

  it('does nothing when no recovery lock is present', async () => {
    mocks.storage.getItem.mockResolvedValue(null);
    const { resolvePendingPasswordRecovery } = await import('./passwordRecovery');

    await expect(resolvePendingPasswordRecovery()).resolves.toBe(false);
    expect(mocks.storage.removeItem).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});
