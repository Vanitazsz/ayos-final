import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, Camera, Image as ImageIcon } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { fetchConversation, fetchProviderProfile, sendMessage, startConversation, subscribeToTable } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';

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
  const [messages, setMessages] = useState<any[]>([]);
  useEffect(()=>{if(!id)return;let stop=()=>{};void fetchProviderProfile(id).then(result=>{if(!result.error)setProvider(result.data)});if(draft.requestId)void startConversation(draft.requestId,id).then((conversation:any)=>{setConversationId(conversation.id);const load=()=>void fetchConversation(conversation.id).then(result=>setMessages(result.data.messages.map((row:any)=>({id:row.id,text:row.text,sender:row.sender==='self'?'user':'worker',time:row.timestamp}))));load();stop=subscribeToTable('messages',load,`conversation_id=eq.${conversation.id}`);});return()=>stop();},[id,draft.requestId]);

  const handleSend = (text: string) => {
    if (!text.trim()||!conversationId) return;
    void sendMessage(conversationId,text).then(()=>setMessage(''));
  };

  const handleBack = () => router.back();

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
                msg.sender === 'user' ? styles.userBubble : styles.workerBubble
              ]}
            >
              <AppText 
                variant="body" 
                color={msg.sender === 'user' ? Colors.white : Colors.textPrimary}
              >
                {msg.text}
              </AppText>
              <AppText 
                variant="caption" 
                color={msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : Colors.textTertiary} 
                style={styles.timeText}
              >
                {msg.time}
              </AppText>
            </View>
          ))}
        </ScrollView>

        {/* Quick Replies */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesList}>
            {QUICK_REPLIES.map((reply, idx) => (
              <Pressable key={idx} style={styles.quickReplyChip} onPress={() => handleSend(reply)}>
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
            />
          </View>
          <Pressable 
            style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]} 
            onPress={() => handleSend(message)}
            disabled={!message.trim()}
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
