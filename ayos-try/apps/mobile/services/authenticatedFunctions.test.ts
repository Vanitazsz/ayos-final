import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
  invoke: vi.fn(),
  expireSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
      signOut: mocks.signOut,
    },
    functions: { invoke: mocks.invoke },
  },
}));

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ expireSession: mocks.expireSession }),
  },
}));

const session = (token: string, expiresInSeconds = 3600) => ({
  access_token: token,
  refresh_token: `refresh-${token}`,
  expires_in: expiresInSeconds,
  expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  token_type: 'bearer',
  user: { id: 'user-id' },
});

const authError = () => ({
  context: new Response(
    JSON.stringify({ code: 'authentication_required', message: 'Authentication required' }),
    { status: 401, headers: { 'content-type': 'application/json' } },
  ),
});

describe('invokeAuthenticatedFunction', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('uses a valid session without refreshing', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('valid') }, error: null });
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const { invokeAuthenticatedFunction } = await import('./authenticatedFunctions');

    await expect(invokeAuthenticatedFunction('example')).resolves.toEqual({ ok: true });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledWith(
      'example',
      expect.objectContaining({ headers: { Authorization: 'Bearer valid' } }),
    );
  });

  it('refreshes a near-expiry session before invoking', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('old', 30) }, error: null });
    mocks.refreshSession.mockResolvedValue({ data: { session: session('fresh') }, error: null });
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const { invokeAuthenticatedFunction } = await import('./authenticatedFunctions');

    await invokeAuthenticatedFunction('example');
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith(
      'example',
      expect.objectContaining({ headers: { Authorization: 'Bearer fresh' } }),
    );
  });

  it('refreshes and retries once after an authentication response', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('old') }, error: null });
    mocks.refreshSession.mockResolvedValue({ data: { session: session('fresh') }, error: null });
    mocks.invoke
      .mockResolvedValueOnce({ data: null, error: authError() })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const { invokeAuthenticatedFunction } = await import('./authenticatedFunctions');

    await expect(invokeAuthenticatedFunction('example')).resolves.toEqual({ ok: true });
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('expires local auth when refresh fails', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('old', 30) }, error: null });
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('failed') });
    const { invokeAuthenticatedFunction, SessionExpiredError } = await import(
      './authenticatedFunctions'
    );

    await expect(invokeAuthenticatedFunction('example')).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(mocks.expireSession).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('preserves non-authentication function errors', async () => {
    const providerError = new Error('provider unavailable');
    mocks.getSession.mockResolvedValue({ data: { session: session('valid') }, error: null });
    mocks.invoke.mockResolvedValue({ data: null, error: providerError });
    const { invokeAuthenticatedFunction } = await import('./authenticatedFunctions');

    await expect(invokeAuthenticatedFunction('example')).rejects.toBe(providerError);
    expect(mocks.expireSession).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent refresh operations', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('old', 30) }, error: null });
    let finishRefresh: ((value: unknown) => void) | undefined;
    mocks.refreshSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve;
        }),
    );
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const { invokeAuthenticatedFunction } = await import('./authenticatedFunctions');

    const first = invokeAuthenticatedFunction('first');
    const second = invokeAuthenticatedFunction('second');
    await vi.waitFor(() => expect(mocks.refreshSession).toHaveBeenCalledTimes(1));
    finishRefresh?.({ data: { session: session('fresh') }, error: null });

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });
});

