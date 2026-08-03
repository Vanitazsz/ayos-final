import {
  fetchProviderProfile,
  startConversation,
} from '../logic/ChatIdScreenLogic';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';
import { useConversationChat } from '@/hooks/useConversationChat';

export function useChatIdScreenController() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider, setProvider] = useState<any>({
    id,
    name: '',
    avatarUri: '',
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const draft = useRequestStore();
  const [message, setMessage] = useState('');
  const { messages, access, sending, send } =
    useConversationChat(conversationId);
  useEffect(() => {
    if (!id) return;
    void fetchProviderProfile(id).then((result) => {
      if (!result.error) setProvider(result.data);
    });
    if (draft.requestId)
      void startConversation(draft.requestId, id).then((conversation: any) => {
        setConversationId(conversation.id);
      });
  }, [id, draft.requestId]);
  const handleSend = async (text: string) => {
    if (!text.trim() || !conversationId || !access.canSend) return;
    await send(text);
    setMessage('');
  };
  const handleBack = () => router.back();
  return {
    router,
    id,
    provider,
    message,
    setMessage,
    messages,
    access,
    sending,
    handleSend,
    handleBack,
  };
}
