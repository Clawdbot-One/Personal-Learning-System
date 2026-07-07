/**
 * 认证状态管理 (zustand)
 */
import { create } from 'zustand'
import type { User } from '@/lib/types'
import { authApi, getToken, setToken, clearToken } from '@/lib/api'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  login: (account: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  refreshUser: () => Promise<User | null>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (account, password) => {
    set({ loading: true })
    try {
      const { token, user } = await authApi.login({ account, password })
      setToken(token)
      set({ user, loading: false, initialized: true })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  register: async (username, email, password) => {
    set({ loading: true })
    try {
      const { token, user } = await authApi.register({ username, email, password })
      setToken(token)
      set({ user, loading: false, initialized: true })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  logout: () => {
    clearToken()
    set({ user: null, initialized: true })
  },

  fetchUser: async () => {
    const token = getToken()
    if (!token) {
      set({ user: null, initialized: true })
      return
    }
    try {
      const user = await authApi.me()
      set({ user, initialized: true })
    } catch {
      clearToken()
      set({ user: null, initialized: true })
    }
  },

  refreshUser: async () => {
    try {
      const user = await authApi.me()
      set({ user })
      return user
    } catch {
      return null
    }
  },
}))

/**
 * 全局 toast 通知 store（轻量级实现，用于奖励提示等）
 */
interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'reward' | 'error'
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, type?: Toast['type']) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3500)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** 便捷方法：在非组件中触发 toast */
export function toast(message: string, type: Toast['type'] = 'info') {
  useToastStore.getState().push(message, type)
}
