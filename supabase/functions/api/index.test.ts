import { assertEquals } from 'jsr:@std/assert@1';
import { handleApiRequest } from './index.ts';

function request(path = '/admin/settings', method = 'GET') {
  return new Request(`http://localhost${path}`, { method });
}

function dependencies(
  auth: 'unauthenticated' | 'user' | 'admin',
  settings: {
    commissionRate: number;
    homeownerCharge: number;
    serviceCategoryOverrides: Array<Record<string, unknown>>;
  } = {
    commissionRate: 10,
    homeownerCharge: 0,
    serviceCategoryOverrides: [],
  },
) {
  if (auth === 'unauthenticated') {
    return {
      requestContext: () => Promise.reject(new Error('authentication_required')),
    } as never;
  }

  return {
    requestContext: () =>
      Promise.resolve({
        client: {
          rpc: (name: string) => {
            if (name === 'is_admin') {
              return Promise.resolve({ data: auth === 'admin', error: null });
            }
            return Promise.resolve({ data: settings, error: null });
          },
        },
      }),
  } as never;
}

Deno.test('requires authentication for admin settings', async () => {
  const response = await handleApiRequest(request(), dependencies('unauthenticated'));
  assertEquals(response.status, 401);
});

Deno.test('requires an AAL2 administrator', async () => {
  const response = await handleApiRequest(request(), dependencies('user'));
  assertEquals(response.status, 403);
});

Deno.test('returns the stable platform and category settings shape', async () => {
  const response = await handleApiRequest(
    request(),
    dependencies('admin', {
      commissionRate: 10,
      homeownerCharge: 25,
      serviceCategoryOverrides: [
        { id: 'category-1', name: 'Plumbing', commissionRatePercent: 7.5 },
      ],
    }),
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.data, {
    platform: { commissionRate: 10, homeownerCharge: 25 },
    serviceCategoryOverrides: [{ id: 'category-1', name: 'Plumbing', commissionRatePercent: 7.5 }],
  });
});

Deno.test('does not expose unsupported methods or paths', async () => {
  assertEquals((await handleApiRequest(request('/admin/settings', 'POST'))).status, 404);
  assertEquals((await handleApiRequest(request('/other', 'GET'))).status, 404);
});
