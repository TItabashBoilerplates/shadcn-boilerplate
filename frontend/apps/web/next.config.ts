import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/shared/config/i18n/request.ts')

const isProd = process.env.NODE_ENV === 'production'

/**
 * Content-Security-Policy を組み立てる。connect-src は Supabase(env 由来) と PostHog を許可。
 * PostHog は /ingest リバースプロキシ経由（= 'self'）だが直アクセス先も belt-and-suspenders で含める。
 * script/style の 'unsafe-inline' は Next.js のインラインに必要（nonce 化は将来のハードニング課題）。
 */
function buildContentSecurityPolicy(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : ''
  const supabaseWs = supabaseOrigin ? supabaseOrigin.replace(/^http/, 'ws') : ''

  const connectSrc = [
    "'self'",
    supabaseOrigin,
    supabaseWs,
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://us.i.posthog.com',
    'https://us-assets.i.posthog.com',
  ]
    .filter(Boolean)
    .join(' ')

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

// 常時安全なヘッダ + 本番のみ HSTS / CSP（ローカルの HMR・http を壊さないため）
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
      ]
    : []),
]

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
  // セキュリティヘッダを全ルートに適用（CSP/HSTS は本番のみ）
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default withNextIntl(nextConfig)
