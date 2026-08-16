import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppSelect, type SelectOption } from '@/components/AppSelect';
import { ImageUploadCard } from '@/components/ImageUploadCard';
import {
  Colors,
  Elevation,
  Radius,
  Spacing,
  theme,
} from '@/constants/theme';
import {
  fetchMyCustomerVerification,
  submitCustomerVerification,
} from '@/services/customerVerification';
import { resolveStorageImage } from '@/services/profile';
import { useGoBack } from '@/hooks/useGoBack';
import { showAlert } from '@/components/AppAlert';
import {
  getVerificationPendingAlert,
  getVerificationPendingNotice,
} from '@/lib/verificationStatus';

const ID_TYPES: SelectOption[] = [
  { label: 'PhilSys ID', value: 'philsys' },
  { label: "Driver's License", value: 'drivers_license' },
  { label: 'Passport', value: 'passport' },
  { label: 'UMID', value: 'umid' },
  { label: 'Postal ID', value: 'postal_id' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_COLOR: Record<string, string> = {
  pending: Colors.warning,
  approved: Colors.verified,
  rejected: Colors.error,
};

type ExistingVerification = {
  idType: string;
  frontUrl: string;
  backUrl: string;
  status: string;
  reviewNotes: string | null;
};

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)/profile');
  const queryClient = useQueryClient();
  const [idType, setIdType] = useState('');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<ExistingVerification | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const row = await fetchMyCustomerVerification();
        if (!active || !row) return;
        const [frontUrl, backUrl] = await Promise.all([
          resolveStorageImage(row.id_front_url, 'verification-documents'),
          resolveStorageImage(row.id_back_url, 'verification-documents'),
        ]);
        if (!active) return;
        setExisting({
          idType: row.id_type,
          frontUrl,
          backUrl,
          status: row.status,
          reviewNotes: row.review_notes ?? null,
        });
      } catch {
        // Fall back to the upload form if the submission cannot be loaded.
      } finally {
        if (active) setLoadingExisting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    if (submitting) return;
    const next: Record<string, string> = {};
    if (!idType) next.idType = 'Select an ID type';
    if (!frontUri) next.front = 'Capture or upload the front of your ID';
    if (!backUri) next.back = 'Capture or upload the back of your ID';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitStatus('Preparing your ID documents…');
    try {
      await submitCustomerVerification(
        { idType, frontUri: frontUri!, backUri: backUri! },
        setSubmitStatus,
      );
      setSubmitStatus('Verification submitted.');
      setExisting(null);
      const notice = getVerificationPendingNotice();
      const alert = getVerificationPendingAlert(() =>
        router.replace('/(tabs)/home'),
      );
      showAlert(notice.title, notice.message, alert.buttons, alert.options);
      void queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
    } catch (error) {
      setSubmitStatus('');
      setSubmitError(
        error instanceof Error ? error.message : 'Unable to submit verification',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const existingLabel =
    ID_TYPES.find((option) => option.value === existing?.idType)?.label ??
    existing?.idType ??
    '';

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h3" weight="bold">
          Verify your identity
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {loadingExisting ? (
        <AppText
          variant="bodySm"
          color={Colors.textSecondary}
          style={styles.loading}
        >
          Loading verification status…
        </AppText>
      ) : existing && existing.status !== 'rejected' ? (
        <View style={styles.summaryCard}>
          <AppText
            variant="caption"
            weight="semiBold"
            color={Colors.textTertiary}
            style={styles.summaryLabel}
          >
            Submitted ID
          </AppText>
          <AppText variant="h4" weight="bold">
            {existingLabel}
          </AppText>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLOR[existing.status] ?? Colors.textTertiary },
              ]}
            />
            <AppText
              variant="bodySm"
              color={STATUS_COLOR[existing.status] ?? Colors.textSecondary}
            >
              {STATUS_LABEL[existing.status] ?? 'Submitted'}
            </AppText>
          </View>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Your identity documents are already submitted for review.
          </AppText>
          {existing.frontUrl || existing.backUrl ? (
            <View style={styles.documentRow}>
              {existing.frontUrl ? (
                <Image
                  source={existing.frontUrl}
                  style={styles.documentImage}
                  contentFit="cover"
                />
              ) : null}
              {existing.backUrl ? (
                <Image
                  source={existing.backUrl}
                  style={styles.documentImage}
                  contentFit="cover"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.form}>
          {existing?.status === 'rejected' && (
            <View style={styles.rejectedNotice}>
              <AppText variant="bodySm" weight="bold" color={Colors.error}>
                Identity verification rejected
              </AppText>
              {existing.reviewNotes ? (
                <AppText variant="caption" color={Colors.textSecondary}>
                  {existing.reviewNotes}
                </AppText>
              ) : (
                <AppText variant="caption" color={Colors.textSecondary}>
                  Your previous ID was not accepted. Upload a valid,
                  government-issued Philippine ID to try again.
                </AppText>
              )}
            </View>
          )}
          <AppText
            variant="bodySm"
            color={Colors.textSecondary}
            style={styles.intro}
          >
            Upload a Philippine government-issued ID. Verification is required
            before creating a booking.
          </AppText>
          <AppSelect
            label="ID Type"
            options={ID_TYPES}
            value={idType}
            onSelect={(value) => {
              setIdType(value);
              setErrors((current) => ({ ...current, idType: '' }));
            }}
            error={errors.idType}
          />
          <ImageUploadCard
            label="Front of ID"
            description="Take a clear photo with all corners visible"
            onImageSelected={(value) => {
              setFrontUri(value);
              setErrors((current) => ({ ...current, front: '' }));
            }}
            error={errors.front}
            containerStyle={styles.upload}
          />
          <ImageUploadCard
            label="Back of ID"
            description="Take a clear photo with all corners visible"
            onImageSelected={(value) => {
              setBackUri(value);
              setErrors((current) => ({ ...current, back: '' }));
            }}
            error={errors.back}
            containerStyle={styles.upload}
          />
          {submitStatus ? (
            <View style={[styles.feedback, styles.progressFeedback]}>
              <AppText variant="bodySm" color={Colors.primary}>
                {submitStatus}
              </AppText>
            </View>
          ) : null}
          {submitError ? (
            <View style={[styles.feedback, styles.errorFeedback]}>
              <AppText variant="bodySm" color={Colors.error}>
                {submitError}
              </AppText>
            </View>
          ) : null}
          <AppButton
            label="Submit for verification"
            loading={submitting}
            onPress={() => void submit()}
            fullWidth
            style={styles.action}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
    paddingHorizontal: theme.layout.screenPadding,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  loading: {
    marginTop: Spacing['6'],
    paddingHorizontal: theme.layout.screenPadding,
  },
  form: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: Spacing['2'],
  },
  intro: {
    marginBottom: Spacing['4'],
  },
  rejectedNotice: {
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    marginBottom: Spacing['4'],
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
    gap: Spacing['1'],
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    gap: Spacing['2'],
    marginHorizontal: theme.layout.screenPadding,
    marginTop: Spacing['2'],
    ...Elevation.sm,
  },
  summaryLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  documentRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  documentImage: {
    flex: 1,
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceLight,
  },
  upload: { marginTop: Spacing['5'] },
  action: { marginTop: Spacing['5'] },
  feedback: {
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    marginTop: Spacing['4'],
  },
  progressFeedback: {
    backgroundColor: Colors.primarySurface,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  errorFeedback: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
});
