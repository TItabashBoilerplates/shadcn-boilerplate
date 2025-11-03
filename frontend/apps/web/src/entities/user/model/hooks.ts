import { useUserStore } from './store'

/**
 * 認証ユーザー情報を取得するフック
 *
 * @returns 認証ユーザー情報とストア操作関数
 *
 * @example
 * ```tsx
 * import { useAuthUser } from '@/entities/user'
 *
 * function Component() {
 *   const { authUser, setAuthUser, clearUser } = useAuthUser()
 *
 *   if (!authUser) return <div>Not authenticated</div>
 *
 *   return <div>User ID: {authUser.id}</div>
 * }
 * ```
 */
export function useAuthUser() {
  const authUser = useUserStore((state) => state.authUser)
  const setAuthUser = useUserStore((state) => state.setAuthUser)
  const clearUser = useUserStore((state) => state.clearUser)

  return {
    authUser,
    setAuthUser,
    clearUser,
  }
}

/**
 * ユーザー情報を取得するフック
 *
 * @returns ユーザー情報とストア操作関数
 *
 * @example
 * ```tsx
 * import { useUser } from '@/entities/user'
 *
 * function UserName() {
 *   const { user, setUser } = useUser()
 *
 *   if (!user) return null
 *
 *   return <p>{user.displayName}</p>
 * }
 * ```
 */
export function useUser() {
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)

  return {
    user,
    setUser,
  }
}

/**
 * プロフィール情報を取得するフック
 *
 * @returns プロフィール情報とストア操作関数
 *
 * @example
 * ```tsx
 * import { useUserProfile } from '@/entities/user'
 *
 * function UserEmail() {
 *   const { profile, setProfile } = useUserProfile()
 *
 *   if (!profile) return null
 *
 *   return <p>{profile.email}</p>
 * }
 * ```
 */
export function useUserProfile() {
  const profile = useUserStore((state) => state.profile)
  const setProfile = useUserStore((state) => state.setProfile)

  return {
    profile,
    setProfile,
  }
}

/**
 * ユーザーとプロフィールをまとめて取得するフック
 *
 * @returns ユーザー、プロフィール、ストア操作関数
 *
 * @example
 * ```tsx
 * import { useUserWithProfile } from '@/entities/user'
 *
 * function UserInfo() {
 *   const { user, profile, setUserWithProfile, clearUser } = useUserWithProfile()
 *
 *   if (!user) return <div>No user data</div>
 *
 *   return (
 *     <div>
 *       <p>{user.displayName}</p>
 *       <p>{profile?.email}</p>
 *       <button onClick={clearUser}>Sign out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useUserWithProfile() {
  const user = useUserStore((state) => state.user)
  const profile = useUserStore((state) => state.profile)
  const setUserWithProfile = useUserStore((state) => state.setUserWithProfile)
  const clearUser = useUserStore((state) => state.clearUser)

  return {
    user,
    profile,
    setUserWithProfile,
    clearUser,
  }
}
