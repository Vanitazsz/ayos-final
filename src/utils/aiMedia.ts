export const TRANSCRIPTION_FAILED_CODE = 'transcription_failed';

export function isTranscriptionFailure(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return code === TRANSCRIPTION_FAILED_CODE || code === 'TRANSCRIPTION_FAILED';
}

export function aiMediaErrorMessage(error: unknown) {
  if (isTranscriptionFailure(error)) {
    return 'Voice transcription failed. Retry or continue with a written description.';
  }
  return error instanceof Error
    ? error.message
    : 'AI assistance is temporarily unavailable.';
}
