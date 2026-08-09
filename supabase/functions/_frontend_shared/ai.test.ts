import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  runAnalysis,
  transcribeAudio,
  TRANSCRIPTION_FAILED_CODE,
  TranscriptionFailedError,
} from './ai.ts';
import { handleError, HttpError } from './http.ts';

const audio = {
  bucket: 'request-media',
  path: 'account-id/voice.wav',
  contentType: 'audio/wav',
  bytes: new Uint8Array([1, 2, 3]),
  base64: 'AQID',
};

function saveEnvironment(keys: string[]) {
  const previous = new Map(keys.map((key) => [key, Deno.env.get(key)]));
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  };
}

Deno.test(
  'returns a stable transcription failure when both transcription providers fail',
  async () => {
    const restore = saveEnvironment([
      'GEMINI_API_KEY',
      'GEMINI_MODEL',
      'OPENAI_API_KEY',
      'OPENAI_TRANSCRIPTION_MODEL',
    ]);
    const previousFetch = globalThis.fetch;
    Deno.env.set('GEMINI_API_KEY', 'test-key');
    Deno.env.set('GEMINI_MODEL', 'test-model');
    Deno.env.set('OPENAI_API_KEY', 'test-key');
    globalThis.fetch = async () => {
      throw new Error('provider unavailable');
    };

    try {
      const error = await assertRejects(
        () => transcribeAudio(audio as never),
        TranscriptionFailedError,
      );
      assertEquals((error as TranscriptionFailedError).code, TRANSCRIPTION_FAILED_CODE);
    } finally {
      globalThis.fetch = previousFetch;
      restore();
    }
  },
);

Deno.test('image-only analysis does not invoke audio transcription', async () => {
  const restore = saveEnvironment([
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'OPENAI_API_KEY',
  ]);
  const previousFetch = globalThis.fetch;
  Deno.env.set('OPENROUTER_API_KEY', 'test-key');
  Deno.env.set('OPENROUTER_MODEL', 'test-model');
  Deno.env.delete('GEMINI_API_KEY');
  Deno.env.delete('GEMINI_MODEL');
  Deno.env.delete('OPENAI_API_KEY');

  const result = {
    detectedIssue: 'Leaking sink',
    possibleCauses: ['Worn seal'],
    suggestedCategoryIds: [],
    suggestedServiceIds: [],
    severity: 'LOW',
    urgency: 'ROUTINE',
    estimatedDurationMinutes: 30,
    estimatedCostMinimumMinor: 500,
    estimatedCostMaximumMinor: 2500,
    safetyAdvice: [],
    followUpQuestions: [],
    confidence: 0.8,
    requestDraft: 'The sink is leaking.',
    transcript: '',
    safetyCritical: false,
  };
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const query = (data: unknown[]) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve({ data, error: null }).then(onFulfilled, onRejected),
    };
    return chain;
  };
  const admin = {
    from: (table: string) =>
      query(
        table === 'service_categories'
          ? [
              {
                id: 'category-id',
                name: 'Plumbing',
                minimum_price_minor: 500,
                maximum_price_minor: 5000,
              },
            ]
          : [
              {
                id: 'service-id',
                category_id: 'category-id',
                name: 'Sink repair',
                minimum_price_minor: 500,
                maximum_price_minor: 5000,
              },
            ],
      ),
    storage: {
      from: () => ({
        download: async () => ({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null }),
      }),
    },
  };

  try {
    const output = await runAnalysis(admin as never, 'account-id', 'The sink leaks', [
      { ...audio, contentType: 'image/jpeg', path: 'account-id/sink.jpg' },
    ]);
    assertEquals(output.provider, 'OPENROUTER');
    assertEquals(urls, ['https://openrouter.ai/api/v1/chat/completions']);
    assertEquals(output.result.transcript, '');
  } finally {
    globalThis.fetch = previousFetch;
    restore();
  }
});

Deno.test('exposes a safe retry/manual-text recovery hint for transcription failures', async () => {
  const response = handleError(
    new HttpError(
      503,
      'transcription_failed',
      'Voice transcription failed. Retry or continue with written text.',
      { recovery: 'RETRY_OR_MANUAL_TEXT' },
    ),
  );
  assertEquals(response.status, 503);
  assertEquals(await response.json(), {
    success: false,
    code: 'transcription_failed',
    message: 'Voice transcription failed. Retry or continue with written text.',
    details: { recovery: 'RETRY_OR_MANUAL_TEXT' },
  });
});
