import type { BookingStatus } from './enums.js';

export interface RealtimeEvents {
  'conversation.message.created': {
    conversationId: string;
    messageId: string;
    createdAt: string;
  };
  'booking.status.changed': {
    bookingId: string;
    previousStatus: BookingStatus;
    status: BookingStatus;
    version: number;
  };
  'booking.location.updated': {
    bookingId: string;
    latitude: number;
    longitude: number;
    recordedAt: string;
  };
  'notification.created': {
    notificationId: string;
    recipientId: string;
  };
  'matching.worker.available': {
    serviceRequestId: string;
    workerId: string;
  };
}
