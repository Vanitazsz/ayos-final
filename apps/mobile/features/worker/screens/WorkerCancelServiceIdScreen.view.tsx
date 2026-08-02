import { styles } from './WorkerCancelServiceIdScreen.styles';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AccordionSection } from '@/components/AccordionSection';
import { CancellationConfirmation } from '@/components/CancellationConfirmation';
import type { useWorkerCancelServiceIdScreenController } from '../hooks/useWorkerCancelServiceIdScreenController';
const jobStages = [
  { value: 'before_traveling' as const, label: 'Before traveling' },
  { value: 'after_arriving' as const, label: 'After arriving' },
  { value: 'after_inspecting' as const, label: 'After inspecting' },
];
export function CancelServiceView({
  model,
}: {
  model: ReturnType<typeof useWorkerCancelServiceIdScreenController>;
}) {
  const {
    id,
    selectedStage,
    setSelectedStage,
    expandedSection,
    setExpandedSection,
    selectedReason,
    setSelectedReason,
    customReason,
    setCustomReason,
    showDropdown,
    setShowDropdown,
    showConfirmation,
    showStageDropdown,
    setShowStageDropdown,
    booking,
    groupedReasons,
    categoryLabels,
    categoryOrder,
    filteredRecommendations,
    handleSelectReason,
    handleCustomReasonChange,
    handleSelectRecommendation,
    handleConfirm,
    handleViewBookings,
    canConfirm,
    router,
  } = model;
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
          <AppText
            variant="label"
            color={Colors.textSecondary}
            style={styles.stageLabel}
          >
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
                    color={
                      selectedStage === stage.value
                        ? Colors.cta
                        : Colors.textPrimary
                    }
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
            const isLast =
              index === categoryOrder.length - 1 ||
              categoryOrder
                .slice(index + 1)
                .every((c) => !groupedReasons[c]?.length);

            return (
              <AccordionSection
                key={category}
                title={categoryLabels[category]}
                isExpanded={expandedSection === category}
                onToggle={() =>
                  setExpandedSection(
                    expandedSection === category ? null : category,
                  )
                }
                isLast={isLast}
              >
                {reasons.map((reason) => (
                  <Pressable
                    key={reason.id}
                    style={[
                      styles.reasonOption,
                      selectedReason?.id === reason.id &&
                        styles.reasonOptionSelected,
                    ]}
                    onPress={() => handleSelectReason(reason)}
                  >
                    <AppText
                      variant="body"
                      color={
                        selectedReason?.id === reason.id
                          ? Colors.cta
                          : Colors.textSecondary
                      }
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
