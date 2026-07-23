import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export const customerColors = {
  primary: '#1E3A8A',
  primaryPressed: '#1E40AF',
  primarySoft: '#EFF6FF',
  navy: '#0F172A',
  text: '#0F172A',
  muted: '#64748B',
  subtle: '#94A3B8',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  success: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  purple: '#7C3AED',
  purpleSoft: '#F5F3FF',
} as const;

type CustomerPageProps = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
};

export function CustomerPage({
  children,
  scroll = true,
  style,
  contentStyle,
  testID,
}: CustomerPageProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      testID={testID}
      style={[
        styles.pageContent,
        { paddingTop: Math.max(insets.top, 12) + 8 },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.page, style]}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={[styles.header, back && styles.secondaryHeader]}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <ChevronLeft size={24} color={customerColors.text} />
        </Pressable>
      ) : null}
      <View style={[styles.headerCopy, back && styles.secondaryHeaderCopy]}>
        <Text style={[styles.pageTitle, back && styles.secondaryTitle]}>{title}</Text>
        {subtitle ? <Text style={[styles.pageSubtitle, back && styles.secondarySubtitle]}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function IconTile({
  icon: Icon,
  color = customerColors.primary,
  background = customerColors.primarySoft,
  size = 42,
}: {
  icon: LucideIcon;
  color?: string;
  background?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.iconTile,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}
    >
      <Icon size={Math.round(size * 0.48)} color={color} strokeWidth={2} />
    </View>
  );
}

export function MenuRow({
  icon,
  label,
  description,
  onPress,
  color,
  background,
  value,
  last,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress?: () => void;
  color?: string;
  background?: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !last && styles.menuDivider,
        pressed && styles.menuPressed,
      ]}
    >
      <IconTile icon={icon} color={color} background={background} />
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        {description ? <Text style={styles.menuDescription}>{description}</Text> : null}
      </View>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <ChevronRight size={19} color={customerColors.subtle} />
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const palette =
    variant === 'danger'
      ? { background: customerColors.dangerSoft, text: customerColors.danger }
      : variant === 'secondary'
        ? { background: customerColors.primarySoft, text: customerColors.primary }
        : { background: customerColors.primary, text: customerColors.surface };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: palette.background },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.primaryButtonText, { color: palette.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function StatusPill({
  label,
  tone = 'info',
}: {
  label: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    info: [customerColors.primarySoft, customerColors.primary],
    success: [customerColors.successSoft, customerColors.success],
    warning: [customerColors.warningSoft, customerColors.warning],
    danger: [customerColors.dangerSoft, customerColors.danger],
  } as const;
  return (
    <View style={[styles.pill, { backgroundColor: tones[tone][0] }]}>
      <Text style={[styles.pillText, { color: tones[tone][1] }]}>{label}</Text>
    </View>
  );
}

export function CustomerEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <IconTile icon={icon} size={64} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel ? (
        <View style={styles.emptyAction}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: customerColors.background },
  scrollContent: { flexGrow: 1 },
  pageContent: { flex: 1, paddingHorizontal: 16, paddingBottom: 36 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  secondaryHeader: { justifyContent: 'center', minHeight: 54 },
  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: customerColors.surface,
    borderWidth: 1,
    borderColor: customerColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  secondaryHeaderCopy: { alignItems: 'center', paddingHorizontal: 54 },
  headerAction: { marginLeft: 12 },
  pageTitle: { color: customerColors.navy, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  secondaryTitle: { fontSize: 20, lineHeight: 26, letterSpacing: 0, textAlign: 'center' },
  pageSubtitle: { color: customerColors.muted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  secondarySubtitle: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { flex: 1, color: customerColors.navy, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  sectionAction: { color: customerColors.primary, fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: customerColors.surface,
    borderRadius: 16,
    borderWidth: 0,
    shadowColor: '#1B315E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  menuRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: customerColors.border },
  menuPressed: { backgroundColor: '#FAFBFE' },
  menuCopy: { flex: 1 },
  menuLabel: { color: customerColors.text, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  menuDescription: { color: customerColors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  menuValue: { color: customerColors.muted, fontSize: 13 },
  primaryButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  empty: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: customerColors.navy, fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  emptyDescription: { color: customerColors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  emptyAction: { width: '100%', maxWidth: 260, marginTop: 22 },
});
