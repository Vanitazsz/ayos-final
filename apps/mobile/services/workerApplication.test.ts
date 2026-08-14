import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signUp: vi.fn(),
  remove: vi.fn(),
  verifyEmailDeliverability: vi.fn(),
  randomUUID: vi.fn(() => 'worker-doc-id'),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signUp: mocks.signUp,
    },
    storage: {
      from: vi.fn(() => ({
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

describe('submitWorkerApplication', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.verifyEmailDeliverability.mockImplementation(
      async (email: string) => email.trim().toLowerCase(),
    );

    const workerApplication = await import('./workerApplication');
    workerApplication.clearPendingWorkerApplication();
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
});
