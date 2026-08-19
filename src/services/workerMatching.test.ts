import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mocks.rpc },
}));

import { saveWorkerMatchingSetup } from './workerMatching';

describe('saveWorkerMatchingSetup', () => {
  it('saves matching settings without a weekly schedule payload', async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });

    const input = {
      latitude: 14.28,
      longitude: 120.88,
      radiusMeters: 20_000,
      serviceArea: ' Trece Martires City ',
      online: true,
    } as unknown as Parameters<typeof saveWorkerMatchingSetup>[0];

    await saveWorkerMatchingSetup(input);

    expect(mocks.rpc).toHaveBeenCalledWith('save_my_worker_matching_setup', {
      p_latitude: 14.28,
      p_longitude: 120.88,
      p_radius_meters: 20_000,
      p_service_area: 'Trece Martires City',
      p_online: true,
    });
    expect(mocks.rpc.mock.calls[0]?.[1]).not.toHaveProperty('p_schedule');
  });
});
