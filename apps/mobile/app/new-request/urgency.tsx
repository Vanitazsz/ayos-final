import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, Users, Calendar, ChevronLeft } from 'lucide-react-native';
import { Colors, Layout, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { useRequest, UrgencyLevel } from '@/context/RequestContext';
import { useRequestStore } from '@/store/useRequestStore';

const URGENCY_OPTIONS: { id: UrgencyLevel; title: string; subtitle: string; icon: any; color: string; bg: string }[] = [
  {
    id: 'ASAP',
    title: 'ASAP / Emergency',
    subtitle: 'Find an available worker right now',
    icon: Zap,
    color: Colors.error,
    bg: Colors.errorBg,
  },
  {
    id: 'This Week',
    title: 'This Week',
    subtitle: 'No rush, anytime this week is fine',
    icon: Calendar,
    color: Colors.primary,
    bg: Colors.primarySurface,
  },
  {
    id: 'Open Bidding',
    title: 'Open Bidding / Receive Offers',
    subtitle: 'Post your request and wait for workers to bid on it',
    icon: Users,
    color: Colors.primary,
    bg: Colors.primarySurface,
  },
];

export default function UrgencyScreen() {
  const router = useRouter();
  const { request, updateRequest } = useRequest();
  const setDraft = useRequestStore((state) => state.setDraft);
  
  const [selected, setSelected] = useState<UrgencyLevel | null>(request.urgency);

  const handleNext = () => {
    if (!selected) return;
    updateRequest({ urgency: selected });
    setDraft({ matchingMode: selected === 'Open Bidding' ? 'bidding' : 'direct' });
    
    if (selected === 'ASAP') {
      router.push('/new-request/asap');
    } else if (selected === 'This Week') {
      router.push('/new-request/this-week');
    } else {
      router.push('/new-request/bidding');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home');
          }}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.navTitle}>Urgency</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppText variant="h2" style={styles.headerTitle}>How urgent is this?</AppText>
        <AppText variant="body" style={styles.headerSubtitle}>
          This helps us match you with the right workers based on their availability.
        </AppText>

        <View style={styles.optionsContainer}>
          {URGENCY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.id;
            
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.card,
                  isSelected && { borderColor: option.color, backgroundColor: option.bg }
                ]}
                onPress={() => setSelected(option.id)}
              >
                <View style={[styles.iconContainer, { backgroundColor: isSelected ? Colors.white : option.bg }]}>
                  <Icon size={24} color={option.color} />
                </View>
                <View style={styles.cardText}>
                  <AppText variant="label" style={{ fontWeight: '600', color: isSelected ? option.color : Colors.textPrimary }}>
                    {option.title}
                  </AppText>
                  <AppText variant="caption" style={{ color: Colors.textSecondary, marginTop: 4 }}>
                    {option.subtitle}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <AppButton 
          label="Review Request" 
          onPress={handleNext} 
          disabled={!selected}
        />
      </View>
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
    paddingBottom: Spacing[4],
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
  headerTitle: {
    fontWeight: '700',
    marginBottom: Spacing[2],
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing[6],
  },
  optionsContainer: {
    gap: Spacing[3],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[4],
  },
  cardText: {
    flex: 1,
  },
  footer: {
    padding: Layout.screenPadding,
    backgroundColor: Colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
