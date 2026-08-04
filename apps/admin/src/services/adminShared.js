import { supabase } from '../lib/supabase';

export { supabase };
export const money = (value) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const status = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
export const identity = (value, context) => {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${context} profile is incomplete`);
  return value.trim();
};
export const accountName = (account) =>
  account?.user_profiles?.display_name ??
  account?.worker_profiles?.display_name ??
  account?.admin_profiles?.display_name ??
  null;
export const formatDate = (value) => new Date(value).toLocaleDateString();
export const formatDateTime = (value) => new Date(value).toLocaleString();
export const moneyFromMinor = (value) => money(Number(value ?? 0) / 100);
