import { assertEquals } from 'jsr:@std/assert@1';
import { handleRecordAuthSession } from './index.ts';

const accountId = 'b1000000-0000-0000-0000-000000000001';

function token(sessionId?: string) {
  const payload = btoa(JSON.stringify(sessionId ? { session_id: sessionId } : { sub: accountId }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `header.${payload}.signature`;
}

function request(sessionId?: string) {
  return new Request('http://localhost/record-auth-session', {
    method: 'POST',
    headers: { authorization: `Bearer ${token(sessionId)}` },
  });
}

function dependencies(
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>,
) {
  return {
    requireAccount: () => Promise.resolve({ user: { id: accountId }, account: { id: accountId } }),
    adminClient: () => ({ rpc }),
  } as never;
}

Deno.test('reports a newly recorded authentication session', async () => {
  const response = await handleRecordAuthSession(
    request('new-session'),
    dependencies(() =>
      Promise.resolve({
        data: { created: true, duplicate: false, event: { id: 'event-1' } },
        error: null,
      }),
    ),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    success: true,
    message: 'Authentication session recorded.',
    duplicate: false,
    created: true,
    data: { id: 'event-1' },
  });
});

Deno.test('treats concurrent duplicate authentication sessions as non-fatal', async () => {
  let calls = 0;
  const deps = dependencies(() => {
    calls += 1;
    return Promise.resolve({
      data: {
        created: calls === 1,
        duplicate: calls !== 1,
        event: { id: 'event-1' },
      },
      error: null,
    });
  });

  const responses = await Promise.all([
    handleRecordAuthSession(request('same-session'), deps),
    handleRecordAuthSession(request('same-session'), deps),
  ]);
  const bodies = await Promise.all(responses.map((response) => response.json()));

  assertEquals(
    responses.map((response) => response.status),
    [200, 200],
  );
  assertEquals(
    bodies.map((body) => body.duplicate),
    [false, true],
  );
});

Deno.test('does not write without a stable session identifier', async () => {
  let calls = 0;
  const response = await handleRecordAuthSession(
    request(),
    dependencies(() => {
      calls += 1;
      return Promise.resolve({ data: null, error: null });
    }),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.created, false);
  assertEquals(body.duplicate, false);
  assertEquals(calls, 0);
});

Deno.test('preserves 401 for expired authentication', async () => {
  const response = await handleRecordAuthSession(request('expired'), {
    requireAccount: () => Promise.reject(new Error('UNAUTHENTICATED')),
    adminClient: () => {
      throw new Error('admin client should not be created');
    },
  } as never);

  assertEquals(response.status, 401);
  assertEquals((await response.json()).message, 'UNAUTHENTICATED');
});
