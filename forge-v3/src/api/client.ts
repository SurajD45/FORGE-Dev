import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token && token !== 'email_confirmation_required') {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)