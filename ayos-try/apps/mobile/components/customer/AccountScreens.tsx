import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BadgeHelp,
  Bell,
  BookOpenText,
  Check,
  CircleAlert,
  CircleDollarSign,
  CreditCard,
  FileText,
  Flag,
  Globe2,
  Heart,
  HelpCircle,
  History,
  Languages,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wallet,
} from 'lucide-react-native';
import {
  CustomerEmptyState,
  CustomerPage,
  IconTile,
  MenuRow,
  PageHeader,
  PrimaryButton,
  SectionHeader,
  SurfaceCard,
  customerColors,
} from './CustomerUI';
import {
  fetchCustomerProfile,
  fetchFavoriteWorkers,
  fetchWallet,
  fetchWalletTransactions,
  createSupportTicket,
} from '@/services/api';
import { changeMyPassword, updateMyProfile } from '@/services/profile';
import { useAuthStore } from '@/store/useAuthStore';

function LoadingState() {
  return <View style={styles.loading}><ActivityIndicator color={customerColors.primary} /></View>;
}

export function PersonalInformationScreen() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchCustomerProfile().then((result) => {
      setProfile(result.data);
      setName(result.data?.name ?? authUser?.name ?? '');
      setMobile(authUser?.phone ?? '');
      setError(result.error ?? '');
    });
  }, [authUser]);

  const save = async () => {
    if (name.trim().length < 2) {
      setError('Enter your complete name.');
      return;
    }
    setSaving(true);
    try {
      const normalized = mobile.startsWith('0') ? `+63${mobile.slice(1)}` : mobile;
      const updated = await updateMyProfile({ displayName: name, mobile: normalized || null, complete: true });
      setProfile((current: any) => ({ ...current, name: updated.displayName }));
      setEditing(false);
      setError('');
      Alert.alert('Profile updated', 'Your personal information has been saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomerPage>
      <PageHeader title="Account" subtitle="Personal Information" back />
      {!profile && !error ? <LoadingState /> : (
        <>
          <SurfaceCard style={styles.formCard}>
            <Field icon={UserRound} label="Name" value={name} editable={editing} onChangeText={setName} />
            <Field icon={Mail} label="Email Address" value={profile?.email || authUser?.email || ''} editable={false} helper="Email changes require verification." />
            <Field icon={Phone} label="Phone Number" value={mobile} editable={editing} onChangeText={setMobile} keyboardType="phone-pad" last />
          </SurfaceCard>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttonGap}>
            <PrimaryButton
              label={editing ? 'Save changes' : 'Edit information'}
              loading={saving}
              onPress={editing ? () => void save() : () => setEditing(true)}
            />
          </View>
          <SectionHeader title="Manage details" />
          <SurfaceCard>
            <MenuRow icon={MapPin} label="Saved Addresses" description="Home and service locations" onPress={() => router.push('/settings/addresses')} />
            <MenuRow icon={Heart} label="Favorite Workers" description="Professionals you trust" onPress={() => router.push('/account/favorites')} last />
          </SurfaceCard>
        </>
      )}
    </CustomerPage>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  editable,
  onChangeText,
  helper,
  keyboardType,
  last,
}: any) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <IconTile icon={Icon} />
      <View style={styles.fieldCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          style={[styles.fieldInput, editable && styles.fieldInputEditing]}
          placeholderTextColor={customerColors.subtle}
        />
        {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
      </View>
      {editable ? <Text style={styles.editLabel}>Edit</Text> : null}
    </View>
  );
}

export function WalletScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([fetchWallet(), fetchWalletTransactions()]).then(([walletResult, txResult]) => {
      setWallet(walletResult.data);
      setTransactions(txResult.data);
      setLoading(false);
    });
  }, []);

  const amounts = [500, 1000, 2000, 5000];
  return (
    <CustomerPage>
      <PageHeader title="My Wallet" subtitle="Manage your A-yos balance" back />
      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>{loading ? '—' : wallet?.available || '₱0.00'}</Text>
          <Text style={styles.balanceCaption}>Available for service payments</Text>
        </View>
        <View style={styles.balanceIcon}><Wallet size={28} color={customerColors.primary} /></View>
      </View>

      <SectionHeader title="Quick Top Up" />
      <View style={styles.amountGrid}>
        {amounts.map((amount) => (
          <Pressable
            key={amount}
            onPress={() => setSelected(amount)}
            style={[styles.amount, selected === amount && styles.amountSelected]}
          >
            <Text style={[styles.amountText, selected === amount && styles.amountTextSelected]}>
              ₱{amount.toLocaleString('en-PH')}
            </Text>
            {selected === amount ? <View style={styles.amountCheck}><Check size={11} color={customerColors.surface} /></View> : null}
          </Pressable>
        ))}
      </View>
      <PrimaryButton
        label={selected ? `Top Up ₱${selected.toLocaleString('en-PH')}` : 'Select an amount to Top Up'}
        disabled={!selected}
        onPress={() => router.push('/account/payments')}
      />

      <SectionHeader title="Recent Transactions" actionLabel="See All" onAction={() => router.push('/account/transactions')} />
      {loading ? <LoadingState /> : transactions.length ? (
        <SurfaceCard>
          {transactions.slice(0, 4).map((item, index) => (
            <TransactionRow key={item.id} item={item} last={index === Math.min(transactions.length, 4) - 1} />
          ))}
        </SurfaceCard>
      ) : (
        <SurfaceCard style={styles.smallEmpty}><Text style={styles.smallEmptyText}>No wallet transactions yet.</Text></SurfaceCard>
      )}
    </CustomerPage>
  );
}

function TransactionRow({ item, last }: { item: any; last?: boolean }) {
  return (
    <View style={[styles.transaction, !last && styles.fieldBorder]}>
      <IconTile icon={item.credit ? CircleDollarSign : ReceiptText} color={item.credit ? customerColors.success : customerColors.primary} background={item.credit ? customerColors.successSoft : customerColors.primarySoft} />
      <View style={styles.transactionCopy}>
        <Text style={styles.transactionTitle}>{item.label || 'Wallet transaction'}</Text>
        <Text style={styles.transactionDate}>{item.date} · {item.status}</Text>
      </View>
      <Text style={[styles.transactionAmount, item.credit && styles.credit]}>{item.amount}</Text>
    </View>
  );
}

export function TransactionsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Payments' | 'Top Ups' | 'Refunds'>('All');
  useEffect(() => {
    void fetchWalletTransactions().then((result) => {
      setItems(result.data);
      setLoading(false);
    });
  }, []);
  const visible = items.filter((item) => {
    const label = item.label.toLowerCase();
    if (filter === 'Payments') return label.includes('payment');
    if (filter === 'Top Ups') return label.includes('top up') || label.includes('top_up');
    if (filter === 'Refunds') return label.includes('refund');
    return true;
  });
  return (
    <CustomerPage>
      <PageHeader title="Payment History" subtitle="Your payments, top ups, and refunds" back />
      <View style={styles.filterRow}>
        {(['All', 'Payments', 'Top Ups', 'Refunds'] as const).map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <LoadingState /> : visible.length ? (
        <SurfaceCard style={styles.topGap}>
          {visible.map((item, index) => <TransactionRow key={item.id} item={item} last={index === visible.length - 1} />)}
        </SurfaceCard>
      ) : (
        <CustomerEmptyState icon={History} title="No transactions yet" description="Payments and wallet top-ups will appear here." />
      )}
    </CustomerPage>
  );
}

export function PaymentsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('wallet');
  return (
    <CustomerPage>
      <PageHeader title="Payments" subtitle="Choose how you pay for services" back action={<Pressable style={styles.addButton} onPress={() => Alert.alert('Add payment method', 'Card payments are not enabled for this A-yos project yet.')}><Plus size={18} color={customerColors.primary} /><Text style={styles.addText}>Add New</Text></Pressable>} />
      <SectionHeader title="Payment Methods" />
      <SurfaceCard>
        <PaymentMethod icon={Wallet} title="A-yos Wallet" subtitle="Balance shown in My Wallet" selected={selected === 'wallet'} onPress={() => setSelected('wallet')} />
        <PaymentMethod icon={CreditCard} title="Credit / Debit Card" subtitle="No saved card" selected={selected === 'card'} onPress={() => setSelected('card')} last />
      </SurfaceCard>
      <View style={styles.notice}><ShieldCheck size={18} color={customerColors.success} /><Text style={styles.noticeText}>Your payment details are encrypted and handled securely. Full card numbers and CVVs are never displayed.</Text></View>
      <SectionHeader title="Payment History" />
      <SurfaceCard>
        <MenuRow icon={History} label="View All History" description="See your past transactions" onPress={() => router.push('/account/transactions')} last />
      </SurfaceCard>
    </CustomerPage>
  );
}

function PaymentMethod({ icon: Icon, title, subtitle, selected, onPress, last }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.paymentMethod, !last && styles.fieldBorder]}>
      <IconTile icon={Icon} />
      <View style={styles.transactionCopy}><Text style={styles.transactionTitle}>{title}</Text><Text style={styles.transactionDate}>{subtitle}</Text></View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  );
}

export function FavoritesScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetchFavoriteWorkers().then((result) => {
      setWorkers(result.data);
      setLoading(false);
    });
  }, []);
  return (
    <CustomerPage>
      <PageHeader title="Favorite Workers" subtitle="Trusted professionals for your next booking" back />
      {loading ? <LoadingState /> : workers.length ? workers.map((worker) => (
        <SurfaceCard key={worker.id} style={styles.favoriteCard}>
          <View style={styles.workerRow}>
            <View style={styles.workerInitial}><Text style={styles.workerInitialText}>{worker.name.charAt(0)}</Text></View>
            <View style={styles.transactionCopy}><Text style={styles.transactionTitle}>{worker.name}</Text><Text style={styles.transactionDate}>{worker.category} · ★ {worker.rating ? worker.rating.toFixed(1) : 'New'} · {worker.reviewCount} reviews</Text></View>
            <Heart size={20} color={customerColors.danger} fill={customerColors.danger} />
          </View>
          <View style={styles.favoriteActions}>
            <Pressable style={styles.favoriteSecondary} onPress={() => router.push(`/provider/${worker.id}` as any)}><Text style={styles.favoriteSecondaryText}>View Profile</Text></Pressable>
            <Pressable style={styles.favoritePrimary} onPress={() => router.push('/new-request/create')}><Text style={styles.favoritePrimaryText}>Book Now</Text></Pressable>
          </View>
        </SurfaceCard>
      )) : <CustomerEmptyState icon={Heart} title="No favorite workers yet" description="Tap the heart on a worker profile to save them here." />}
    </CustomerPage>
  );
}

export function PreferencesScreen() {
  const [settings, setSettings] = useState({ push: true, email: true, sms: false, dark: false });
  const toggle = (key: keyof typeof settings) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  return (
    <CustomerPage>
      <PageHeader title="Preferences" subtitle="Personalize your A-yos experience" back />
      <SectionHeader title="Notifications" />
      <SurfaceCard>
        <ToggleRow icon={Bell} label="Push Notifications" description="Receive alerts on your device" value={settings.push} onValueChange={() => toggle('push')} />
        <ToggleRow icon={Mail} label="Email Updates" description="Booking summaries and announcements" value={settings.email} onValueChange={() => toggle('email')} />
        <ToggleRow icon={Smartphone} label="SMS Alerts" description="Important service status updates" value={settings.sms} onValueChange={() => toggle('sms')} last />
      </SurfaceCard>
      <SectionHeader title="App Appearance" />
      <SurfaceCard><ToggleRow icon={Moon} label="Dark Mode" description="Use a darker color theme" value={settings.dark} onValueChange={() => toggle('dark')} last /></SurfaceCard>
      <SectionHeader title="Language & Region" />
      <SurfaceCard>
        <MenuRow icon={Languages} label="Language" value="English (US)" />
        <MenuRow icon={Globe2} label="Region" value="Philippines" />
        <MenuRow icon={CircleDollarSign} label="Currency" value="PHP" last />
      </SurfaceCard>
    </CustomerPage>
  );
}

function ToggleRow({ icon, label, description, value, onValueChange, last }: any) {
  return (
    <View style={[styles.toggleRow, !last && styles.fieldBorder]}>
      <IconTile icon={icon} />
      <View style={styles.transactionCopy}><Text style={styles.transactionTitle}>{label}</Text><Text style={styles.transactionDate}>{description}</Text></View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#D9DFE9', true: '#AFCBFF' }} thumbColor={value ? customerColors.primary : customerColors.surface} />
    </View>
  );
}

export function SupportScreen() {
  const router = useRouter();
  return (
    <CustomerPage>
      <PageHeader title="Support & Legal" subtitle="Help, safety, and important policies" back />
      <SectionHeader title="Support" />
      <SurfaceCard>
        <MenuRow icon={HelpCircle} label="Help Center" description="FAQs and guides" onPress={() => router.push('/account/help-center')} />
        <MenuRow icon={MessageCircle} label="Contact Us" description="Chat with our support team" onPress={() => router.push('/account/contact-support')} />
        <MenuRow icon={Flag} label="Report a User" description="Report misconduct or block someone" onPress={() => router.push('/account/report-user')} last />
      </SurfaceCard>
      <SectionHeader title="Legal" />
      <SurfaceCard>
        <MenuRow icon={ShieldCheck} label="Privacy Policy" description="How we protect your data" onPress={() => router.push('/account/privacy-policy')} />
        <MenuRow icon={FileText} label="Terms of Service" description="Rules and guidelines" onPress={() => router.push('/account/terms-of-service')} last />
      </SurfaceCard>
    </CustomerPage>
  );
}

const faq = [
  ['How do I book a service?', 'Tap the blue + button, describe the work, confirm your address and schedule, then review your request.'],
  ['How are workers verified?', 'A-yos reviews submitted identity and professional information before a worker can accept jobs.'],
  ['What if I need help during a job?', 'Open your booking and choose Contact Support. For immediate danger, contact local emergency services.'],
];

export function HelpCenterScreen() {
  const [query, setQuery] = useState('');
  const visible = faq.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <CustomerPage>
      <PageHeader title="Help Center" subtitle="Answers for common A-yos questions" back />
      <View style={styles.searchBox}><Search size={18} color={customerColors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search FAQs" placeholderTextColor={customerColors.subtle} style={styles.searchInput} /></View>
      <SectionHeader title="Browse help topics" />
      <SurfaceCard>
        <MenuRow icon={BookOpenText} label="Booking Help" description="Creating and managing bookings" />
        <MenuRow icon={CreditCard} label="Payments and Refunds" description="Charges, wallet, and receipts" />
        <MenuRow icon={ShieldCheck} label="Account and Security" description="Sign-in, verification, and privacy" />
        <MenuRow icon={BadgeHelp} label="Worker and Service Issues" description="Quality and service concerns" />
        <MenuRow icon={Flag} label="Safety" description="Staying safe during a service" last />
      </SurfaceCard>
      <SectionHeader title="Frequently asked questions" />
      {visible.map(([question, answer]) => <SurfaceCard key={question} style={styles.faqCard}><Text style={styles.faqQuestion}>{question}</Text><Text style={styles.faqAnswer}>{answer}</Text></SurfaceCard>)}
    </CustomerPage>
  );
}

export function ContactSupportScreen() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!subject.trim() || message.trim().length < 10) return Alert.alert('Add more detail', 'Enter a subject and at least 10 characters describing how we can help.');
    setSaving(true);
    try {
      await createSupportTicket({ subject, description: message });
      setSubject('');
      setMessage('');
      Alert.alert('Support ticket submitted', 'The A-yos support team will review your request.');
    } catch (error) {
      Alert.alert('Unable to submit ticket', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <CustomerPage>
      <PageHeader title="Contact Us" subtitle="Choose how you want to get help" back />
      <SurfaceCard>
        <MenuRow icon={MessageCircle} label="Live Chat" description="Chat with the A-yos support team" />
        <MenuRow icon={Mail} label="Email Support" description="Send a detailed support request" />
        <MenuRow icon={HelpCircle} label="Frequently Asked Questions" description="Find an answer right away" last />
      </SurfaceCard>
      <SectionHeader title="Submit a Support Ticket" />
      <SurfaceCard style={styles.formCard}>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Subject</Text>
          <TextInput value={subject} onChangeText={setSubject} placeholder="What do you need help with?" placeholderTextColor={customerColors.subtle} style={styles.formInput} />
        </View>
        <View style={[styles.formGroup, styles.formGroupGap]}>
          <Text style={styles.formLabel}>Message</Text>
          <TextInput value={message} onChangeText={setMessage} placeholder="Describe the issue and include relevant booking details." placeholderTextColor={customerColors.subtle} multiline style={[styles.formInput, styles.formInputLarge]} />
        </View>
      </SurfaceCard>
      <View style={styles.buttonGap}><PrimaryButton label={saving ? 'Submitting…' : 'Submit support ticket'} disabled={saving} onPress={() => void submit()} /></View>
      <SectionHeader title="Existing support requests" />
      <SurfaceCard style={styles.smallEmpty}><Text style={styles.smallEmptyText}>Your submitted requests will appear here after they are assigned.</Text></SurfaceCard>
    </CustomerPage>
  );
}

export function ReportUserScreen() {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [booking, setBooking] = useState('');
  const [reason, setReason] = useState('');
  const [block, setBlock] = useState(false);
  const submit = async () => {
    if (!name.trim() || !reason.trim() || details.trim().length < 10) {
      Alert.alert('Complete the report', 'Select a person, add a reason, and describe what happened.');
      return;
    }
    try {
      await createSupportTicket({
        bookingId: booking.trim() || null,
        subject: `User report: ${reason}`,
        description: `Reported user: ${name}\nBlock requested: ${block ? 'Yes' : 'No'}\n\n${details}`,
      });
      Alert.alert('Report received', 'Thank you. Our safety team will review your report.');
    } catch (error) {
      Alert.alert('Unable to submit report', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  return (
    <CustomerPage>
      <PageHeader title="Report a User" subtitle="Reports are reviewed confidentially" back />
      <SurfaceCard style={styles.formCard}>
        <ReportField label="Select worker" value={name} setValue={setName} placeholder="Worker name" />
        <ReportField label="Related booking" value={booking} setValue={setBooking} placeholder="Booking reference (optional)" />
        <ReportField label="Reason for report" value={reason} setValue={setReason} placeholder="Safety, conduct, service quality…" />
        <ReportField label="Description" value={details} setValue={setDetails} placeholder="Share specific, factual details." multiline />
        <Pressable onPress={() => setBlock((value) => !value)} style={styles.blockRow}>
          <View style={[styles.checkbox, block && styles.checkboxActive]}>{block ? <Check size={13} color={customerColors.surface} /> : null}</View>
          <View style={styles.transactionCopy}><Text style={styles.transactionTitle}>Block this user</Text><Text style={styles.transactionDate}>Prevent new conversations while the report is reviewed</Text></View>
        </Pressable>
      </SurfaceCard>
      <View style={styles.buttonGap}><PrimaryButton label="Submit report" variant="danger" onPress={() => void submit()} /></View>
    </CustomerPage>
  );
}

function ReportField({ label, value, setValue, placeholder, multiline }: any) {
  return (
    <View style={styles.reportField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={customerColors.subtle} multiline={multiline} style={[styles.formInput, multiline && styles.formInputLarge]} />
    </View>
  );
}

export function DeleteAccountScreen() {
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!confirmed) return;
    setSaving(true);
    try {
      await createSupportTicket({
        subject: 'Account deletion request',
        description: 'Please begin the verified account-deletion process for my A-yos customer account.',
      });
      Alert.alert('Request submitted', 'Support will contact you to verify and complete the deletion request.');
    } catch (error) {
      Alert.alert('Unable to submit request', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <CustomerPage>
      <PageHeader title="Delete Account" subtitle="This request requires identity verification" back />
      <View style={[styles.notice, { backgroundColor: customerColors.dangerSoft }]}>
        <CircleAlert size={20} color={customerColors.danger} />
        <Text style={styles.noticeText}>Some booking, payment, safety, and legal records may need to be retained. Support will explain what can be removed.</Text>
      </View>
      <Pressable onPress={() => setConfirmed((value) => !value)} style={styles.deleteConfirm}>
        <View style={[styles.checkbox, confirmed && styles.checkboxActive]}>{confirmed ? <Check size={13} color={customerColors.surface} /> : null}</View>
        <Text style={styles.deleteConfirmText}>I understand that deleting my account may be permanent.</Text>
      </Pressable>
      <PrimaryButton label="Request account deletion" variant="danger" disabled={!confirmed} loading={saving} onPress={() => void submit()} />
    </CustomerPage>
  );
}

function FormScreen({ title, subtitle, fields, button, onPress, danger }: any) {
  return (
    <CustomerPage>
      <PageHeader title={title} subtitle={subtitle} back />
      <SurfaceCard style={styles.formCard}>
        {fields.map((field: any, index: number) => (
          <View key={field.label} style={[styles.formGroup, index < fields.length - 1 && styles.formGroupGap]}>
            <Text style={styles.formLabel}>{field.label}</Text>
            <TextInput value={field.value} onChangeText={field.setValue} placeholder={field.placeholder} placeholderTextColor={customerColors.subtle} multiline={field.multiline} style={[styles.formInput, field.multiline && styles.formInputLarge]} />
          </View>
        ))}
      </SurfaceCard>
      <View style={styles.buttonGap}><PrimaryButton label={button} onPress={onPress} variant={danger ? 'danger' : 'primary'} /></View>
    </CustomerPage>
  );
}

export function LegalScreen({ type }: { type: 'privacy' | 'terms' }) {
  const privacy = type === 'privacy';
  const sections = privacy
    ? [
        ['Information we collect', 'A-yos processes account details, service requests, addresses, booking activity, messages, payment records, and safety reports needed to operate the marketplace.'],
        ['How information is used', 'Information is used to authenticate accounts, match customers with workers, complete bookings, provide support, prevent abuse, and meet legal obligations.'],
        ['Storage and security', 'Sensitive media is stored privately and access is controlled. No system can guarantee absolute security, so report suspicious account activity promptly.'],
        ['Your choices', 'You can update profile details, manage notification preferences, request support, or begin a verified account-deletion request from Account.'],
      ]
    : [
        ['Account responsibilities', 'Provide accurate information, protect your sign-in credentials, and use the customer application only for lawful home-service requests.'],
        ['Bookings and payments', 'Review service scope, schedule, location, worker selection, and pricing before confirming. Booking and payment records remain attached to the transaction.'],
        ['Safety and conduct', 'Harassment, fraud, dangerous conduct, discrimination, and attempts to move protected transactions outside A-yos are prohibited.'],
        ['Cancellations and disputes', 'Available cancellation, refund, and support options depend on booking status and applicable policy. Contact support when a concern cannot be resolved directly.'],
      ];
  return (
    <CustomerPage>
      <PageHeader title={privacy ? 'Privacy Policy' : 'Terms of Service'} subtitle={`Last updated July 22, 2026`} back />
      <SurfaceCard style={styles.legalCard}>
        <IconTile icon={privacy ? ShieldCheck : BookOpenText} size={54} />
        <Text style={styles.legalTitle}>{privacy ? 'Your privacy matters' : 'Using A-yos responsibly'}</Text>
        <Text style={styles.legalText}>{privacy ? 'This notice explains how A-yos handles customer information.' : 'These terms explain the rules for using the A-yos customer marketplace.'}</Text>
        <Text style={styles.legalHeading}>Table of contents</Text>
        {sections.map(([heading], index) => <Text key={heading} style={styles.contentsItem}>{index + 1}. {heading}</Text>)}
        {sections.map(([heading, body], index) => (
          <View key={heading} style={styles.policySection}>
            <Text style={styles.legalHeading}>{index + 1}. {heading}</Text>
            <Text style={styles.legalText}>{body}</Text>
          </View>
        ))}
        <Text style={styles.legalHeading}>Contact</Text>
        <Text style={styles.legalText}>Questions about this document can be submitted through Account → Support & Legal → Contact Us.</Text>
      </SurfaceCard>
    </CustomerPage>
  );
}

export function SecurityScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const update = async () => {
    if (password.length < 12) return Alert.alert('Password too short', 'Use at least 12 characters.');
    if (password !== confirm) return Alert.alert('Passwords do not match', 'Re-enter the same password in both fields.');
    setSaving(true);
    try {
      await changeMyPassword(password);
      setPassword('');
      setConfirm('');
      Alert.alert('Password changed', 'Your new password is now active.');
    } catch (error) {
      Alert.alert('Unable to change password', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <CustomerPage>
      <PageHeader title="Change Password" subtitle="Protect your A-yos account" back />
      <View style={styles.notice}><LockKeyhole size={20} color={customerColors.primary} /><Text style={styles.noticeText}>Use at least 12 characters and avoid passwords used on other websites.</Text></View>
      <SurfaceCard style={styles.formCard}>
        <Text style={styles.formLabel}>New password</Text>
        <TextInput secureTextEntry value={password} onChangeText={setPassword} style={styles.formInput} placeholder="Enter a strong password" placeholderTextColor={customerColors.subtle} />
        <Text style={[styles.formLabel, styles.formGroupGap]}>Confirm password</Text>
        <TextInput secureTextEntry value={confirm} onChangeText={setConfirm} style={styles.formInput} placeholder="Re-enter your password" placeholderTextColor={customerColors.subtle} />
      </SurfaceCard>
      <View style={styles.buttonGap}><PrimaryButton label="Update password" loading={saving} onPress={() => void update()} /></View>
    </CustomerPage>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  formCard: { padding: 16 },
  field: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: customerColors.border },
  fieldCopy: { flex: 1 },
  fieldLabel: { color: customerColors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { color: customerColors.text, fontSize: 15, fontWeight: '600', paddingVertical: 5, paddingHorizontal: 0 },
  fieldInputEditing: { color: customerColors.primary },
  fieldHelper: { color: customerColors.subtle, fontSize: 10, lineHeight: 14 },
  editLabel: { color: customerColors.primary, fontSize: 12, fontWeight: '700' },
  error: { color: customerColors.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
  buttonGap: { marginTop: 16 },
  balanceCard: { minHeight: 160, borderRadius: 23, backgroundColor: customerColors.primary, padding: 22, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  balanceLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' },
  balanceValue: { color: customerColors.surface, fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  balanceCaption: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 3 },
  balanceIcon: { marginLeft: 'auto', width: 58, height: 58, borderRadius: 20, backgroundColor: customerColors.surface, alignItems: 'center', justifyContent: 'center' },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  amount: { width: '48%', minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: customerColors.border, backgroundColor: customerColors.surface, alignItems: 'center', justifyContent: 'center' },
  amountSelected: { borderColor: customerColors.primary, backgroundColor: customerColors.primarySoft },
  amountText: { color: customerColors.text, fontSize: 15, fontWeight: '700' },
  amountTextSelected: { color: customerColors.primary },
  amountCheck: { position: 'absolute', top: 6, right: 7, width: 17, height: 17, borderRadius: 9, backgroundColor: customerColors.primary, alignItems: 'center', justifyContent: 'center' },
  transaction: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12 },
  transactionCopy: { flex: 1 },
  transactionTitle: { color: customerColors.text, fontSize: 14, fontWeight: '700' },
  transactionDate: { color: customerColors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  transactionAmount: { color: customerColors.text, fontSize: 13, fontWeight: '700' },
  credit: { color: customerColors.success },
  smallEmpty: { padding: 22 },
  smallEmptyText: { color: customerColors.muted, textAlign: 'center', fontSize: 13 },
  searchBox: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: customerColors.border, backgroundColor: customerColors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, color: customerColors.text, fontSize: 14, paddingVertical: 12 },
  topGap: { marginTop: 16 },
  filterRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  filterChip: { flex: 1, minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: customerColors.border, backgroundColor: customerColors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterChipActive: { backgroundColor: customerColors.primary, borderColor: customerColors.primary },
  filterText: { color: customerColors.muted, fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: customerColors.surface },
  addButton: { minHeight: 40, borderRadius: 13, backgroundColor: customerColors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10 },
  addText: { color: customerColors.primary, fontSize: 12, fontWeight: '700' },
  paymentMethod: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: customerColors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: customerColors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: customerColors.primary },
  notice: { borderRadius: 16, backgroundColor: customerColors.successSoft, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginTop: 16 },
  noticeText: { flex: 1, color: customerColors.text, fontSize: 12, lineHeight: 18 },
  favoriteCard: { padding: 14, marginBottom: 12 },
  workerRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12 },
  workerInitial: { width: 48, height: 48, borderRadius: 24, backgroundColor: customerColors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  workerInitialText: { color: customerColors.primary, fontSize: 18, fontWeight: '800' },
  favoriteActions: { flexDirection: 'row', gap: 9, marginTop: 12, borderTopWidth: 1, borderTopColor: customerColors.border, paddingTop: 12 },
  favoriteSecondary: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: customerColors.primary, alignItems: 'center', justifyContent: 'center' },
  favoriteSecondaryText: { color: customerColors.primary, fontSize: 12, fontWeight: '700' },
  favoritePrimary: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: customerColors.primary, alignItems: 'center', justifyContent: 'center' },
  favoritePrimaryText: { color: customerColors.surface, fontSize: 12, fontWeight: '700' },
  toggleRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 12 },
  faqCard: { padding: 16, marginBottom: 11 },
  faqQuestion: { color: customerColors.navy, fontSize: 15, fontWeight: '700' },
  faqAnswer: { color: customerColors.muted, fontSize: 13, lineHeight: 20, marginTop: 7 },
  formGroup: {},
  formGroupGap: { marginTop: 16 },
  formLabel: { color: customerColors.text, fontSize: 13, fontWeight: '700', marginBottom: 7 },
  formInput: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: customerColors.border, backgroundColor: customerColors.background, color: customerColors.text, fontSize: 14, paddingHorizontal: 13, paddingVertical: 12 },
  formInputLarge: { minHeight: 130, textAlignVertical: 'top' },
  reportField: { marginBottom: 15 },
  blockRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: customerColors.border, paddingTop: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: customerColors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: customerColors.primary, borderColor: customerColors.primary },
  deleteConfirm: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: customerColors.surface, borderRadius: 16, padding: 16, marginVertical: 18 },
  deleteConfirmText: { flex: 1, color: customerColors.text, fontSize: 13, lineHeight: 19 },
  legalCard: { padding: 20 },
  legalTitle: { color: customerColors.navy, fontSize: 21, fontWeight: '800', marginTop: 16 },
  legalHeading: { color: customerColors.navy, fontSize: 16, fontWeight: '700', marginTop: 22 },
  legalText: { color: customerColors.muted, fontSize: 14, lineHeight: 23, marginTop: 9 },
  contentsItem: { color: customerColors.primary, fontSize: 13, lineHeight: 21, marginTop: 5, fontWeight: '600' },
  policySection: { borderTopWidth: 1, borderTopColor: customerColors.border, marginTop: 18 },
});
