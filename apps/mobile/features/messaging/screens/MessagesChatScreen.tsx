import { useMessagesChatScreenController } from '../hooks/useMessagesChatScreenController';
import { ChatView } from './MessagesChatScreen.view';

export default function ChatScreen() {
  const model = useMessagesChatScreenController();
  return <ChatView model={model} />;
}
