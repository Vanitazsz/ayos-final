import { styles } from './NewRequestThisWeekScreen.styles';
import { View, ScrollView, Pressable } from 'react-native';
import { Calendar, Clock, ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { JobSummary } from '@/components/JobSummary';
import type { useNewRequestThisWeekScreenController } from '../hooks/useNewRequestThisWeekScreenController';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIMES = [
  'Morning (8am-12pm)',
  'Afternoon (12pm-4pm)',
  'Evening (4pm-8pm)',
];
export function ScheduleView({
  model,
}: {
  model: ReturnType<typeof useNewRequestThisWeekScreenController>;
}) {
  const {
    request,
    selectedDay,
    setSelectedDay,
    selectedTime,
    setSelectedTime,
    handleBack,
    handleEditRequest,
    handleConfirm,
    isFormValid,
  } = model;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>
          Schedule This Week
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Day Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.primary} />
            <AppText variant="h3" style={styles.sectionTitle}>
              Select Day
            </AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysContainer}
          >
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              return (
                <Pressable
                  key={day}
                  style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                  onPress={() => setSelectedDay(day)}
                >
                  <AppText
                    style={{
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? Colors.white : Colors.textPrimary,
                    }}
                  >
                    {day}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={Colors.primary} />
            <AppText variant="h3" style={styles.sectionTitle}>
              Select Time
            </AppText>
          </View>
          <View style={styles.timesContainer}>
            {TIMES.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <Pressable
                  key={time}
                  style={[
                    styles.timeCard,
                    isSelected && styles.timeCardSelected,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <AppText
                    style={{
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? Colors.primary : Colors.textPrimary,
                    }}
                  >
                    {time}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Job Summary Review */}
        <View style={styles.section}>
          <AppText
            variant="h3"
            style={[
              styles.sectionTitle,
              { marginLeft: 0, marginBottom: Spacing['3'] },
            ]}
          >
            Review Request
          </AppText>
          <JobSummary request={request} showEditButtons={true} />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <AppButton
          label="Edit Request Details"
          variant="outline"
          onPress={handleEditRequest}
          fullWidth
          size="xl"
          style={{ marginBottom: Spacing['3'] }}
        />
        <AppButton
          label="Post Request"
          onPress={handleConfirm}
          disabled={!isFormValid}
          style={{ backgroundColor: Colors.primary }}
          fullWidth
          size="xl"
        />
      </View>
    </View>
  );
}
