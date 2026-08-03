import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  sessionNotice: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  sessionNoticeText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  createAccount: {
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
  },
  form: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    marginTop: 16,
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#1e3a8a',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialPrompt: {
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
    marginBottom: 24,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
  termsLink: {
    color: '#333',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
