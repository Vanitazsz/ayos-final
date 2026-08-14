export interface ConversationMessage {
  id: string;
  text: string;
  sender: 'self' | 'other';
  createdAt: string;
  timestamp: string;
  optimistic?: boolean;
}

export function createOptimisticMessage(
  text: string,
  now = new Date(),
): ConversationMessage {
  return {
    id: `optimistic:${now.getTime()}`,
    text,
    sender: 'self',
    createdAt: now.toISOString(),
    timestamp: now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    optimistic: true,
  };
}

export function mergeConversationMessages(
  messages: ConversationMessage[],
): ConversationMessage[] {
  const unique = new Map<string, ConversationMessage>();
  for (const message of messages) unique.set(message.id, message);
  return [...unique.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}
