import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/shared/config/i18n/request.ts')

const nextConfig: NextConfig = {
  // PostHog リバースプロキシ: ブラウザ → PostHog のリクエストを自ドメイン(/ingest)経由にし、
  // アドブロッカー起因の計測欠損を回避する（US リージョン用の宛先）。
  // @see https://posthog.com/docs/advanced/proxy/nextjs
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  // PostHog の trailing-slash 付き API リクエストを許可するため必須
  skipTrailingSlashRedirect: true,
}

export default withNextIntl(nextConfig)
