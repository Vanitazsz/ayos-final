import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role?: 'USER' | 'WORKER' | 'ADMIN';
  emailVerified: boolean;
  profileComplete: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  sessionNotice: string | null;
  logout: () => void;
  expireSession: () => void;
  clearSessionNotice: () => void;
  startPasswordRecovery: () => void;
  clearPasswordRecovery: () => void;
  setLoading: (loading: boolean) => void;
  setSessionUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isPasswordRecovery: false,
  sessionNotice: null,
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isPasswordRecovery: false,
    }),
  expireSession: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isPasswordRecovery: false,
      sessionNotice: 'Your session expired. Please sign in again.',
    }),
  clearSessionNotice: () => set({ sessionNotice: null }),
  startPasswordRecovery: () =>
    set({
      user: null,
      isAuthenticated: false,
      isPasswordRecovery: true,
    }),
  clearPasswordRecovery: () => set({ isPasswordRecovery: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSessionUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
      ...(user ? { sessionNotice: null } : {}),
    }),
}));
