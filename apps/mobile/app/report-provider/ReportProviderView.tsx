import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  X,
  Lock,
  CheckCircle2,
} from 'lucide-react-native';
import { styles } from './reportProvider.styles';
import {
  useReportProviderController,
  REPORT_REASONS,
} from './useReportProviderController';

export function ReportProviderView(
  props: ReturnType<typeof useReportProviderController>,
) {
  const {
    targetWorkerName,
    targetServiceName,
    selectedReason,
    setSelectedReason,
    reasonError,
    details,
    setDetails,
    detailsError,
    photos,
    handleUpload,
    removePhoto,
    loading,
    submitted,
    ticketId,
    handleSubmit,
    handleDone,
    handleBack,
  } = props;

  if (submitted) {
    return (
      <Screen safeArea backgroundColor={theme.colors.background}>
        <View
          style={[
            styles.content,
            { paddingHorizontal: theme.layout.screenPadding },
          ]}
        >
          <View style={styles.successContainer}>
            {/* Green Shield Icon */}
            <View style={styles.shieldIconContainer}>
              <ShieldCheck color={theme.colors.success} size={56} />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.successTitle}>Report Submitted</Text>
            <Text style={styles.successSubtitle}>
              Thank you for letting us know. Our safety & support team will review
              your report shortly.
            </Text>

            {/* Ticket Reference Badge */}
            <View style={styles.ticketBadgeContainer}>
              <Text style={styles.ticketBadgeLabel}>Reference Ticket ID</Text>
              <Text style={styles.ticketBadgeText}>{ticketId ?? '#REP-00000'}</Text>
            </View>

            {/* Confidentiality Reassurance Card */}
            <View style={styles.confidentialityReassuranceCard}>
              <Lock color="#1e40af" size={20} />
              <Text style={styles.confidentialityReassuranceText}>
                Your report is confidential and will not be shared directly with
                the worker.
              </Text>
            </View>

            {/* CTAs */}
            <View style={styles.successActions}>
              <Button title="Back to Home" onPress={handleDone} fullWidth />
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeArea scrollable backgroundColor={theme.colors.background}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Provider</Text>
        <View style={styles.placeholderRight} />
      </View>

      <View
        style={[
          styles.content,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        {/* Confidential Notice Card */}
        <View style={styles.confidentialNoticeCard}>
          <ShieldAlert color="#92400e" size={20} />
          <Text style={styles.confidentialNoticeText}>
            Report Provider - Confidential & Reviewed by Support
          </Text>
        </View>

        {/* Worker Summary Card */}
        <View style={styles.workerCard}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.workerMeta}>
            <Text style={styles.workerName}>{targetWorkerName}</Text>
            <Text style={styles.serviceName}>{targetServiceName}</Text>
          </View>
        </View>

        {/* Section 1: Reason Selection (Required) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Reason for Report <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>Required</Text>
          </View>
        </View>

        <View style={styles.reasonsGrid}>
          {REPORT_REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                onPress={() => setSelectedReason(reason)}
                style={[
                  styles.reasonChip,
                  isSelected && styles.reasonChipSelected,
                ]}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <CheckCircle2
                    color={theme.colors.primary}
                    size={14}
                    style={{ marginRight: theme.spacing.xs }}
                  />
                )}
                <Text
                  style={[
                    styles.reasonChipText,
                    isSelected && styles.reasonChipTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {reasonError && (
          <View style={styles.errorBanner}>
            <AlertCircle color={theme.colors.error} size={16} />
            <Text style={styles.errorText}>{reasonError}</Text>
          </View>
        )}

        {/* Section 2: Detailed Description (Required) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Detailed Description <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>Required</Text>
          </View>
        </View>

        <TextInput
          placeholder="Please describe what happened in detail (minimum 10 characters)..."
          multiline
          numberOfLines={4}
          value={details}
          onChangeText={setDetails}
          style={[
            styles.textArea,
            detailsError ? styles.textAreaError : null,
          ]}
          textAlignVertical="top"
        />

        {detailsError && (
          <View style={styles.errorBanner}>
            <AlertCircle color={theme.colors.error} size={16} />
            <Text style={styles.errorText}>{detailsError}</Text>
          </View>
        )}

        {/* Section 3: Attach Proof Photos (Optional) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Attach Proof Photos</Text>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>Optional</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
        >
          {photos.length < 3 && (
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
              <UploadCloud color={theme.colors.primary} size={32} />
            </TouchableOpacity>
          )}
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoPreview}>
              <Image source={{ uri: photo }} style={styles.proofImage} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => removePhoto(index)}
              >
                <X color={theme.colors.surface} size={14} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Submit Footer Button */}
        <View style={styles.submitFooter}>
          <Button
            title="Submit Report"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}
