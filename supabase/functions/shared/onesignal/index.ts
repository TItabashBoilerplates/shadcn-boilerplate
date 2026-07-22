/**
 * OneSignal 共通モジュール
 *
 * Edge Function からはこのバレル（`index.ts`）経由で `createOneSignalClient` や
 * 型 `WebhookPayload` などを import する。実際の import パスは呼び出し元の位置に依存し、
 * 例えば `functions/onesignal-send/index.ts` からは `../shared/onesignal/index.ts`。
 *
 * 注: ここに解決可能な相対 import を JSDoc の code example として書くと、Deno の
 * モジュールグラフ解析がこのファイル基準で辿って `shared/shared/onesignal/index.ts`
 * （存在しない重複パス）に解決し、`supabase start` 時に警告が出るため、パスは記述に留める。
 */

export type { OneSignalClient } from "./client.ts";
export { createOneSignalClient } from "./client.ts";

export type {
  CreateNotificationRequest,
  LocalizedContent,
  NotificationContent,
  NotificationResponse,
  NotificationTargeting,
  OneSignalApiError,
  PlatformOptions,
  WebhookEventType,
  WebhookPayload,
} from "./types.ts";
