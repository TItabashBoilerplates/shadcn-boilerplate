import type { AuthResult } from '../model/types'

/**
 * Storybook 用のスタブ。
 *
 * 実 API は Supabase クライアント（`EXPO_PUBLIC_SUPABASE_*` を要求する）に依存し、
 * カタログでは読めない。フォームが送信処理を props で受け取る設計なのはこのため。
 */
export const idleResult = async (): Promise<AuthResult> => ({ ok: false, messageKey: 'unexpected' })

/** 解決しない Promise。送信中の見た目を確認する用 */
export const pendingResult = (): Promise<AuthResult> => new Promise(() => {})

export const successResult =
  (messageKey: Extract<AuthResult, { ok: true }>['messageKey']) =>
  async (): Promise<AuthResult> => ({ ok: true, messageKey })

export const errorResult =
  (messageKey: Extract<AuthResult, { ok: false }>['messageKey'], requiresPasswordReset = false) =>
  async (): Promise<AuthResult> => ({ ok: false, messageKey, requiresPasswordReset })
