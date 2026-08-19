import { describe, expect, it } from 'vitest';
import {
  aiMediaErrorMessage,
  isTranscriptionFailure,
} from './aiMedia';

describe('AI media error handling', () => {
  it('recognizes the stable transcription failure code', () => {
    expect(isTranscriptionFailure({ code: 'transcription_failed' })).toBe(true);
    expect(isTranscriptionFailure({ code: 'ai_provider_unavailable' })).toBe(false);
  });

  it('returns an actionable manual-text message for transcription failures', () => {
    expect(aiMediaErrorMessage({ code: 'transcription_failed' })).toContain(
      'written description',
    );
  });
});
