import { DomainError, ENABLED_PAYMENT_METHODS, type PaymentMethod } from '@ayos/contracts';

export interface PaymentBreakdown {
  serviceAmount: number;
  commissionRate: number;
  commissionAmount: number;
  workerNetAmount: number;
  homeownerPlatformCharge: number;
  totalDue: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function assertPaymentMethodEnabled(method: PaymentMethod): void {
  if (!ENABLED_PAYMENT_METHODS.includes(method)) {
    throw new DomainError('PAYMENT_METHOD_UNAVAILABLE', `${method} is not available.`, 422, {
      enabledMethods: ENABLED_PAYMENT_METHODS,
    });
  }
}

export function calculateCashPayment(
  serviceAmount: number,
  commissionRate = 0.1,
  homeownerPlatformCharge = 0,
): PaymentBreakdown {
  if (!Number.isFinite(serviceAmount) || serviceAmount <= 0) {
    throw new DomainError('VALIDATION_FAILED', 'Service amount must be positive.');
  }
  if (commissionRate < 0 || commissionRate > 1) {
    throw new DomainError('VALIDATION_FAILED', 'Commission rate must be between 0 and 1.');
  }
  if (homeownerPlatformCharge < 0) {
    throw new DomainError('VALIDATION_FAILED', 'Homeowner platform charge cannot be negative.');
  }

  const commissionAmount = roundMoney(serviceAmount * commissionRate);
  const workerNetAmount = roundMoney(serviceAmount - commissionAmount);
  return {
    serviceAmount: roundMoney(serviceAmount),
    commissionRate,
    commissionAmount,
    workerNetAmount,
    homeownerPlatformCharge: roundMoney(homeownerPlatformCharge),
    totalDue: roundMoney(serviceAmount + homeownerPlatformCharge),
  };
}

export function cashPaymentIsSuccessful(confirmations: readonly ('USER' | 'WORKER')[]): boolean {
  return confirmations.includes('USER') && confirmations.includes('WORKER');
}
