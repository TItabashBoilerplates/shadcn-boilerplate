/**
 * PostHog 計測ラッパー（Web / shared layer）
 *
 * `instrumentation-client.ts` で初期化済みの posthog-js シングルトンを薄くラップし、
 * イベント名の一貫性（analytics contract）とエラーハンドリングを一元化する。
 *
 * エラーは握りつぶさずログ出力するが、リスローはしない。計測は付随的処理であり、
 * 失敗してもユーザー操作を妨げてはならない（`.claude/rules/error-handling.md` の許容例）。
 *
 * @module shared/lib/analytics
 */
import { clientLogger } from '@workspace/logger/client'
import posthog from 'posthog-js'

const logger = clientLogger.child({ lib: 'analytics' })

/** 計測イベントに付与できるプロパティ */
export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>

/**
 * カスタムイベントを送信する。
 *
 * イベント名は `object_verb`（例: `user_logged_in`）形式を推奨。
 */
export function captureEvent(event: string, properties?: AnalyticsProperties): void {
  try {
    posthog.capture(event, properties)
  } catch (error) {
    logger.error('Failed to capture analytics event', {
      event,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * ログインユーザーを識別し、以降のイベントを distinctId に紐付ける。
 *
 * @param distinctId - 一意なユーザー識別子（Supabase user.id）
 */
export function identifyUser(distinctId: string, properties?: AnalyticsProperties): void {
  try {
    posthog.identify(distinctId, properties)
  } catch (error) {
    logger.error('Failed to identify analytics user', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * 識別済みユーザーをリセットする（ログアウト時）。
 * 匿名ユーザーの distinctId が再生成されるため、ログアウト遷移でのみ呼ぶこと。
 */
export function resetUser(): void {
  try {
    posthog.reset()
  } catch (error) {
    logger.error('Failed to reset analytics user', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
