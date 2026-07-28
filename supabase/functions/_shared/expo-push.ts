export interface ExpoPushTicket {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoPushResult {
  status: 'SENT' | 'FAILED' | 'INVALID_TOKEN';
  providerReference?: string;
  failureReason?: string;
}

export function parseExpoPushTickets(payload: unknown, expected: number): ExpoPushResult[] {
  if (!payload || typeof payload !== 'object') throw new Error('EXPO_PUSH_MALFORMED_RESPONSE');
  const raw = (payload as { data?: unknown }).data;
  const tickets = Array.isArray(raw) ? raw : expected === 1 && raw ? [raw] : [];
  if (tickets.length !== expected) throw new Error('EXPO_PUSH_MALFORMED_RESPONSE');
  return tickets.map((value) => {
    const ticket = value as ExpoPushTicket;
    if (ticket.status === 'ok' && typeof ticket.id === 'string')
      return { status: 'SENT', providerReference: ticket.id };
    if (ticket.status === 'error') {
      const reason = ticket.details?.error ?? ticket.message ?? 'Expo rejected the notification.';
      return {
        status: reason === 'DeviceNotRegistered' ? 'INVALID_TOKEN' : 'FAILED',
        failureReason: reason,
      };
    }
    throw new Error('EXPO_PUSH_MALFORMED_RESPONSE');
  });
}
