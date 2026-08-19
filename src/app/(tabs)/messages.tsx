import React from 'react';
import { ConversationListScreen } from '@/components/ConversationListScreen';

export default function MessagesListScreen() {
  return (
    <ConversationListScreen
      emptyDescription="Messages become available after you match with a worker."
    />
  );
}
