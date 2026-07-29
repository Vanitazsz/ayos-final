// ─── New Design Tokens (used by new user pages) ─────────────────────────────

export const colors = {
  primary: '#1e3a8a',
  primaryLight: '#60a5fa',
  primaryDark: '#1e40af',
  secondary: '#10b981',
  secondaryLight: '#34d399',
  secondaryDark: '#047857',
  accent: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  error: '#ef4444',
  errorBackground: '#fef2f2',
  success: '#10b981',
  successBackground: '#ecfdf5',
  warning: '#f59e0b',
  warningBackground: '#fffbeb',
  info: '#3b82f6',
  infoBackground: '#eff6ff',
  overlay: 'rgba(0, 0, 0, 0.4)',
  transparent: 'transparent',
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.5 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 28 },
  body1: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body2: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
} as const;

export const spacing = {
  xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
} as const;

export const radius = {
  sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  md: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  lg: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
} as const;

export const layout = {
  screenPadding: spacing.md,
  headerHeight: 60,
  bottomNavHeight: 65,
} as const;

export const animations = {
  duration: { fast: 150, normal: 300, slow: 500 },
  spring: { damping: 20, stiffness: 90 },
} as const;

export const theme = {
  colors, typography, spacing, radius, shadows, layout, animations,
};

export type Theme = typeof theme;
export default theme;

// ─── Legacy aliases (used by worker app) ────────────────────────────────────

export const Colors = {
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primaryMedium: '#1e40af',
  primaryLight: colors.primaryLight,
  primarySurface: colors.infoBackground,
  primaryBorder: '#bae6fd',
  cta: colors.primary,
  ctaPressed: colors.primaryDark,
  verified: colors.secondary,
  verifiedBg: colors.successBackground,
  success: colors.success,
  successBg: colors.successBackground,
  warning: colors.warning,
  warningBg: colors.warningBackground,
  error: colors.error,
  errorBg: colors.errorBackground,
  info: colors.info,
  infoBg: colors.infoBackground,
  star: colors.warning,
  white: '#FFFFFF',
  background: colors.background,
  surfaceCard: colors.surface,
  surfaceLight: '#f8fafc',
  border: colors.border,
  borderLight: colors.borderLight,
  divider: '#e2e8f0',
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textTertiary: colors.textTertiary,
  textInverse: '#FFFFFF',
  textLink: colors.info,
  navActive: colors.primary,
  navInactive: '#9CA3AF',
  navBackground: colors.surface,
  mapAccent: colors.info,
  overlay: colors.overlay,
  overlayLight: 'rgba(0,0,0,0.08)',
} as const;

export const Typography = {
  fontRegular: 'System',
  fontMedium: 'System',
  fontSemiBold: 'System',
  fontBold: 'System',
  Display: 40, H1: 36, H2: 32, H3: 28, Title: 24, Section: 20, Card: 18, Body: 16, Small: 14, Caption: 12,
  xs: 10, sm: 12, base: 14, md: 15, lg: 16, xl: 18, '2xl': 20, '3xl': 22, '4xl': 24, '5xl': 28, '6xl': 32,
  lineHeightTight: 1.2, lineHeightNormal: 1.5, lineHeightRelaxed: 1.6,
  regular: '400' as const, medium: '500' as const, semiBold: '600' as const, bold: '700' as const, extraBold: '800' as const,
} as const;

export const Spacing = {
  '0': 0, '1': 4, '2': 8, '3': 12, '4': 16, '5': 20, '6': 24, '7': 28, '8': 32, '10': 40, '12': 48, '14': 56, '16': 64,
} as const;

export const Layout = {
  screenPadding: spacing.md, sectionSpacing: 24, cardPadding: 16, componentGap: 16, smallGap: 8, navHeight: 80, headerHeight: 56,
} as const;

export const Radius = {
  xs: 6, sm: 8, md: 10, lg: 12, xl: 16, xxl: 24, full: 9999,
} as const;

export const Elevation = {
  none: {},
  sm: shadows.sm,
  md: shadows.md,
  lg: shadows.lg,
  xl: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 12,
  },
} as const;

export const IconSize = { xs: 12, sm: 16, md: 20, lg: 24, xl: 28, '2xl': 32 } as const;
export const AvatarSize = { small: 40, medium: 48, large: 64, xl: 96 } as const;
export const ButtonSize = { height: 56, radius: 14, horizontalPadding: 20 } as const;
export const TouchTarget = 44;
