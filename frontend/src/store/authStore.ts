/**
 * authStore.ts
 * BookSocial · Zustand 全局鉴权状态
 *
 * 模块0 提供基础结构；模块1（用户认证）在登录/注销时调用。
 * 其他模块通过 useAuthStore() 读取当前用户信息。
 *
 * API 一览：
 *   setUser(user, accessToken, refreshToken)  ← 登录成功，模块1调用
 *   updateUser(partial)                        ← 编辑资料后局部更新，模块1调用
 *   clearUser()                                ← 退出登录，模块1调用
 *   setToken(accessToken)                      ← Token 静默刷新，apiClient 拦截器调用
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────
//  用户类型（模块1完整字段，兼容模块0基础字段）
// ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id:        number;
  username:  string;
  avatarUrl: string | null;
  status:    number;        // 0-禁用  1-正常  2-封禁
  email?:    string | null;
  role?:     string;
}

// ─────────────────────────────────────────────────────────────
//  Store 接口
// ─────────────────────────────────────────────────────────────

interface AuthState {
  user:         AuthUser | null;
  accessToken:  string | null;
  refreshToken: string | null;
  isLoggedIn:   boolean;

  /**
   * 登录成功后调用（模块1：邮箱登录 / Google OAuth 回调）
   * 同时写入 user + 两个 Token，通过 persist 持久化到 localStorage
   */
  setUser: (user: AuthUser, accessToken: string, refreshToken: string) => void;

  /**
   * 局部更新用户信息（模块1：编辑资料保存后同步 store）
   * 不影响 Token，仅合并更新 user 对象
   */
  updateUser: (partial: Partial<AuthUser>) => void;

  /**
   * 退出登录，清除全部鉴权状态（模块1：调用注销接口后）
   */
  clearUser: () => void;

  /**
   * 仅刷新 accessToken（apiClient 拦截器静默刷新 Token 时调用）
   * 不重置 user 及 refreshToken
   */
  setToken: (accessToken: string) => void;
}

// ─────────────────────────────────────────────────────────────
//  Store 实现
// ─────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoggedIn:   false,

      // ── 完整登录（写入 user + 双 Token）
      setUser: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isLoggedIn: true }),

      // ── 局部更新用户信息（编辑资料后调用）
      updateUser: (partial) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...partial } });
      },

      // ── 退出登录（清除全部）
      clearUser: () =>
        set({
          user:         null,
          accessToken:  null,
          refreshToken: null,
          isLoggedIn:   false,
        }),

      // ── 仅刷新 accessToken（不重置其他状态）
      setToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: 'bs-auth',
      // 仅持久化鉴权相关字段
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        isLoggedIn:   state.isLoggedIn,
      }),
    }
  )
);