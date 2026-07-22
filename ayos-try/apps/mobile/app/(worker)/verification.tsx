import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft, CheckCircle, Clock, AlertCircle, Upload,
  FileText, Camera, RefreshCw, Shield, BadgeCheck, Briefcase,
  Wallet, HelpCircle, ChevronDown, Home, MapPin, User,
} from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation, Layout, Typography, theme } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { Pill } from '@/components/Pill';
import { fetchWorkerVerification } from '@/services/api';

type StepStatus = 'done' | 'active' | 'pending' | 'rejected';

interface VerificationStep {
  id: string;
  label: string;
  desc: string;
  status: StepStatus;
  date?: string;
  note?: string;
}

interface Document {
  id: string;
  label: string;
  sub: string;
  status: 'uploaded' | 'verified' | 'rejected' | 'missing';
  date?: string;
}

const FAQ_ITEMS = [
  { q: 'How long does verification take?', a: 'Standard verification takes 1–2 business days after all documents are submitted and complete. You\'ll receive a notification once the review is done.' },
  { q: 'Why was my document rejected?', a: 'Documents are rejected if they are blurry, expired, incomplete, or do not match the required type. Check the rejection note on each document for the specific reason.' },
  { q: 'Can I work while verification is pending?', a: 'No. You need to be fully verified before receiving booking requests. This protects both workers and customers on the platform.' },
  { q: 'What happens if I\'m rejected?', a: 'You\'ll receive the specific reasons for rejection and can resubmit corrected documents. There is no limit on resubmissions.' },
  { q: 'How do I get the verified badge?', a: 'The verified badge is automatically added after an administrator approves the application.' },
];

function StepIcon({ status }: { status: StepStatus }) {
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
  return <View style={[styles.stepIcon, { backgroundColor: Colors.borderLight, borderWidth: 2, borderColor: Colors.border }]} />;
}

function StepTracker({steps}:{steps:VerificationStep[]}) {
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const totalSteps = steps.length;
  const progress = doneCount / totalSteps;

  return (
    <View style={styles.card}>
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <AppText variant="caption" color={Colors.textTertiary} style={{ textAlign: 'right' }}>
          {doneCount} of {totalSteps} steps complete
        </AppText>
      </View>

      {steps.map((step, i) => (
        <View key={step.id} style={styles.stepRow}>
          <View style={styles.stepLeft}>
            <StepIcon status={step.status} />
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: step.status === 'done' ? Colors.verified : Colors.borderLight }]} />
            )}
          </View>
          <View style={[styles.stepBody, i < steps.length - 1 && styles.stepBodySpaced]}>
            <View style={styles.stepHeader}>
              <AppText variant="bodySm" weight="bold" color={step.status === 'pending' ? Colors.textTertiary : Colors.textPrimary}>
                {step.label}
              </AppText>
              {step.date && <AppText variant="caption" color={Colors.textTertiary}>{step.date}</AppText>}
            </View>
            <AppText variant="caption" color={step.status === 'pending' ? Colors.border : Colors.textSecondary}>
              {step.desc}
            </AppText>
            {step.note && (
              <View style={styles.stepNote}>
                <Clock size={10} color={Colors.warning} />
                <AppText variant="caption" weight="bold" color={Colors.warning}>{step.note}</AppText>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function AlertCard({ type, title, body, action }: { type: 'warning' | 'info'; title: string; body: string; action?: { label: string; onPress: () => void } }) {
  const bg = type === 'warning' ? '#FFF4D6' : '#EEF4FF';
  const border = type === 'warning' ? 'rgba(245,166,35,0.3)' : 'rgba(46,107,203,0.2)';
  const iconColor = type === 'warning' ? Colors.warning : Colors.info;
  const btnColor = type === 'warning' ? Colors.warning : Colors.info;

  return (
    <View style={[styles.alertCard, { backgroundColor: bg, borderColor: border }]}>
      <AlertCircle size={14} color={iconColor} style={{ marginTop: 1, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>{title}</AppText>
        <AppText variant="caption" color={Colors.textSecondary} style={{ marginTop: 2, lineHeight: 18 }}>{body}</AppText>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={4}>
            <AppText variant="caption" weight="bold" color={btnColor} style={{ textDecorationLine: 'underline', marginTop: 6 }}>{action.label}</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function TipsCard() {
  return (
    <View style={[styles.card, { backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: 'rgba(46,107,203,0.15)' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Shield size={14} color={Colors.info} />
        <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>While you wait</AppText>
      </View>
      {[
        'Complete your profile bio and service description',
        'Add your service area and coverage radius',
        'Set your availability schedule',
        'Keep profile information current for customer review',
      ].map((tip, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 6 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.info, flexShrink: 0, marginTop: 5 }} />
          <AppText variant="caption" color={Colors.textSecondary} style={{ lineHeight: 18 }}>{tip}</AppText>
        </View>
      ))}
    </View>
  );
}

function NextStepsCard() {
  const items = [
    { icon: <BadgeCheck size={16} color={Colors.verified} />, text: 'Verified badge on your profile', bg: '#E7F8F5' },
    { icon: <Shield size={16} color={Colors.info} />, text: 'Included in AI professional matching', bg: '#EEF4FF' },
    { icon: <Briefcase size={16} color="#6B5BC5" />, text: 'Start receiving booking requests', bg: '#F3F0FF' },
  ];
  return (
    <View style={styles.card}>
      <AppText variant="bodySm" weight="bold" color={Colors.textPrimary} style={{ marginBottom: 10 }}>After Approval</AppText>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
            {item.icon}
          </View>
          <AppText variant="caption" color={Colors.textSecondary} style={{ fontWeight: '500' }}>{item.text}</AppText>
        </View>
      ))}
    </View>
  );
}

function DocSummary({documents}:{documents:Document[]}) {
  const counts = [
    { label: 'Verified', count: documents.filter((d) => d.status === 'verified').length, color: Colors.verified, bg: '#E7F8F5' },
    { label: 'In Review', count: documents.filter((d) => d.status === 'uploaded').length, color: Colors.warning, bg: '#FFF4D6' },
    { label: 'Issues', count: documents.filter((d) => d.status === 'rejected' || d.status === 'missing').length, color: Colors.error, bg: '#FFF0F0' },
  ];
  return (
    <View style={styles.docSummary}>
      {counts.map((s) => (
        <View key={s.label} style={[styles.docSummaryCard, { backgroundColor: s.bg }]}>
          <AppText variant="h3" weight="bold" color={s.color}>{s.count}</AppText>
          <AppText variant="caption" weight="bold" color={s.color}>{s.label}</AppText>
        </View>
      ))}
    </View>
  );
}

function DocRow({ doc }: { doc: Document }) {
  const config = {
    verified: { label: 'Verified', textColor: Colors.verified, bg: '#E7F8F5', icon: <CheckCircle size={12} color={Colors.verified} /> },
    uploaded: { label: 'In Review', textColor: Colors.warning, bg: '#FFF4D6', icon: <Clock size={12} color={Colors.warning} /> },
    rejected: { label: 'Rejected', textColor: Colors.error, bg: '#FFF0F0', icon: <AlertCircle size={12} color={Colors.error} /> },
    missing: { label: 'Missing', textColor: Colors.textTertiary, bg: '#F0F4FA', icon: <Upload size={12} color={Colors.textTertiary} /> },
  }[doc.status];

  return (
    <View style={[styles.docRow, (doc.status === 'rejected' || doc.status === 'missing') && { backgroundColor: doc.status === 'rejected' ? '#FFFAFA' : '#FAFAFA' }]}>
      <View style={styles.docIcon}>
        {doc.status === 'missing' || doc.status === 'rejected'
          ? <Upload size={16} color={doc.status === 'rejected' ? Colors.error : Colors.textTertiary} />
          : <FileText size={16} color={doc.status === 'verified' ? Colors.verified : Colors.warning} />
        }
      </View>
      <View style={styles.docBody}>
        <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>{doc.label}</AppText>
        <AppText variant="caption" color={Colors.textTertiary}>{doc.sub}</AppText>
        {doc.status === 'rejected' && (
          <AppText variant="caption" color={Colors.error} style={{ marginTop: 2, fontWeight: '500' }}>
            Photo too blurry — please reupload a clearer image
          </AppText>
        )}
      </View>
      <View style={styles.docRight}>
        <Pill label={config.label} textColor={config.textColor} bg={config.bg} />
        {doc.date && <AppText variant="caption" color={Colors.textTertiary} style={{ fontSize: 9 }}>{doc.date}</AppText>}
        {(doc.status === 'missing' || doc.status === 'rejected') && (
          <View style={styles.uploadBtn}>
            {doc.status === 'rejected' ? <RefreshCw size={12} color={Colors.info} /> : <Upload size={12} color={Colors.info} />}
          </View>
        )}
      </View>
    </View>
  );
}

function FaqItem({ q, a, isOpen, onPress }: { q: string; a: string; isOpen: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.faqItem} onPress={onPress}>
      <View style={styles.faqQ}>
        <AppText variant="bodySm" weight="semiBold" color={Colors.textPrimary} style={{ flex: 1 }}>{q}</AppText>
        <ChevronDown size={14} color={Colors.textTertiary} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
      </View>
      {isOpen && (
        <AppText variant="caption" color={Colors.textSecondary} style={styles.faqA}>{a}</AppText>
      )}
    </Pressable>
  );
}

export default function VerificationScreen() {
  const [tab, setTab] = useState<'status' | 'documents' | 'faq'>('status');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const[verification,setVerification]=useState<any>(null);useEffect(()=>{void fetchWorkerVerification().then(result=>{if(!result.error)setVerification(result.data)});},[]);const status=verification?.status??'PENDING';const submitted=verification?.created_at?new Date(verification.created_at).toLocaleDateString():'Not submitted';const documents:Document[]=(verification?.document_paths??[]).map((path:string,index:number)=>({id:path,label:`Submitted document ${index+1}`,sub:path.split('/').pop()??'Private file',status:status==='APPROVED'?'verified':status==='REJECTED'?'rejected':'uploaded',date:submitted}));const steps:VerificationStep[]=[{id:'register',label:'Registration',desc:'Account created and profile information submitted',status:'done'},{id:'documents',label:'Document Upload',desc:`${documents.length} private document(s) submitted`,status:documents.length?'done':'pending'},{id:'review',label:'Administrator Review',desc:verification?.requested_notes??'Application review status',status:status==='APPROVED'?'done':status==='REJECTED'?'rejected':'active',note:status},{id:'activate',label:'Profile Activated',desc:'Visible to eligible customers after approval',status:status==='APPROVED'?'done':'pending'}];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color={Colors.white} />
        </Pressable>
        <AppText variant="h3" weight="bold" color={Colors.white} style={{ flex: 1 }}>Verification</AppText>
        <Pressable style={styles.headerIconBtn} hitSlop={8}>
          <HelpCircle size={16} color={Colors.white} />
        </Pressable>
      </View>

      <View style={styles.statusBanner}>
        <View style={styles.bannerIconWrap}>
          <Clock size={20} color={Colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" color={Colors.white}>{status.replaceAll('_',' ')}</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.55)">Submitted {submitted}</AppText>
        </View>
        <Pill label={`${steps.filter(step=>step.status==='done').length} / ${steps.length}`} textColor="rgba(255,255,255,0.7)" bg="rgba(255,255,255,0.12)" />
      </View>

      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          {(['status', 'documents', 'faq'] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <AppText variant="caption" weight="bold" color={tab === t ? Colors.textPrimary : 'rgba(255,255,255,0.45)'}>
                {t === 'status' ? 'Status' : t === 'documents' ? 'Documents' : 'FAQ'}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'status' && (
          <>
            <StepTracker steps={steps}/>

            <AlertCard
              type="warning"
              title={status==='REJECTED'?'Action Required':'Application Status'}
              body={verification?.requested_notes??(status==='REJECTED'?'Review the administrator feedback and resubmit your documents.':'Your submitted application is tracked here.')}
              action={{ label: 'Go to Documents', onPress: () => setTab('documents') }}
            />

            <TipsCard />
            <NextStepsCard />
          </>
        )}

        {tab === 'documents' && (
          <>
            <DocSummary documents={documents}/>

            <View style={styles.card}>
              {documents.map((doc) => (
                <DocRow key={doc.id} doc={doc} />
              ))}
            </View>

            <Pressable style={styles.uploadArea} onPress={() => Alert.alert('Resubmit Documents', 'To resubmit documents, please contact support or re-register as a worker.')}>
              <Camera size={20} color={Colors.info} />
              <AppText variant="bodySm" weight="bold" color={Colors.info}>Upload Additional Documents</AppText>
              <AppText variant="caption" color={Colors.textTertiary}>JPG, PNG, PDF · Max 10MB per file</AppText>
            </Pressable>

            <AlertCard
              type="info"
              title="Accepted Government IDs"
              body="PhilSys, Passport, Driver's License, SSS, GSIS, PRC ID, Voter's ID, or Postal ID. All documents must be valid and not expired."
            />
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
                  onPress={() => setExpandedFaq(expandedFaq === item.q ? null : item.q)}
                />
              ))}
            </View>

            <View style={styles.supportCard}>
              <HelpCircle size={18} color={Colors.info} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold" color={Colors.textPrimary}>Need help?</AppText>
                <AppText variant="caption" color={Colors.textTertiary}>Our team is available Mon–Sat, 8 AM–6 PM</AppText>
              </View>
              <View style={styles.supportBtn}>
                <AppText variant="caption" weight="bold" color={Colors.info}>Contact Us</AppText>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: theme.colors.primary, paddingTop: Spacing['16'], paddingBottom: Spacing['4'],
    paddingHorizontal: Layout.screenPadding, flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing['3'] },
  headerIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

  // Status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['2'],
    backgroundColor: theme.colors.primary, paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing['4'],
  },
  bannerIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(245,166,35,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  // Tabs
  tabsWrap: { backgroundColor: theme.colors.primary, paddingHorizontal: Layout.screenPadding, paddingBottom: Spacing['4'] },
  tabs: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 3, gap: 3,
  },
  tab: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white },

  // Content
  scrollView: { flex: 1 },
  scrollContent: { padding: Layout.screenPadding, gap: Spacing['3'], paddingBottom: Spacing['10'] },

  // Card
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing['4'], ...Elevation.sm },

  // Progress
  progressWrap: { marginBottom: Spacing['4'], gap: Spacing['1'] },
  progressTrack: { height: 5, backgroundColor: Colors.borderLight, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.verified, borderRadius: 99 },

  // Steps
  stepRow: { flexDirection: 'row', gap: Spacing['3'], alignItems: 'flex-start' },
  stepLeft: { flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  stepIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  pulse: { position: 'absolute', inset: -3, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(245,166,35,0.4)' },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 4, borderRadius: 1 },
  stepBody: { flex: 1, paddingTop: 2 },
  stepBodySpaced: { paddingBottom: Spacing['4'] },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  stepNote: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },

  // Alert
  alertCard: { flexDirection: 'row', gap: Spacing['2'], borderRadius: Radius.lg, padding: Spacing['3'], borderWidth: 1 },

  // Doc summary
  docSummary: { flexDirection: 'row', gap: Spacing['2'] },
  docSummaryCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing['2'], alignItems: 'center' },

  // Doc row
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['2'], paddingVertical: Spacing['3'], borderBottomWidth: 1, borderBottomColor: 'rgba(11,31,77,0.06)' },
  docIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#F0F4FA', justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  docBody: { flex: 1 },
  docRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  uploadBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#EEF4FF', justifyContent: 'center', alignItems: 'center' },

  // Upload area
  uploadArea: {
    alignItems: 'center', justifyContent: 'center', gap: Spacing['1'],
    padding: Spacing['5'], borderRadius: Radius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(46,107,203,0.3)',
    backgroundColor: '#EEF4FF',
  },

  // FAQ
  faqItem: { borderBottomWidth: 1, borderBottomColor: 'rgba(11,31,77,0.07)' },
  faqQ: { paddingVertical: Spacing['3'], flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  faqA: { paddingBottom: Spacing['3'], paddingHorizontal: Spacing['3'], lineHeight: 18 },

  // Support
  supportCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['2'],
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing['4'], ...Elevation.sm,
  },
  supportBtn: {
    paddingVertical: Spacing['2'], paddingHorizontal: Spacing['3'],
    borderRadius: Radius.md, backgroundColor: '#EEF4FF',
  },
});
