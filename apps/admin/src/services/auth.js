import { supabase } from '../lib/supabase';

export async function loadActiveSessionCount() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ? 1 : 0;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw error;
}

export async function loadSystemStatus(signal) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`, { signal });
  return response.ok ? 'Operational' : 'Unavailable';
}
