export { signUpCustomer } from '@/services/auth';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailRule = {
  required: 'Email is required',
  pattern: {
    value: EMAIL_PATTERN,
    message: 'Invalid email',
  },
} as const;

export const passwordRule = {
  required: 'Password is required',
  minLength: { value: 8, message: 'Minimum 8 characters' },
  validate: (value: string) =>
    /[A-Z]/.test(value) || 'Password must include an uppercase letter.',
} as const;

export const confirmPasswordRule = (password: string) => ({
  required: 'Confirm password is required',
  validate: (val: string) => val === password || 'Passwords do not match',
} as const);
