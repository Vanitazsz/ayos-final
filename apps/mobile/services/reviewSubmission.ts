export const REVIEW_REQUEST_TIMEOUT_MS = 15_000;

export class ReviewSubmissionTimeoutError extends Error {
  constructor(operation: string) {
    super(`${operation} timed out. Check your connection and try again.`);
    this.name = 'ReviewSubmissionTimeoutError';
  }
}

export function withReviewTimeout<T>(
  operation: string,
  request: PromiseLike<T>,
  timeoutMs = REVIEW_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutRequest = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new ReviewSubmissionTimeoutError(operation)),
      timeoutMs,
    );
  });

  return Promise.race([Promise.resolve(request), timeoutRequest]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}
