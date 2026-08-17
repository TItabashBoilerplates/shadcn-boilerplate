import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './store'
import type { AuthUser, User } from './types'

/**
 * ユーザーストアの共有化に対する回帰テスト。
 *
 * web は `authUser` + `user` の 2 本、mobile は `user` + `isLoading` と、
 * 同じ概念のストアが**別々の形**で 2 つ存在していた。共有後の形をここで固定する。
 *
 * `authUser`（Supabase Auth のセッション由来）と `user`（users テーブル由来）は
 * **別物なので分けて持つ**。認証は通っているがプロフィール行がまだ無い、という状態が
 * 実際に起こる（サインアップ直後）ため、1 つにまとめると表現できない。
 */

const authUser: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  emailConfirmedAt: null,
  createdAt: new Date('2026-01-02T03:04:05.000Z'),
}

const user: User = {
  id: '00000000-0000-0000-0000-000000000001',
  account_name: 'user@example.com',
  display_name: 'テスト太郎',
  created_at: '2026-01-02T03:04:05.000Z',
  updated_at: '2026-01-02T03:04:05.000Z',
}

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({ authUser: null, user: null, isLoading: true })
  })

  it('初期状態は未読込（isLoading: true）', () => {
    const state = useUserStore.getState()

    expect(state.authUser).toBeNull()
    expect(state.user).toBeNull()
    // 「未ログイン」と「まだ確認していない」を区別できないと、
    // 起動直後に一瞬ログイン画面が出る（ちらつき）
    expect(state.isLoading).toBe(true)
  })

  it('setAuthUser で認証ユーザーが入り、読込中が解除される', () => {
    useUserStore.getState().setAuthUser(authUser)

    expect(useUserStore.getState().authUser).toEqual(authUser)
    expect(useUserStore.getState().isLoading).toBe(false)
  })

  it('setUser はプロフィールだけを更新し authUser を壊さない', () => {
    useUserStore.getState().setAuthUser(authUser)
    useUserStore.getState().setUser(user)

    expect(useUserStore.getState().user).toEqual(user)
    expect(useUserStore.getState().authUser).toEqual(authUser)
  })

  it('clearUser で両方が消える（ログアウト）', () => {
    useUserStore.getState().setAuthUser(authUser)
    useUserStore.getState().setUser(user)

    useUserStore.getState().clearUser()

    expect(useUserStore.getState().authUser).toBeNull()
    expect(useUserStore.getState().user).toBeNull()
    // ログアウト後は「確認済みで未ログイン」なので読込中に戻さない
    expect(useUserStore.getState().isLoading).toBe(false)
  })

  it('未ログインが確定した場合も setAuthUser(null) で読込中を解除できる', () => {
    useUserStore.getState().setAuthUser(null)

    expect(useUserStore.getState().authUser).toBeNull()
    expect(useUserStore.getState().isLoading).toBe(false)
  })
})
