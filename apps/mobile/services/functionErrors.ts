import { SessionExpiredError } from '@/services/authenticatedFunctions';

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public code = 'edge_function_error',
    public status?: number,
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

export async function normalizeFunctionError(
  error: unknown,
  fallback: string,
): Promise<EdgeFunctionError | SessionExpiredError> {
  if (error instanceof SessionExpiredError) return error;
  const context = (error as { context?: Response })?.context;
  let payload: Record<string, unknown> | null = null;
  if (context) {
    try {
      payload = (await context.clone().json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }
  const nestedErrors = payload?.errors as Record<string, unknown> | undefined;
  const code = String(
    payload?.code ?? nestedErrors?.code ?? 'edge_function_error',
  );
  return new EdgeFunctionError(
    String(payload?.message ?? fallback),
    code,
    context?.status,
  );
}
