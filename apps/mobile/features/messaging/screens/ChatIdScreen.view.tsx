import { styles } from './ChatIdScreen.styles';
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { ChevronLeft, Send, Image as ImageIcon } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import type { useChatIdScreenController } from '../hooks/useChatIdScreenController';
const QUICK_REPLIES = [
  'Can you come today?',
  'Do you bring your own tools?',
  'How much will the repair cost?',
  'Do I need to buy replacement parts?',
];
export function ChatView({
  model,
}: {
  model: ReturnType<typeof useChatIdScreenController>;
}) {
  const {
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
  } = model;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
            <ChevronLeft
              size={24}
              color={Colors.textPrimary}
              strokeWidth={2.5}
            />
          </Pressable>
          <Avatar uri={provider.avatarUri} size={40} />
          <View style={styles.headerInfo}>
            <AppText variant="body" weight="bold">
              {provider.name}
            </AppText>
            <AppText variant="caption" color={Colors.success}>
              Online
            </AppText>
          </View>
        </View>
        <AppButton
          label="Hire Worker"
          size="sm"
          style={styles.hireBtn}
          onPress={() => router.push(`/accept-worker/${provider.id}` as any)}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.chatContent}>
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === 'self' ? styles.userBubble : styles.workerBubble,
              ]}
            >
              <AppText
                variant="body"
                color={
                  msg.sender === 'self' ? Colors.white : Colors.textPrimary
                }
              >
                {msg.text}
              </AppText>
              <AppText
                variant="caption"
                color={
                  msg.sender === 'self'
                    ? 'rgba(255,255,255,0.7)'
                    : Colors.textTertiary
                }
                style={styles.timeText}
              >
                {msg.timestamp}
              </AppText>
            </View>
          ))}
        </ScrollView>

        {/* Quick Replies */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesList}
          >
            {QUICK_REPLIES.map((reply, idx) => (
              <Pressable
                key={idx}
                style={styles.quickReplyChip}
                onPress={() => void handleSend(reply)}
                disabled={!access.canSend || sending}
              >
                <AppText variant="bodySm" color={Colors.primary}>
                  {reply}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <Pressable style={styles.attachBtn}>
            <ImageIcon size={24} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={message}
              onChangeText={setMessage}
              multiline
              editable={access.canSend}
            />
          </View>
          <Pressable
            style={[
              styles.sendBtn,
              (!message.trim() || !access.canSend || sending) && {
                opacity: 0.5,
              },
            ]}
            onPress={() => void handleSend(message)}
            disabled={!message.trim() || !access.canSend || sending}
          >
            <Send size={20} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
