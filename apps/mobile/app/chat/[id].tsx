import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { ChevronLeft, Send, Image as ImageIcon } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { fetchProviderProfile, startConversation } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';
import { useConversationChat } from '@/hooks/useConversationChat';

const QUICK_REPLIES = [
  "Can you come today?",
  "Do you bring your own tools?",
  "How much will the repair cost?",
  "Do I need to buy replacement parts?",
];

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider,setProvider]=useState<any>({id,name:'',avatarUri:''});const[conversationId,setConversationId]=useState<string|null>(null);const draft=useRequestStore();
  
  const [message, setMessage] = useState('');
  const { messages, access, sending, send } =
    useConversationChat(conversationId);
  useEffect(()=>{if(!id)return;void fetchProviderProfile(id).then(result=>{if(!result.error)setProvider(result.data)});if(draft.requestId)void startConversation(draft.requestId,id).then((conversation:any)=>{setConversationId(conversation.id);});},[id,draft.requestId]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !conversationId || !access.canSend) return;
    await send(text);
    setMessage('');
  };

  const handleBack = useGoBack('/(tabs)/messages');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
            <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <Avatar uri={provider.avatarUri} size={40} />
          <View style={styles.headerInfo}>
            <AppText variant="body" weight="bold">{provider.name}</AppText>
            <AppText variant="caption" color={Colors.success}>Online</AppText>
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
                msg.sender === 'self' ? styles.userBubble : styles.workerBubble
              ]}
            >
              <AppText
                variant="body"
                color={msg.sender === 'self' ? Colors.white : Colors.textPrimary}
              >
                {msg.text}
              </AppText>
              <AppText
                variant="caption"
                color={msg.sender === 'self' ? 'rgba(255,255,255,0.7)' : Colors.textTertiary}
                style={styles.timeText}
              >
                {msg.timestamp}
              </AppText>
            </View>
          ))}
        </ScrollView>

        {/* Quick Replies */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesList}>
            {QUICK_REPLIES.map((reply, idx) => (
              <Pressable
                key={idx}
                style={styles.quickReplyChip}
                onPress={() => void handleSend(reply)}
                disabled={!access.canSend || sending}
              >
                <AppText variant="bodySm" color={Colors.primary}>{reply}</AppText>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 60,
    paddingBottom: Spacing['4'],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: Spacing['3'],
  },
  headerInfo: {
    marginLeft: Spacing['3'],
  },
  hireBtn: {
    backgroundColor: Colors.cta,
  },
  chatContent: {
    padding: Layout.screenPadding,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    marginBottom: Spacing['3'],
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  workerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timeText: {
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickRepliesContainer: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing['2'],
  },
  quickRepliesList: {
    paddingHorizontal: Layout.screenPadding,
    gap: Spacing['2'],
  },
  quickReplyChip: {
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Layout.screenPadding,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  attachBtn: {
    padding: Spacing['2'],
    marginRight: Spacing['2'],
    marginBottom: 4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Platform.OS === 'ios' ? Spacing['3'] : 0,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing['3'],
  },
});
