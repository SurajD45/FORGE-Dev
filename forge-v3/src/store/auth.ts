import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      clearAuth: () => set({ token: null, user: null }),

      isAuthenticated: () => {
        const { token } = get()
        return token !== null && token !== 'email_confirmation_required'
      },
    }),
    {
      name: 'forge-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
)