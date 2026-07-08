// Zustand store for auth state (token + user).
// Persists to localStorage so a page refresh keeps the session.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserOut } from '../api/types'

interface AuthState {
  token: string | null
  user: UserOut | null
  setAuth: (token: string, user: UserOut) => void
  setUser: (user: UserOut) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'learnflow-auth' },
  ),
)
