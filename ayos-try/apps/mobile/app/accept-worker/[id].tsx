import React,{useEffect,useState}from'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, X } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { fetchProviderProfile, selectWorker } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';
import { Alert } from 'react-native';

export default function AcceptWorkerModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider,setProvider]=useState<any>({id,name:'',avatarUri:'',category:'',price:''});
  const draft=useRequestStore();
  useEffect(()=>{if(id)void fetchProviderProfile(id).then(result=>{if(!result.error)setProvider(result.data)});},[id]);

  const handleHire = async () => {
    if(!draft.requestId){Alert.alert('Request required','Create and publish a service request before hiring a worker.');return;}
    try{const booking=await selectWorker(draft.requestId,provider.id);draft.setDraft({bookingId:booking.id});router.replace(`/tracking/${booking.id}`);}catch(error){Alert.alert('Worker unavailable',error instanceof Error?error.message:'Select another worker.');}
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="h3" weight="bold">Hire This Worker?</AppText>
          <Pressable onPress={handleCancel} hitSlop={12} style={styles.closeBtn}>
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Worker Info */}
        <View style={styles.workerInfo}>
          <Avatar uri={provider.avatarUri} size={60} />
          <View style={{ marginLeft: Spacing['3'], flex: 1 }}>
            <AppText variant="h4" weight="bold">{provider.name}</AppText>
            <AppText variant="bodySm" color={Colors.textSecondary}>{provider.category}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <AppText variant="body" weight="bold" color={Colors.cta}>{provider.price}</AppText>
              <AppText variant="caption" color={Colors.textSecondary}> / hr</AppText>
            </View>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageBox}>
          <CheckCircle2 size={24} color={Colors.cta} style={{ marginBottom: Spacing['2'] }} />
          <AppText variant="body" align="center" style={{ lineHeight: 22 }}>
            Once accepted, <AppText variant="body" weight="bold">{provider.name}</AppText> will be assigned to your request, and you will proceed to payment to finalize the booking.
          </AppText>
        </View>

        {/* Buttons */}
        <View style={styles.footer}>
          <AppButton 
            label="Cancel" 
            variant="outline" 
            onPress={handleCancel} 
            style={styles.actionBtn}
          />
          <AppButton 
            label="Hire Worker" 
            onPress={()=>void handleHire()} 
            style={styles.actionBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['4'],
  },
  closeBtn: {
    padding: Spacing['1'],
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    marginBottom: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  messageBox: {
    backgroundColor: Colors.primarySurface,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginBottom: Spacing['6'],
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  actionBtn: {
    flex: 1,
  },
});
