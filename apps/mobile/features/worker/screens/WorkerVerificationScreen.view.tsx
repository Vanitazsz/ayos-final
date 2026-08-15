import { Pressable, ScrollView, View } from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Camera,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { ProfileReadinessBanner } from '@/components/ProfileReadinessBanner';
import { Screen } from '@/components/layout/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Colors, Spacing, theme } from '@/constants/theme';
import {
  getDocRowLabel,
  getDocRowTone,
  getStatusLabel,
  getVerificationTone,
  type StatusTone,
  type VerificationDocument,
  type VerificationStep,
} from '../logic/WorkerVerificationScreenLogic';
import { styles } from './WorkerVerificationScreen.styles';
import type {
  useWorkerVerificationScreenController,
  VerificationTab,
} from '../hooks/useWorkerVerificationScreenController';

type Controller = ReturnType<typeof useWorkerVerificationScreenController>;

const toneBg: Record<StatusTone, string> = {
  verified: Colors.verifiedBg,
  warning: Colors.warningBg,
  error: Colors.errorBg,
  info: Colors.infoBg,
  neutral: Colors.surfaceLight,
};

const toneFg: Record<StatusTone, string> = {
  verified: Colors.verified,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
  neutral: Colors.textSecondary,
};

const badgeVariant: Record<
  StatusTone,
  'verified' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
> = {
  verified: 'verified',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'neutral',
};

const FAQ_ITEMS = [
  {
    q: 'How long does verification take?',
    a: "Standard verification takes 1–2 business days after all documents are submitted and complete. You'll receive a notification once the review is done.",
  },
  {
    q: 'Why was my document rejected?',
    a: 'Documents are rejected if they are blurry, expired, incomplete, or do not match the required type. Check the rejection note on each document for the specific reason.',
  },
  {
    q: 'Can I work while verification is pending?',
    a: 'No. You need to be fully verified before receiving booking requests. This protects both workers and customers on the platform.',
  },
  {
    q: "What happens if I'm rejected?",
    a: "You'll receive the specific reasons for rejection and can resubmit corrected documents. There is no limit on resubmissions.",
  },
  {
    q: 'How do I get the verified badge?',
    a: 'The verified badge is automatically added after an administrator approves the application.',
  },
];

const TIPS = [
  'Complete your profile bio and service description',
  'Add your service area and coverage radius',
  'Set your availability schedule',
  'Keep profile information current for customer review',
];

const NEXT_STEPS = [
  {
    icon: <BadgeCheck size={16} color={Colors.verified} />,
    text: 'Verified badge on your profile',
    bg: Colors.verifiedBg,
  },
  {
    icon: <Shield size={16} color={Colors.info} />,
    text: 'Included in AI professional matching',
    bg: Colors.infoBg,
  },
  {
    icon: <Briefcase size={16} color={Colors.info} />,
    text: 'Start receiving booking requests',
    bg: Colors.infoBg,
  },
];

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        hitSlop={12}
        style={styles.backBtn}
      >
        <ArrowLeft size={24} color={Colors.textPrimary} />
      </Pressable>
      <AppText variant="h3" weight="bold" style={styles.headerTitle}>
        Verification
      </AppText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function BannerIcon({ tone }: { tone: StatusTone }) {
  if (tone === 'verified') return <CheckCircle size={18} color={toneFg[tone]} />;
  if (tone === 'error') return <AlertCircle size={18} color={toneFg[tone]} />;
  if (tone === 'warning') return <RefreshCw size={18} color={toneFg[tone]} />;
  return <Clock size={18} color={toneFg[tone]} />;
}

function StatusBanner({
  status,
  submitted,
  doneCount,
  totalSteps,
}: {
  status: string;
  submitted: string;
  doneCount: number;
  totalSteps: number;
}) {
  const tone = getVerificationTone(status);
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: toneBg[tone],
          borderColor: `${toneFg[tone]}40`,
        },
      ]}
    >
      <View
        style={[styles.bannerIconWrap, { backgroundColor: `${toneFg[tone]}22` }]}
      >
        <BannerIcon tone={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>
          {getStatusLabel(status)}
        </AppText>
        <AppText variant="caption" color={Colors.textSecondary}>
          Submitted {submitted}
        </AppText>
      </View>
      <Badge label={`${doneCount} / ${totalSteps}`} variant="neutral" />
    </View>
  );
}

function VerificationTabs({
  tab,
  onChange,
}: {
  tab: VerificationTab;
  onChange: (tab: VerificationTab) => void;
}) {
  return (
    <View style={styles.tabsTrack}>
      {(['status', 'documents', 'faq'] as const).map((item) => (
        <Pressable
          key={item}
          style={[styles.tab, tab === item && styles.tabActive]}
          onPress={() => onChange(item)}
        >
          <AppText
            variant="caption"
            weight="bold"
            color={tab === item ? Colors.textPrimary : Colors.textSecondary}
          >
            {item === 'status' ? 'Status' : item === 'documents' ? 'Documents' : 'FAQ'}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function StepIcon({ status }: { status: VerificationStep['status'] }) {
  if (status === 'done') {
    return (
      <View style={[styles.stepIcon, { backgroundColor: Colors.verified }]}>
        <CheckCircle size={13} color={Colors.white} />
      </View>
    );
  }
  if (status === 'active') {
    return (
      <View style={[styles.stepIcon, { backgroundColor: Colors.warning }]}>
        <View style={styles.pulse} />
        <Clock size={11} color={Colors.white} />
      </View>
    );
  }
  if (status === 'rejected') {
    return (
      <View style={[styles.stepIcon, { backgroundColor: Colors.error }]}>
        <AlertCircle size={13} color={Colors.white} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.stepIcon,
        { backgroundColor: Colors.borderLight, borderWidth: 2, borderColor: Colors.border },
      ]}
    />
  );
}

function StepTracker({ steps }: { steps: VerificationStep[] }) {
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progress = doneCount / steps.length;

  return (
    <View style={styles.card}>
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <AppText variant="caption" color={Colors.textTertiary} style={{ textAlign: 'right' }}>
          {doneCount} of {steps.length} steps complete
        </AppText>
      </View>

      {steps.map((step, i) => (
        <View key={step.id} style={styles.stepRow}>
          <View style={styles.stepLeft}>
            <StepIcon status={step.status} />
            {i < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: step.status === 'done' ? Colors.verified : Colors.borderLight },
                ]}
              />
            )}
          </View>
          <View style={[styles.stepBody, i < steps.length - 1 && styles.stepBodySpaced]}>
            <View style={styles.stepHeader}>
              <AppText
                variant="bodySm"
                weight="bold"
                color={step.status === 'pending' ? Colors.textTertiary : Colors.textPrimary}
              >
                {step.label}
              </AppText>
              {step.date && (
                <AppText variant="caption" color={Colors.textTertiary}>
                  {step.date}
                </AppText>
              )}
            </View>
            <AppText
              variant="caption"
              color={step.status === 'pending' ? Colors.textTertiary : Colors.textSecondary}
            >
              {step.desc}
            </AppText>
            {step.note && (
              <View style={styles.stepNote}>
                <Clock size={10} color={Colors.warning} />
                <AppText variant="caption" weight="bold" color={Colors.warning}>
                  {step.note}
                </AppText>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function AlertCard({
  tone,
  title,
  body,
  action,
}: {
  tone: 'warning' | 'info';
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View
      style={[
        styles.alertCard,
        {
          backgroundColor: toneBg[tone],
          borderColor: `${toneFg[tone]}40`,
        },
      ]}
    >
      <AlertCircle size={14} color={toneFg[tone]} style={{ marginTop: 1, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>
          {title}
        </AppText>
        <AppText
          variant="caption"
          color={Colors.textSecondary}
          style={{ marginTop: 2, lineHeight: 18 }}
        >
          {body}
        </AppText>
        {action && (
          <Pressable onPress={action.onPress} style={styles.alertActionPressable}>
            <AppText
              variant="caption"
              weight="bold"
              color={toneFg[tone]}
              style={[styles.alertActionText, { borderBottomColor: toneFg[tone] }]}
            >
              {action.label}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function TipsCard() {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: Colors.infoBg,
          borderWidth: 1,
          borderColor: `${Colors.info}40`,
        },
      ]}
    >
      <View style={styles.tipsTitle}>
        <Shield size={14} color={Colors.info} />
        <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>
          While you wait
        </AppText>
      </View>
      {TIPS.map((tip, i) => (
        <View key={i} style={styles.tipsRow}>
          <View style={[styles.tipsBullet, { backgroundColor: Colors.info }]} />
          <AppText variant="caption" color={Colors.textSecondary} style={{ lineHeight: 18 }}>
            {tip}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function NextStepsCard() {
  return (
    <View style={styles.card}>
      <AppText
        variant="bodySm"
        weight="bold"
        color={Colors.textPrimary}
        style={{ marginBottom: Spacing['3'] }}
      >
        After Approval
      </AppText>
      {NEXT_STEPS.map((item, i) => (
        <View key={i} style={styles.nextStepsItem}>
          <View style={[styles.nextStepsIcon, { backgroundColor: item.bg }]}>
            {item.icon}
          </View>
          <AppText variant="caption" color={Colors.textSecondary} style={styles.nextStepsText}>
            {item.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function DocSummary({ documents }: { documents: VerificationDocument[] }) {
  const counts = [
    {
      label: 'Verified',
      count: documents.filter((d) => d.status === 'verified').length,
      tone: 'verified' as const,
    },
    {
      label: 'In Review',
      count: documents.filter((d) => d.status === 'uploaded').length,
      tone: 'warning' as const,
    },
    {
      label: 'Issues',
      count: documents.filter(
        (d) => d.status === 'rejected' || d.status === 'missing',
      ).length,
      tone: 'error' as const,
    },
  ];
  return (
    <View style={styles.docSummary}>
      {counts.map((s) => (
        <View key={s.label} style={[styles.docSummaryCard, { backgroundColor: toneBg[s.tone] }]}>
          <AppText variant="h3" weight="bold" color={toneFg[s.tone]}>
            {s.count}
          </AppText>
          <AppText variant="caption" weight="bold" color={toneFg[s.tone]}>
            {s.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function DocStatusIcon({ status }: { status: VerificationDocument['status'] }) {
  if (status === 'verified') return <CheckCircle size={12} color={Colors.verified} />;
  if (status === 'uploaded') return <Clock size={12} color={Colors.warning} />;
  if (status === 'rejected') return <AlertCircle size={12} color={Colors.error} />;
  return <Upload size={12} color={Colors.textTertiary} />;
}

function DocRow({
  doc,
  onRemove,
}: {
  doc: VerificationDocument;
  onRemove?: () => void;
}) {
  const tone = getDocRowTone(doc.status);
  const needsAttention = doc.status === 'rejected' || doc.status === 'missing';
  const rowBg = doc.status === 'rejected' ? Colors.errorBg : Colors.surfaceLight;

  return (
    <View
      style={[
        styles.docRow,
        needsAttention && [styles.docRowAttention, { backgroundColor: rowBg }],
      ]}
    >
      <View style={styles.docIcon}>
        {doc.status === 'missing' || doc.status === 'rejected' ? (
          <Upload
            size={16}
            color={doc.status === 'rejected' ? Colors.error : Colors.textTertiary}
          />
        ) : (
          <FileText
            size={16}
            color={doc.status === 'verified' ? Colors.verified : Colors.warning}
          />
        )}
      </View>
      <View style={styles.docBody}>
        <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>
          {doc.label}
        </AppText>
        <AppText variant="caption" color={Colors.textTertiary}>
          {doc.sub}
        </AppText>
        {doc.status === 'rejected' && (
          <AppText variant="caption" color={Colors.error} style={{ marginTop: 2, fontWeight: '500' }}>
            Photo too blurry — please reupload a clearer image
          </AppText>
        )}
      </View>
      <View style={styles.docRight}>
        <Badge
          label={getDocRowLabel(doc.status)}
          variant={badgeVariant[tone]}
          icon={<DocStatusIcon status={doc.status} />}
        />
        {doc.date && (
          <AppText variant="caption" color={Colors.textTertiary} style={styles.docDate}>
            {doc.date}
          </AppText>
        )}
        {(doc.status === 'missing' || doc.status === 'rejected') && (
          <View style={styles.uploadBtn}>
            {doc.status === 'rejected' ? (
              <RefreshCw size={12} color={Colors.info} />
            ) : (
              <Upload size={12} color={Colors.info} />
            )}
          </View>
        )}
        {onRemove && (
          <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
            <Trash2 size={13} color={Colors.error} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function FaqItem({
  q,
  a,
  isOpen,
  onPress,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.faqItem} onPress={onPress}>
      <View style={styles.faqQ}>
        <AppText variant="bodySm" weight="semiBold" color={Colors.textPrimary} style={{ flex: 1 }}>
          {q}
        </AppText>
        <ChevronDown
          size={14}
          color={Colors.textTertiary}
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </View>
      {isOpen && (
        <AppText variant="caption" color={Colors.textSecondary} style={styles.faqA}>
          {a}
        </AppText>
      )}
    </Pressable>
  );
}

function VerificationLoading({ onBack }: { onBack: () => void }) {
  return (
    <Screen
      safeArea
      keyboardAvoiding={false}
      backgroundColor={Colors.background}
      style={{ paddingBottom: 0 }}
    >
      <ScreenHeader onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Skeleton width="100%" height={84} borderRadius={theme.radius.xl} style={styles.skeletonBlock} />
        <Skeleton width="100%" height={180} borderRadius={theme.radius.xl} style={styles.skeletonBlock} />
        <Skeleton width="100%" height={120} borderRadius={theme.radius.xl} style={styles.skeletonBlock} />
      </ScrollView>
    </Screen>
  );
}

function VerificationError({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <Screen
      safeArea
      keyboardAvoiding={false}
      backgroundColor={Colors.background}
      style={{ paddingBottom: 0 }}
    >
      <ScreenHeader onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.errorCard}>
          <AppText variant="bodySm" weight="bold" color={Colors.error}>
            {message}
          </AppText>
          <AppButton
            label="Try Again"
            variant="outline"
            size="sm"
            onPress={onRetry}
            style={styles.retryBtn}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

export function VerificationView({ model }: { model: Controller }) {
  const {
    router,
    handleBack,
    tab,
    setTab,
    expandedFaq,
    toggleFaq,
    loading,
    loadError,
    reload,
    verification,
    profileComplete,
    status,
    submitted,
    documents,
    steps,
    doneCount,
    canEditDocs,
    canResubmit,
    draftFront,
    draftBack,
    busyPath,
    resubmitting,
    progressMessage,
    pickDocument,
    confirmRemoveDocument,
    submitDraft,
  } = model;

  if (loading) return <VerificationLoading onBack={handleBack} />;
  if (loadError && !verification)
    return (
      <VerificationError
        message={loadError}
        onRetry={() => void reload()}
        onBack={handleBack}
      />
    );

  return (
    <Screen
      safeArea
      keyboardAvoiding={false}
      backgroundColor={Colors.background}
      style={{ paddingBottom: 0 }}
    >
      <ScreenHeader onBack={handleBack} />
      <StatusBanner
        status={status}
        submitted={submitted}
        doneCount={doneCount}
        totalSteps={steps.length}
      />
      <VerificationTabs tab={tab} onChange={setTab} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'status' && (
          <>
            <ProfileReadinessBanner
              complete={profileComplete}
              missing={profileComplete ? [] : ['saved profile details']}
              onCompleteProfile={() => router.push('/(worker)/personal-info')}
            />
            <StepTracker steps={steps} />

            <AlertCard
              tone="warning"
              title={status === 'REJECTED' ? 'Action Required' : 'Application Status'}
              body={
                verification?.requested_notes ??
                (status === 'REJECTED'
                  ? 'Review the administrator feedback and resubmit your documents.'
                  : 'Your submitted application is tracked here.')
              }
              action={{ label: 'Go to Documents', onPress: () => setTab('documents') }}
            />

            <TipsCard />
            <NextStepsCard />
          </>
        )}

        {tab === 'documents' && (
          <>
            <DocSummary documents={documents} />

            {documents.length > 0 && (
              <View style={styles.card}>
                {documents.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    onRemove={
                      canEditDocs && busyPath !== doc.id
                        ? () => confirmRemoveDocument(doc.id)
                        : undefined
                    }
                  />
                ))}
              </View>
            )}

            {canResubmit && (
              <>
                <View style={[styles.uploadArea, resubmitting && { opacity: 0.6 }]}>
                  <Camera size={20} color={Colors.info} />
                  <AppText variant="bodySm" weight="bold" color={Colors.info}>
                    {status === 'REJECTED' ? 'Resubmit Documents' : 'Replace Documents'}
                  </AppText>
                  <AppText variant="caption" color={Colors.textTertiary}>
                    JPG, PNG · Max 10MB per file
                  </AppText>

                  <Pressable
                    style={[styles.draftPick, draftFront && styles.draftPickFilled]}
                    onPress={() => pickDocument('front')}
                    disabled={resubmitting}
                  >
                    {draftFront ? (
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={Colors.verified}
                        numberOfLines={1}
                        style={{ flex: 1 }}
                      >
                        Front ID selected
                      </AppText>
                    ) : (
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={Colors.info}
                        style={{ flex: 1 }}
                      >
                        Pick the front of your ID
                      </AppText>
                    )}
                    {draftFront && <RefreshCw size={12} color={Colors.verified} />}
                  </Pressable>

                  <Pressable
                    style={[styles.draftPick, draftBack && styles.draftPickFilled]}
                    onPress={() => pickDocument('back')}
                    disabled={resubmitting}
                  >
                    {draftBack ? (
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={Colors.verified}
                        numberOfLines={1}
                        style={{ flex: 1 }}
                      >
                        Back ID selected
                      </AppText>
                    ) : (
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={Colors.info}
                        style={{ flex: 1 }}
                      >
                        Pick the back of your ID
                      </AppText>
                    )}
                    {draftBack && <RefreshCw size={12} color={Colors.verified} />}
                  </Pressable>

                  <AppButton
                    label={progressMessage ?? 'Submit documents'}
                    loading={resubmitting && !progressMessage}
                    disabled={!draftFront || !draftBack || resubmitting}
                    fullWidth
                    onPress={submitDraft}
                    style={styles.submitBtn}
                  />
                </View>

                <AlertCard
                  tone="info"
                  title="Accepted Government IDs"
                  body="PhilSys, Passport, Driver's License, SSS, GSIS, PRC ID, Voter's ID, or Postal ID. All documents must be valid and not expired."
                />
              </>
            )}
          </>
        )}

        {tab === 'faq' && (
          <>
            <View style={styles.card}>
              {FAQ_ITEMS.map((item) => (
                <FaqItem
                  key={item.q}
                  q={item.q}
                  a={item.a}
                  isOpen={expandedFaq === item.q}
                  onPress={() => toggleFaq(item.q)}
                />
              ))}
            </View>

            <View style={styles.supportCard}>
              <HelpCircle size={18} color={Colors.info} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>
                  Need help?
                </AppText>
                <AppText variant="caption" color={Colors.textTertiary}>
                  Our team is available Mon–Sat, 8 AM–6 PM
                </AppText>
              </View>
              <View style={styles.supportBtn}>
                <AppText variant="caption" weight="bold" color={Colors.info}>
                  Contact Us
                </AppText>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
