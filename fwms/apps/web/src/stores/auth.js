import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, setAccessToken } from '../lib/api-client';



export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          setAccessToken(response.accessToken);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
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
            const response = await apiClient('/auth/refresh', { method: 'POST' });
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
