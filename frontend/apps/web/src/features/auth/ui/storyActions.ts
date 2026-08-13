import type { AuthActionState } from '../model/types'

/**
 * Storybook 用のダミー Server Action。
 *
 * 実物は `next/headers` と Supabase のサーバークライアントに依存していて
 * ブラウザでは読めないため、**状態ごとの見た目**を確認するためのスタブを用意する。
 * フォーム側が `action` を props で受け取る設計なのはこれを可能にするため。
 */

/** 押しても何も起きない（初期状態のカタログ用） */
export const idleAction = async (): Promise<AuthActionState> => ({ status: 'idle' })

/** 送信中の見た目を確認するための、解決しないアクション */
export const pendingAction = (): Promise<AuthActionState> => new Promise(() => {})

export const successAction =
  (messageKey: Extract<AuthActionState, { status: 'success' }>['messageKey']) =>
  async (): Promise<AuthActionState> => ({ status: 'success', messageKey })

export const errorAction =
  (
    messageKey: Extract<AuthActionState, { status: 'error' }>['messageKey'],
    requiresPasswordReset = false
  ) =>
  async (): Promise<AuthActionState> => ({
    status: 'error',
    messageKey,
    requiresPasswordReset,
  })
