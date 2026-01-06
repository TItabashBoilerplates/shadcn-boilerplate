import { create } from 'zustand'
import type { AuthUser, User, UserProfile, UserWithProfile } from './types'

/**
 * ユーザーストアの状態
 */
interface UserState {
  /**
   * 認証ユーザー（Supabase Auth）
   */
  authUser: AuthUser | null

  /**
   * ユーザー情報（users）
   */
  user: User | null

  /**
   * プロフィール情報（user_profiles）
   */
  profile: UserProfile | null

  /**
   * 認証ユーザーをセット
   */
  setAuthUser: (authUser: AuthUser | null) => void

  /**
   * ユーザー情報をセット
   */
  setUser: (user: User | null) => void

  /**
   * プロフィール情報をセット
   */
  setProfile: (profile: UserProfile | null) => void

  /**
   * ユーザーとプロフィールを同時にセット
   */
  setUserWithProfile: (data: UserWithProfile) => void

  /**
   * すべてのユーザー情報をクリア
   */
  clearUser: () => void
}

/**
 * ユーザー情報を管理するZustandストア
 *
 * @example
 * ```tsx
 * import { useUserStore } from '@/entities/user'
 *
 * function UserProfile() {
 *   const user = useUserStore((state) => state.user)
 *   const profile = useUserStore((state) => state.profile)
 *
 *   return (
 *     <div>
 *       <p>{user?.displayName}</p>
 *       <p>{profile?.email}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export const useUserStore = create<UserState>((set) => ({
  authUser: null,
  user: null,
  profile: null,

  setAuthUser: (authUser) =>
    set({
      authUser,
    }),

  setUser: (user) =>
    set({
      user,
    }),

  setProfile: (profile) =>
    set({
      profile,
    }),

  setUserWithProfile: ({ user, profile }) =>
    set({
      user,
      profile,
    }),

  clearUser: () =>
    set({
      authUser: null,
      user: null,
      profile: null,
    }),
}))
