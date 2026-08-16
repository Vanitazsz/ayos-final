import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const storageStore = new Map<string, string>();
  return {
    getSession: vi.fn(),
    signUp: vi.fn(),
    rpc: vi.fn(),
    upload: vi.fn(async () => ({ data: { path: 'worker-user-id/worker-doc-id.jpg' }, error: null })),
    remove: vi.fn(),
    verifyEmailDeliverability: vi.fn(),
    randomUUID: vi.fn(() => 'worker-doc-id'),
    storage: {
      getItem: vi.fn(async (key: string) => storageStore.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        storageStore.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        storageStore.delete(key);
      }),
    },
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signUp: mocks.signUp,
    },
    rpc: mocks.rpc,
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
        remove: mocks.remove,
      })),
    },
  },
}));

vi.mock('@/lib/emailVerification', () => ({
  verifyEmailDeliverability: mocks.verifyEmailDeliverability,
}));

vi.mock('@/lib/crypto', () => ({
  randomUUID: mocks.randomUUID,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mocks.storage,
}));

const fakeFetch = vi.fn(async () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(8),
}));

beforeEach(() => {
  globalThis.fetch = fakeFetch as unknown as typeof fetch;
});

describe('submitWorkerApplication', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.verifyEmailDeliverability.mockImplementation(
      async (email: string) => email.trim().toLowerCase(),
    );

    const workerApplication = await import('./workerApplication');
    await workerApplication.clearPendingWorkerApplication();
  });

  it('rejects an empty-identity signup instead of sending duplicate email registrations to OTP', async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        session: null,
        user: {
          id: 'worker-user-id',
          email: 'existing-worker@example.test',
          identities: [],
        },
      },
      error: null,
    });

    const workerApplication = await import('./workerApplication');
    const application = {
      email: 'existing-worker@example.test',
      password: 'Password1!',
      displayName: 'Existing Worker',
      bio: 'Cleaning — freelance',
      experience: 'Deep Cleaning',
      frontId: 'file:///front-id.jpg',
      backId: 'file:///back-id.jpg',
      identityData: {
        phone: '09179998888',
        contactPhone: '09189997777',
      },
    };

    await expect(
      workerApplication.submitWorkerApplication(application),
    ).rejects.toThrow(
      'An account already exists for this email. Sign in to continue.',
    );
    expect(workerApplication.getPendingWorkerApplication()).toBeNull();
  });

  it('persists a pending application so it survives an app restart', async () => {
    const workerApplication = await import('./workerApplication');
    const application = {
      email: 'worker@example.test',
      password: 'Password1!',
      displayName: 'Persistent Worker',
      bio: 'Cleaning — freelance',
      experience: 'Deep Cleaning',
      frontId: 'file:///front-id.jpg',
      backId: 'file:///back-id.jpg',
      identityData: {
        phone: '09179998888',
        contactPhone: '09189997777',
      },
    };

    await workerApplication.savePendingWorkerApplication(application);
    expect(mocks.storage.setItem).toHaveBeenCalledWith(
      'pending-worker-application',
      JSON.stringify(application),
    );

    // Simulate an app restart: the module is re-evaluated with an empty
    // in-memory buffer, but the persisted copy must still be restorable.
    vi.resetModules();
    const reloaded = await import('./workerApplication');
    expect(reloaded.getPendingWorkerApplication()).toBeNull();

    await reloaded.hydratePendingWorkerApplication();
    expect(reloaded.getPendingWorkerApplication()).toEqual(application);
  });

  it('clears the persisted application alongside the in-memory buffer', async () => {
    const workerApplication = await import('./workerApplication');
    const application = {
      email: 'worker@example.test',
      password: 'Password1!',
      displayName: 'Persistent Worker',
      bio: 'Cleaning — freelance',
      experience: 'Deep Cleaning',
      frontId: 'file:///front-id.jpg',
      backId: 'file:///back-id.jpg',
      identityData: {
        phone: '09179998888',
        contactPhone: '09189997777',
      },
    };

    await workerApplication.savePendingWorkerApplication(application);
    await workerApplication.clearPendingWorkerApplication();

    expect(workerApplication.getPendingWorkerApplication()).toBeNull();
    expect(mocks.storage.removeItem).toHaveBeenCalledWith(
      'pending-worker-application',
    );

    const reloaded = await import('./workerApplication');
    await reloaded.hydratePendingWorkerApplication();
    expect(reloaded.getPendingWorkerApplication()).toBeNull();
  });

  it('mirrors the pending application to the server with a resume token', async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        session: null,
        user: {
          id: 'worker-user-id',
          email: 'worker@example.test',
          identities: [{ id: 'identity-1' }],
        },
      },
      error: null,
    });

    const workerApplication = await import('./workerApplication');
    const application = {
      email: 'worker@example.test',
      password: 'Password1!',
      displayName: 'Mirrored Worker',
      bio: 'Cleaning — freelance',
      experience: 'Deep Cleaning',
      frontId: 'file:///front-id.jpg',
      backId: 'file:///back-id.jpg',
      identityData: {
        phone: '09179998888',
        contactPhone: '09189997777',
      },
    };

    const result = await workerApplication.submitWorkerApplication(application);

    expect(result).toEqual({
      requiresEmailVerification: true,
      resumeToken: 'worker-doc-id',
    });
    const savedArgs = mocks.rpc.mock.calls.find(
      ([name]) => name === 'save_pending_worker_registration',
    );
    expect(savedArgs).toBeDefined();
    expect(savedArgs![1]).toMatchObject({
      p_resume_token: 'worker-doc-id',
      p_email: 'worker@example.test',
    });
    const payload = savedArgs![1].p_payload;
    expect(payload.resumeToken).toBe('worker-doc-id');
    expect(payload.frontId).toMatch(/^data:image\/jpeg;base64,/);
    expect(payload.backId).toMatch(/^data:image\/jpeg;base64,/);
    expect(workerApplication.getPendingWorkerApplication()).toMatchObject({
      ...application,
      resumeToken: 'worker-doc-id',
    });
  });

  it('accepts a session email that differs only by case from the application', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'worker-user-id',
            email: 'WORKER@example.test',
          },
        },
      },
    });
    mocks.rpc
      .mockResolvedValueOnce({
        data: {
          account: { id: 'worker-user-id', role: 'WORKER' },
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: {}, error: null });

    const workerApplication = await import('./workerApplication');
    const application = {
      email: 'worker@example.test',
      password: 'Password1!',
      displayName: 'Case Insensitive Worker',
      bio: 'Cleaning — freelance',
      experience: 'Deep Cleaning',
      frontId: 'file:///front-id.jpg',
      backId: 'file:///back-id.jpg',
      identityData: {
        phone: '09179998888',
        contactPhone: '09189997777',
      },
    };

    const result = await workerApplication.submitWorkerApplication(application);

    expect(result.requiresEmailVerification).toBe(false);
    expect(workerApplication.getPendingWorkerApplication()).toBeNull();
  });

  it('resumes a pending application from the server when the local copy is gone', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'worker-user-id',
            email: 'worker@example.test',
          },
        },
      },
    });
    const storedApplication = {
      email: 'worker@example.test',
      password: 'Password1!',
      displayName: 'Resumed Worker',
      bio: 'Cleaning — freelance',
      experience: 'Deep Cleaning',
      frontId: 'data:image/jpeg;base64,Zm9v',
      backId: 'data:image/jpeg;base64,YmFy',
      identityData: {
        phone: '09179998888',
        contactPhone: '09189997777',
      },
      resumeToken: 'server-token-123',
    };
    mocks.rpc
      .mockResolvedValueOnce({ data: storedApplication, error: null })
      .mockResolvedValueOnce({
        data: {
          account: { id: 'worker-user-id', role: 'WORKER' },
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: {}, error: null });

    const workerApplication = await import('./workerApplication');
    const completion = await workerApplication.completePendingWorkerApplication(
      'server-token-123',
    );

    expect(completion.completed).toBe(true);
    const getCall = mocks.rpc.mock.calls.find(
      ([name]) => name === 'get_pending_worker_registration',
    );
    expect(getCall).toBeDefined();
    expect(getCall![1]).toEqual({ p_resume_token: 'server-token-123' });
    expect(workerApplication.getPendingWorkerApplication()).toBeNull();
  });

  it('does not submit when neither a local nor a server copy exists', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'worker-user-id',
            email: 'worker@example.test',
          },
        },
      },
    });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });

    const workerApplication = await import('./workerApplication');
    const completion =
      await workerApplication.completePendingWorkerApplication('missing-token');

    expect(completion.completed).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('get_pending_worker_registration', {
      p_resume_token: 'missing-token',
    });
  });
});
