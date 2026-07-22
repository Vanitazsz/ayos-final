import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { ChevronLeft, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Spacing, Elevation, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AccordionSection } from '@/components/AccordionSection';
import { CancellationConfirmation } from '@/components/CancellationConfirmation';
import { cancelBooking, fetchBookingDetail, fetchCancellationReasons } from '@/services/api';
type CancellationReason={id:string;label:string;category:string;jobStages:JobStage[];requiresInput:boolean};
const jobStages=[{value:'before_traveling' as const,label:'Before traveling'},{value:'after_arriving' as const,label:'After arriving'},{value:'after_inspecting' as const,label:'After inspecting'}];

type JobStage = 'before_traveling' | 'after_arriving' | 'after_inspecting';

export default function CancelServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedStage, setSelectedStage] = useState<JobStage>('before_traveling');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  const[booking,setBooking]=useState<any>(null);const[cancellationReasons,setCancellationReasons]=useState<CancellationReason[]>([]);
  useEffect(()=>{if(id)void fetchBookingDetail(id).then(result=>{if(!result.error)setBooking({customerName:result.data.user_profiles?.display_name??''})});void fetchCancellationReasons().then(result=>setCancellationReasons(result.data.map((row:any)=>({id:row.code,label:row.label,category:'other',jobStages:['before_traveling','after_arriving','after_inspecting'],requiresInput:false}))));},[id]);

  const filteredReasons = useMemo(() => {
    return cancellationReasons.filter((r) =>
      r.jobStages.includes(selectedStage)
    );
  }, [selectedStage]);

  const groupedReasons = useMemo(() => {
    const groups: Record<string, CancellationReason[]> = {
      customer: [],
      worker: [],
      job: [],
      policy: [],
      other: [],
    };
    filteredReasons.forEach((r) => {
      groups[r.category].push(r);
    });
    return groups;
  }, [filteredReasons]);

  const categoryLabels: Record<string, string> = {
    customer: 'Customer-related',
    worker: 'Worker-related',
    job: 'Job-related',
    policy: 'Policy & Safety',
    other: 'Other',
  };

  const categoryOrder = ['customer', 'worker', 'job', 'policy', 'other'];

  const filteredRecommendations = useMemo(() => {
    if (!customReason || customReason.length < 2) return [];
    const lower = customReason.toLowerCase();
    return cancellationReasons.filter(
      (r) =>
        r.label.toLowerCase().includes(lower) &&
        r.id !== selectedReason?.id
    ).slice(0, 5);
  }, [customReason, selectedReason]);

  const handleSelectReason = (reason: CancellationReason) => {
    setSelectedReason(reason);
    if (reason.requiresInput) {
      setCustomReason('');
    } else {
      setCustomReason(reason.label);
    }
    setShowDropdown(false);
  };

  const handleCustomReasonChange = (text: string) => {
    setCustomReason(text);
    setShowDropdown(text.length >= 2);
    if (text !== selectedReason?.label) {
      setSelectedReason(null);
    }
  };

  const handleSelectRecommendation = (reason: CancellationReason) => {
    setSelectedReason(reason);
    setCustomReason(reason.label);
    setShowDropdown(false);
  };

  const handleConfirm = () => {
    if ((selectedReason || customReason)&&id) {
      void cancelBooking(id,customReason||selectedReason?.label||'Cancelled').then(()=>setShowConfirmation(true));
    }
  };

  const handleViewBookings = () => {
    setShowConfirmation(false);
    router.push('/(worker)/bookings?filter=Cancelled');
  };

  const canConfirm = selectedReason !== null || customReason.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h4" weight="bold" color={Colors.textPrimary}>
          Cancel Service
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <AppText variant="h3" weight="bold">
            Why are you canceling this booking?
          </AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            Select a reason or type your own.
          </AppText>
        </View>

        {/* Job Stage Dropdown */}
        <View style={styles.stageSection}>
          <AppText variant="label" color={Colors.textSecondary} style={styles.stageLabel}>
            Job Stage
          </AppText>
          <Pressable
            style={styles.stageDropdown}
            onPress={() => setShowStageDropdown(!showStageDropdown)}
          >
            <AppText variant="body">
              {jobStages.find((s) => s.value === selectedStage)?.label}
            </AppText>
            {showStageDropdown ? (
              <ChevronUp size={20} color={Colors.textTertiary} />
            ) : (
              <ChevronDown size={20} color={Colors.textTertiary} />
            )}
          </Pressable>
          {showStageDropdown && (
            <View style={styles.stageOptions}>
              {jobStages.map((stage) => (
                <Pressable
                  key={stage.value}
                  style={[
                    styles.stageOption,
                    selectedStage === stage.value && styles.stageOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedStage(stage.value);
                    setShowStageDropdown(false);
                    setSelectedReason(null);
                    setCustomReason('');
                  }}
                >
                  <AppText
                    variant="body"
                    color={selectedStage === stage.value ? Colors.cta : Colors.textPrimary}
                  >
                    {stage.label}
                  </AppText>
                  {selectedStage === stage.value && (
                    <Check size={18} color={Colors.cta} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Accordion Sections */}
        <View style={styles.accordionContainer}>
          {categoryOrder.map((category, index) => {
            const reasons = groupedReasons[category];
            if (!reasons || reasons.length === 0) return null;
            const isLast = index === categoryOrder.length - 1 || 
              categoryOrder.slice(index + 1).every((c) => !groupedReasons[c]?.length);
            
            return (
              <AccordionSection
                key={category}
                title={categoryLabels[category]}
                isExpanded={expandedSection === category}
                onToggle={() => setExpandedSection(expandedSection === category ? null : category)}
                isLast={isLast}
              >
                {reasons.map((reason) => (
                  <Pressable
                    key={reason.id}
                    style={[
                      styles.reasonOption,
                      selectedReason?.id === reason.id && styles.reasonOptionSelected,
                    ]}
                    onPress={() => handleSelectReason(reason)}
                  >
                    <AppText
                      variant="body"
                      color={selectedReason?.id === reason.id ? Colors.cta : Colors.textSecondary}
                    >
                      {reason.label}
                    </AppText>
                    {selectedReason?.id === reason.id && (
                      <Check size={18} color={Colors.cta} />
                    )}
                  </Pressable>
                ))}
              </AccordionSection>
            );
          })}
        </View>

        {/* Other Reasons Input */}
        <View style={styles.otherSection}>
          <AppText variant="label" color={Colors.textSecondary}>
            Other Reasons
          </AppText>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Describe your reason..."
              placeholderTextColor={Colors.textTertiary}
              value={customReason}
              onChangeText={handleCustomReasonChange}
              onFocus={() => setShowDropdown(customReason.length >= 2)}
            />
            {showDropdown && filteredRecommendations.length > 0 && (
              <View style={styles.recommendations}>
                {filteredRecommendations.map((reason) => (
                  <Pressable
                    key={reason.id}
                    style={styles.recommendationItem}
                    onPress={() => handleSelectRecommendation(reason)}
                  >
                    <AppText variant="body" color={Colors.textSecondary}>
                      {reason.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Confirm Button */}
        <View style={styles.confirmSection}>
          <AppButton
            label="Confirm Cancellation"
            variant="danger"
            fullWidth
            disabled={!canConfirm}
            onPress={handleConfirm}
          />
        </View>
      </ScrollView>

      {/* Confirmation Popup */}
      <CancellationConfirmation
        visible={showConfirmation}
        customerName={booking?.customerName || ''}
        onViewBookings={handleViewBookings}
      />
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
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing['16'],
    paddingBottom: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing['10'],
  },
  titleSection: {
    marginBottom: Spacing['5'],
    gap: Spacing['2'],
  },
  stageSection: {
    marginBottom: Spacing['5'],
  },
  stageLabel: {
    marginBottom: Spacing['2'],
  },
  stageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stageOptions: {
    marginTop: Spacing['2'],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stageOptionSelected: {
    backgroundColor: Colors.primarySurface,
  },
  accordionContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing['5'],
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing['3'],
  },
  reasonOptionSelected: {
    backgroundColor: Colors.primarySurface,
  },
  otherSection: {
    marginBottom: Spacing['5'],
  },
  inputContainer: {
    marginTop: Spacing['2'],
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    fontSize: 16,
    color: Colors.textPrimary,
  },
  recommendations: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing['2'],
    overflow: 'hidden',
    zIndex: 100,
    ...Elevation.lg,
  },
  recommendationItem: {
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  confirmSection: {
    marginTop: Spacing['2'],
  },
});
