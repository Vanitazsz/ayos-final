export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly errors?: FieldErrors,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldErrors, message = "Validation failed") {
    super(422, "validation_error", message, errors);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", code = "authentication_required") {
    super(401, code, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, "not_found", `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "conflict") {
    super(409, code, message);
  }
}

export class IntegrationError extends AppError {
  constructor(integration: string) {
    super(503, "integration_not_configured", `${integration} integration is not configured`);
  }
}
