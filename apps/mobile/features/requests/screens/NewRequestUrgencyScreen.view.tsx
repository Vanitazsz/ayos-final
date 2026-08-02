import { styles } from './NewRequestUrgencyScreen.styles';
import { View, ScrollView, Pressable } from 'react-native';
import {
  Zap,
  Calendar,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import type { RequestUrgency } from '@/store/useRequestStore';
import type { useNewRequestUrgencyScreenController } from '../hooks/useNewRequestUrgencyScreenController';
const URGENCY_OPTIONS: {
  id: RequestUrgency;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
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
];
export function UrgencyView({
  model,
}: {
  model: ReturnType<typeof useNewRequestUrgencyScreenController>;
}) {
  const { router, selected, setSelected, handleNext } = model;
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
        <AppText variant="h4" weight="bold" style={styles.navTitle}>
          Urgency
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppText variant="h2" style={styles.headerTitle}>
          How urgent is this?
        </AppText>
        <AppText variant="body" style={styles.headerSubtitle}>
          This helps us match you with the right workers based on their
          availability.
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
                  isSelected && {
                    borderColor: option.color,
                    backgroundColor: option.bg,
                  },
                ]}
                onPress={() => setSelected(option.id)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: isSelected ? Colors.white : option.bg },
                  ]}
                >
                  <Icon size={24} color={option.color} />
                </View>
                <View style={styles.cardText}>
                  <AppText
                    variant="label"
                    style={{
                      fontWeight: '600',
                      color: isSelected ? option.color : Colors.textPrimary,
                    }}
                  >
                    {option.title}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{ color: Colors.textSecondary, marginTop: 4 }}
                  >
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
