import { useUserStore } from './store'

/**
 * 用途別のセレクター付きフック（Web / Mobile / Desktop 共有）
 *
 * ストアを直接 `useUserStore()` で購読すると、無関係な状態変更でも再描画される。
 * **必ずこれらのフック経由で使うこと**（`.claude/rules/render-optimization.md` ルール 2）。
 */

/**
 * 認証ユーザーと読込状態を取得する。
 *
 * `isLoading` が true の間は「未ログイン」と決めつけないこと
 * （起動直後にログイン画面がちらつく原因になる）。
 */
export function useAuthUser() {
  const authUser = useUserStore((state) => state.authUser)
  const isLoading = useUserStore((state) => state.isLoading)

  return { authUser, isLoading }
}

/** プロフィール（users テーブル）を取得する */
export function useUser() {
  return useUserStore((state) => state.user)
}

/** ストアの更新関数だけを取得する（値を購読しないので再描画されない） */
export function useUserActions() {
  const setAuthUser = useUserStore((state) => state.setAuthUser)
  const setUser = useUserStore((state) => state.setUser)
  const clearUser = useUserStore((state) => state.clearUser)

  return { setAuthUser, setUser, clearUser }
}
