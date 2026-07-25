/**
 * PostHog クライアント初期化（Next.js 15.3+ / 16 の instrumentation-client）
 *
 * Next.js はこのファイルをハイドレーション前にクライアントで実行するため、
 * PostHog の初期化に最適。PostHog 公式ガイド（instrument-integration skill）に従い、
 * **PostHogProvider は併用しない**（二重初期化を避けるため）。
 *
 * - `api_host: '/ingest'`: next.config.ts の rewrites 経由でリバースプロキシし、
 *   アドブロッカー起因の計測欠損を回避する。
 * - `defaults`: pageview / pageleave / autocapture の既定挙動を有効化。
 * - `capture_exceptions`: 未処理例外を Error Tracking に送信。
 *
 * @see https://posthog.com/docs/libraries/next-js
 * @see https://posthog.com/docs/advanced/proxy/nextjs
 */
import posthog from 'posthog-js'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

// ローカル開発などでキー未設定のときは初期化しない（ノイズ・エラー回避）
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })
}
