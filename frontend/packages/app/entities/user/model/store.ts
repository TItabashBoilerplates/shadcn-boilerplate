import { create } from 'zustand'
import type { AuthUser, User } from './types'

/**
 * ユーザー情報を管理する Zustand ストア（Web / Mobile / Desktop 共有の正本）
 *
 * **必ずセレクター付きで購読すること**（`.claude/rules/render-optimization.md`）。
 * 引数なしの `useUserStore()` はストア全体を購読するため、無関係な変更で再描画される。
 * 用途別のセレクター付きフックを `./hooks` に用意してあるのでそちらを使う。
 *
 * @example
 * ```tsx
 * import { useAuthUser } from '@workspace/app/entities/user'
 *
 * function Header() {
 *   const { authUser, isLoading } = useAuthUser()
 *   if (isLoading) return <Skeleton />
 *   return <span>{authUser?.email}</span>
 * }
 * ```
 */
interface UserState {
  /** 認証ユーザー（Supabase Auth 由来） */
  authUser: AuthUser | null

  /** プロフィール（public.users 由来）。認証済みでも行が無い間は null */
  user: User | null

  /**
   * 認証状態をまだ確認していない間だけ true。
   *
   * 「未ログイン」と「確認前」を区別できないと、起動直後に一瞬ログイン画面が
   * 出る（ちらつき）ので必ず持つ。
   */
  isLoading: boolean

  setAuthUser: (authUser: AuthUser | null) => void
  setUser: (user: User | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>((set) => ({
  authUser: null,
  user: null,
  isLoading: true,

  // 認証状態が判明した時点で読込中を解除する（null = 未ログイン確定も含む）
  setAuthUser: (authUser) => set({ authUser, isLoading: false }),

  setUser: (user) => set({ user }),

  clearUser: () => set({ authUser: null, user: null, isLoading: false }),
}))

export type { UserState }
