// Zustand 认证状态管理
import { create } from "zustand";
import type { UserInfo } from "@/types";
import { authApi } from "@/api/client";

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  login: (account: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("lf_token"),
  loading: false,
  initialized: false,

  login: async (account, password) => {
    set({ loading: true });
    try {
      const res = await authApi.login({ account, password });
      localStorage.setItem("lf_token", res.access_token);
      localStorage.setItem("lf_user", JSON.stringify(res.user));
      set({ user: res.user, token: res.access_token, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  register: async (username, email, password) => {
    set({ loading: true });
    try {
      const res = await authApi.register({ username, email, password });
      localStorage.setItem("lf_token", res.access_token);
      localStorage.setItem("lf_user", JSON.stringify(res.user));
      set({ user: res.user, token: res.access_token, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_user");
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const user = await authApi.me();
      localStorage.setItem("lf_user", JSON.stringify(user));
      set({ user });
    } catch {
      localStorage.removeItem("lf_token");
      localStorage.removeItem("lf_user");
      set({ user: null, token: null });
    }
  },

  initialize: async () => {
    const token = localStorage.getItem("lf_token");
    const savedUser = localStorage.getItem("lf_user");
    if (token && savedUser) {
      try {
        set({ user: JSON.parse(savedUser), token });
        // 后台刷新用户信息
        const user = await authApi.me();
        localStorage.setItem("lf_user", JSON.stringify(user));
        set({ user, initialized: true });
      } catch {
        localStorage.removeItem("lf_token");
        localStorage.removeItem("lf_user");
        set({ user: null, token: null, initialized: true });
      }
    } else {
      set({ initialized: true });
    }
  },
}));
