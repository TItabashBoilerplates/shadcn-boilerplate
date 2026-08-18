import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient as createSupabaseClient, type SupportedStorage } from '@supabase/supabase-js'
import type { Database } from '@workspace/types/schema'

/**
 * 認証セッションの保存先を選ぶ。
 *
 * ## なぜ分岐が要るのか
 *
 * `apps/mobile` は `app.json` の `web.output: "static"` により、
 * **`expo export --platform web` で Expo Router が Node 上で HTML を事前生成**する。
 * そこには `window` が無い。
 *
 * ところが `@react-native-async-storage/async-storage` の **web 向けビルドは
 * `window.localStorage` 実装**であり、`persistSession: true` の Supabase クライアントは
 * **生成直後に保存済みセッションを読みにいく**（`_emitInitialSession` →
 * `__loadSession` → `storage.getItem`）。結果、プリレンダーが
 * `ReferenceError: window is not defined` で丸ごと失敗する。
 *
 * **ネイティブ（iOS / Android）では `window` shim があるため再現しない**ので、
 * 実機・シミュレータでは一度も起きない。`expo export --platform web` を
 * 実行したときにだけ出る。
 *
 * サーバー側にユーザーのセッションは存在し得ないため、**読めば必ず null を返す
 * ストレージ**が正しい振る舞いになる（何も保持しない）。ここで値を保持してしまうと、
 * 生成した HTML に誰かのログイン状態が焼き込まれて全員に配られることになる。
 *
 * `native.test.ts` が `@vitest-environment node` でこの経路を検査している。
 */
export function createAuthStorage(): SupportedStorage {
  if (typeof window !== 'undefined') return AsyncStorage

  return {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  }
}

/**
 * React Native (Expo) 用 Supabase クライアント
 *
 * AsyncStorageを使用してセッションを永続化
 *
 * @returns React Native環境で動作するSupabaseクライアント
 *
 * @example
 * ```typescript
 * import { createClient } from '@workspace/client-supabase/native'
 *
 * const supabase = createClient()
 *
 * // 認証
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * })
 *
 * // データ取得
 * const { data: users } = await supabase.from('users').select('*')
 * ```
 */
export function createClient() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: createAuthStorage(),
      autoRefreshToken: true,
      persistSession: true,
      // React Native では URL 検出を無効化
      detectSessionInUrl: false,
    },
  })
}

/**
 * シングルトン Supabase クライアント
 *
 * アプリ全体で1つのインスタンスを共有する場合に使用
 */
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}
