import { useAuthStore } from '@/store/auth'

export function useAuth() {
  const { token, user, setAuth, clearAuth, isAuthenticated } = useAuthStore()

  return {
    token,
    user,
    setAuth,
    clearAuth,
    isAuthenticated: isAuthenticated(),
  }
}