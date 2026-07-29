import { describe, expect, it } from 'vitest';

import {
  ReviewSubmissionTimeoutError,
  withReviewTimeout,
} from './reviewSubmission';

describe('withReviewTimeout', () => {
  it('returns a completed request and clears its timer', async () => {
    await expect(withReviewTimeout('review', Promise.resolve('ok'), 20)).resolves.toBe('ok');
  });

  it('rejects a request that does not resolve before the timeout', async () => {
    await expect(
      withReviewTimeout('Review submission', new Promise(() => {}), 1),
    ).rejects.toBeInstanceOf(ReviewSubmissionTimeoutError);
  });
});
