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
  sessionNotice: string | null;
  logout: () => void;
  expireSession: () => void;
  clearSessionNotice: () => void;
  setLoading: (loading: boolean) => void;
  setSessionUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sessionNotice: null,
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  expireSession: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionNotice: 'Your session expired. Please sign in again.',
    }),
  clearSessionNotice: () => set({ sessionNotice: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSessionUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
      ...(user ? { sessionNotice: null } : {}),
    }),
}));
