/**
 * OneSignal Mobile 初期化コンポーネント
 *
 * React Native アプリで OneSignal を初期化し、認証状態と連携する。
 *
 * ## 使用方法
 *
 * ```tsx
 * // AppProvider.tsx
 * import { OneSignalInitializer } from './OneSignalInitializer'
 *
 * export function AppProvider({ children }: PropsWithChildren) {
 *   return (
 *     <>
 *       <OneSignalInitializer userId={user?.id} />
 *       {children}
 *     </>
 *   )
 * }
 * ```
 *
 * ## 環境変数
 *
 * - `EXPO_PUBLIC_ONE_SIGNAL_APP_ID` - OneSignal App ID
 */

import { useEffect, useRef } from 'react'
// @ts-expect-error - react-native-onesignal の型定義がない可能性
import { OneSignal } from 'react-native-onesignal'

interface OneSignalInitializerProps {
  /**
   * ユーザーID（認証されている場合）
   * null/undefined でログアウト状態
   */
  userId?: string | null
}

/**
 * OneSignal Mobile 初期化コンポーネント
 */
export function OneSignalInitializer({ userId }: OneSignalInitializerProps) {
  const isInitialized = useRef(false)
  const previousUserId = useRef<string | null | undefined>(undefined)

  // SDK 初期化
  useEffect(() => {
    if (isInitialized.current) {
      return
    }

    const appId = process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID

    if (!appId) {
      console.warn('[OneSignal] EXPO_PUBLIC_ONE_SIGNAL_APP_ID is not set, skipping initialization')
      return
    }

    try {
      // OneSignal 初期化
      OneSignal.initialize(appId)

      // 通知許可リクエスト
      OneSignal.Notifications.requestPermission(true)

      isInitialized.current = true
      console.info('[OneSignal] Initialized successfully')
    } catch (error) {
      console.error('[OneSignal] Initialization failed:', error)
    }
  }, [])

  // ユーザー ID 連携
  useEffect(() => {
    if (!isInitialized.current) {
      return
    }

    // 前回と同じユーザー ID の場合はスキップ
    if (previousUserId.current === userId) {
      return
    }

    previousUserId.current = userId

    try {
      if (userId) {
        // ログイン: ユーザー ID を OneSignal に設定
        OneSignal.login(userId)
        console.info('[OneSignal] User logged in:', userId)
      } else {
        // ログアウト: ユーザー ID をクリア
        OneSignal.logout()
        console.info('[OneSignal] User logged out')
      }
    } catch (error) {
      console.error('[OneSignal] User sync failed:', error)
    }
  }, [userId])

  // レンダリングなし
  return null
}
