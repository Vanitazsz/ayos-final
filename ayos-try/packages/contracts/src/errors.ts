export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INVALID_OTP',
  'OTP_EXPIRED',
  'INVALID_BOOKING_TRANSITION',
  'WORKER_NOT_APPROVED',
  'PAYMENT_METHOD_UNAVAILABLE',
  'PAYMENT_CONFIRMATION_REQUIRED',
  'REVIEW_NOT_ALLOWED',
  'CONTENT_NOT_CONFIGURED',
  'PERMANENT_DELETION_BLOCKED',
  'PROVIDER_UNAVAILABLE',
  'AI_PROVIDER_UNAVAILABLE',
  'AI_PROVIDER_REJECTED',
  'AI_OUTPUT_INVALID',
  'AI_INPUT_UNSUPPORTED',
  'MAP_PROVIDER_UNAVAILABLE',
  'ROUTE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    correlationId: string;
    details?: Record<string, unknown>;
  };
}

export class DomainError extends Error {
  public constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
