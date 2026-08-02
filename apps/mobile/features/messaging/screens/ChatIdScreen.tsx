import { useChatIdScreenController } from '../hooks/useChatIdScreenController';
import { ChatView } from './ChatIdScreen.view';

export default function ChatScreen() {
  const model = useChatIdScreenController();
  return <ChatView model={model} />;
}
