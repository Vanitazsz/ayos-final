import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  Receipt,
  Star,
  Image as ImageIcon,
  MessageSquare,
  AlertTriangle,
  Banknote,
} from 'lucide-react-native';
import { fetchBookingSummary } from '@/services/api';
import { buildProviderReportEmail } from '@/services/support';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconWrap}>{icon}</View>
      <View style={rowStyles.textWrap}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.infoBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textWrap: { flex: 1 },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
});

export default function BookingSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;

  const [summary, setSummary] = useState<{
    booking: any;
    proofPhotos: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    void fetchBookingSummary(bookingId)
      .then((data) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const booking = summary?.booking;
  const proofPhotos = summary?.proofPhotos ?? [];

  const serviceName =
    booking?.service_requests?.service_categories?.name ?? 'Service';
  const providerName =
    booking?.worker_profiles?.display_name ?? 'Provider';
  const workerAccountId = booking?.worker_account_id as string | undefined;

  const address = booking?.service_requests?.addresses;
  const addressStr = address
    ? [address.line1, address.barangay, address.city]
        .filter(Boolean)
        .join(', ')
    : '—';

  const completedAt = booking?.completed_at
    ? new Date(booking.completed_at)
    : null;
  const completedDate = completedAt
    ? completedAt.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';
  const completedTime = completedAt
    ? completedAt.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const payment = Array.isArray(booking?.payments)
    ? booking.payments[0]
    : booking?.payments;
  const agreedAmount = booking?.agreed_service_amount;
  const amountStr =
    agreedAmount != null
      ? `₱${Number(agreedAmount).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })}`
      : '—';
  const paymentStatus = payment?.status ?? null;
  const paymentMethod = payment?.payment_method ?? 'Cash on Service';
  const receiptNumber = payment?.receipts?.receipt_number ?? null;
  const receiptDate = payment?.receipts?.issued_at
    ? new Date(payment.receipts.issued_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const handleReport = () => {
    const { to, subject, body } = buildProviderReportEmail({
      bookingId: bookingId ?? '',
      providerName,
      providerAccountId: workerAccountId,
      bookingStatus: 'COMPLETED',
    });
    void Linking.openURL(
      `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>
          Transaction Summary
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text
              style={[
                theme.typography.body1,
                { color: theme.colors.textSecondary },
              ]}
            >
              Loading summary…
            </Text>
          </View>
        ) : !booking ? (
          <View style={styles.loadingContainer}>
            <Text
              style={[
                theme.typography.body1,
                { color: theme.colors.textSecondary },
              ]}
            >
              Could not load transaction details.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Completion Banner ── */}
            <View style={styles.completionBanner}>
              <View style={styles.completionIconWrap}>
                <CheckCircle2 size={32} color={theme.colors.success} />
              </View>
              <Text style={styles.completionTitle}>Service Completed</Text>
              <Text style={styles.completionSub}>
                {completedDate} · {completedTime}
              </Text>
            </View>

            {/* ── Service Details ── */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Wrench size={16} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Service Details</Text>
              </View>
              <InfoRow
                icon={<Wrench size={16} color={theme.colors.primary} />}
                label="Service"
                value={serviceName}
              />
              <InfoRow
                icon={<MapPin size={16} color={theme.colors.primary} />}
                label="Location"
                value={addressStr}
              />
              <InfoRow
                icon={<Calendar size={16} color={theme.colors.primary} />}
                label="Completed On"
                value={completedDate}
              />
              <InfoRow
                icon={<Clock size={16} color={theme.colors.primary} />}
                label="Time"
                value={completedTime}
              />
            </View>

            {/* ── Provider ── */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <MessageSquare size={16} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Provider</Text>
              </View>
              <View style={styles.providerRow}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerInitial}>
                    {providerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{providerName}</Text>
                  <Text
                    style={[
                      theme.typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Service Provider
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() =>
                  router.push(`/messages/chat?id=${bookingId}`)
                }
              >
                <MessageSquare size={16} color={theme.colors.primary} />
                <Text style={styles.chatButtonText}>Message Provider</Text>
              </TouchableOpacity>
            </View>

            {/* ── Proof of Work ── */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <ImageIcon size={16} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Proof of Work</Text>
              </View>
              {proofPhotos.length === 0 ? (
                <Text
                  style={[
                    theme.typography.body2,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  No proof photos were attached for this booking.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.proofScroll}
                >
                  {proofPhotos.map((photo: any, index: number) =>
                    photo.signedUrl ? (
                      <Image
                        key={photo.id ?? index}
                        source={{ uri: photo.signedUrl }}
                        style={styles.proofImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View key={photo.id ?? index} style={styles.proofPlaceholder}>
                        <ImageIcon
                          size={28}
                          color={theme.colors.textTertiary}
                        />
                      </View>
                    ),
                  )}
                </ScrollView>
              )}
            </View>

            {/* ── Payment Receipt ── */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Receipt size={16} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Payment & Receipt</Text>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Total Paid</Text>
                <Text style={styles.amountValue}>{amountStr}</Text>
              </View>

              <View style={styles.divider} />

              <InfoRow
                icon={<Banknote size={16} color={theme.colors.primary} />}
                label="Payment Method"
                value={paymentMethod}
              />
              {paymentStatus && (
                <View style={styles.statusBadge}>
                  <CheckCircle2 size={14} color={theme.colors.success} />
                  <Text style={styles.statusBadgeText}>
                    {paymentStatus === 'SUCCESSFUL'
                      ? 'Payment Confirmed'
                      : paymentStatus}
                  </Text>
                </View>
              )}

              {receiptNumber && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.receiptRow}>
                    <Text
                      style={[
                        theme.typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Receipt No.
                    </Text>
                    <Text
                      style={[
                        theme.typography.body2,
                        {
                          color: theme.colors.textPrimary,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {receiptNumber}
                    </Text>
                  </View>
                  {receiptDate && (
                    <View style={styles.receiptRow}>
                      <Text
                        style={[
                          theme.typography.caption,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Issued
                      </Text>
                      <Text
                        style={[
                          theme.typography.body2,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        {receiptDate}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* ── Actions ── */}
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/review/${bookingId}`)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FFF8E1' }]}>
                  <Star size={20} color="#F59E0B" fill="#F59E0B" />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>Leave a Review</Text>
                  <Text style={styles.actionSub}>
                    Rate your experience with {providerName}
                  </Text>
                </View>
                <View style={styles.actionChevron}>
                  <Text
                    style={[
                      theme.typography.caption,
                      { color: theme.colors.primary },
                    ]}
                  >
                    →
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleReport}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: theme.colors.errorBackground },
                  ]}
                >
                  <AlertTriangle size={20} color={theme.colors.error} />
                </View>
                <View style={styles.actionText}>
                  <Text
                    style={[styles.actionTitle, { color: theme.colors.error }]}
                  >
                    Report Provider
                  </Text>
                  <Text style={styles.actionSub}>
                    Flag a concern about this service
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ height: theme.spacing.xxxl }} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: theme.layout.screenPadding,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  // Completion Banner
  completionBanner: {
    alignItems: 'center',
    backgroundColor: theme.colors.successBackground,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  completionIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  completionTitle: {
    ...theme.typography.h3,
    color: '#065f46',
    marginBottom: theme.spacing.xs,
  },
  completionSub: {
    ...theme.typography.body2,
    color: '#059669',
  },

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
  },

  // Provider
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  providerInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  providerName: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },

  // Proof photos
  proofScroll: { marginTop: theme.spacing.sm },
  proofImage: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.border,
  },
  proofPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Payment
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  amountLabel: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
  },
  amountValue: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.successBackground,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full ?? 999,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  statusBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },

  // Actions
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionTitle: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  actionSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  actionChevron: { paddingLeft: theme.spacing.sm },
  actionDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.lg,
  },
});
