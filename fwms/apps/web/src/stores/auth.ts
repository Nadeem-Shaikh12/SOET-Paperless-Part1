import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, setAccessToken } from '../lib/api-client';
import { LoginRequest, LoginResponse } from '@fwms/shared';

export interface User {
  id: number;
  email: string;
  role: 'super_admin' | 'dept_admin' | 'faculty';
  name: string;
  deptId: number | null;
  facultyId: number | null;
  mustChangePassword?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          setAccessToken(response.accessToken);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          set({ error: err.message || 'Login failed', isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await apiClient('/auth/logout', { method: 'POST' });
        } catch (err) {
          console.error('Logout API failed, proceeding with local clear', err);
        } finally {
          setAccessToken(null);
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),

      // Called on app mount to restore session using the refresh token cookie
      initAuth: async () => {
        const { user } = get();
        if (user) {
          // Try to silent refresh to get a new access token
          try {
            const response = await apiClient<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
            setAccessToken(response.accessToken);
            set({ isAuthenticated: true, isLoading: false });
          } catch {
            // Refresh token invalid or expired
            setAccessToken(null);
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'fwms-auth-storage',
      // Only persist the user object, access token is kept in memory
      partialize: (state) => ({ user: state.user }),
    }
  )
);
