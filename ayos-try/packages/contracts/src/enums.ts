export const ACCOUNT_ROLES = ['USER', 'WORKER', 'ADMIN'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const WORKER_APPROVAL_STATUSES = [
  'PENDING',
  'NEEDS_DOCUMENTS',
  'APPROVED',
  'REJECTED',
] as const;
export type WorkerApprovalStatus = (typeof WORKER_APPROVAL_STATUSES)[number];

export const BOOKING_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'WORKER_PREPARING',
  'WORKER_EN_ROUTE',
  'WORKER_ARRIVED',
  'SERVICE_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const ENABLED_PAYMENT_METHODS: readonly PaymentMethod[] = ['CASH', 'GCASH'];

export const PAYMENT_STATUSES = [
  'PENDING',
  'AWAITING_CONFIRMATIONS',
  'SUCCESSFUL',
  'FAILED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = ['PENDING', 'PROCESSED', 'REJECTED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REVIEW_MODERATION_STATUSES = ['PENDING', 'PUBLISHED', 'REJECTED'] as const;
export type ReviewModerationStatus = (typeof REVIEW_MODERATION_STATUSES)[number];

export const TICKET_STATUSES = ['OPEN', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const NOTIFICATION_AUDIENCES = ['USERS', 'WORKERS', 'EVERYONE'] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const AI_PROVIDERS = ['OPENAI', 'GEMINI', 'OPENROUTER'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_INPUT_TYPES = ['TEXT', 'IMAGE', 'VOICE'] as const;
export type AiInputType = (typeof AI_INPUT_TYPES)[number];
