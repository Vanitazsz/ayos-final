const sensitiveKeys = /password|token|secret|otp|identity|message|latitude|longitude/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        sensitiveKeys.test(key) ? '[REDACTED]' : redact(nested),
      ]),
    );
  }
  return value;
}

export interface LogRecord {
  level: 'info' | 'warn' | 'error';
  event: string;
  correlationId: string;
  metadata?: unknown;
}

export function safeLogRecord(record: LogRecord): LogRecord {
  return { ...record, ...(record.metadata ? { metadata: redact(record.metadata) } : {}) };
}
