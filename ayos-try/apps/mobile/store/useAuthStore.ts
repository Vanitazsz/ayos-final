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
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setSessionUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSessionUser: (user) => set({ user, isAuthenticated: Boolean(user), isLoading: false }),
}));
