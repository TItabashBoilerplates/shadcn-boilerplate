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
  // Next.js 16 は開発時、サーバーが初期化されたホスト（既定 `localhost`）以外からの
  // dev アセット（/_next/static/chunks/*）へのリクエストを 403 で遮断する。
  // そのため `127.0.0.1:3000` で開くと HTML は返るが JS が全て 403 になり、
  // **真っ白なページ**になる（E2E ハーネスも 127.0.0.1 を叩くため同様に落ちる）。
  // ループバックの別名を許可して localhost / 127.0.0.1 のどちらでも開けるようにする。
  // 開発時のみ有効な設定で、本番ビルドには影響しない。
  // @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ['127.0.0.1'],

  // Supabase Storage の画像変換 API（/storage/v1/render/image/...）は
  // **width が 1〜2500** に制限されている。Next.js の既定 `deviceSizes` は 3840 を含むため、
  // そのままだと srcset に「Supabase が配信できない幅」が並ぶ（400 が返る）。
  // 末尾を 2500 に置き換え、`@workspace/client-supabase/storage-image` の
  // IMAGE_WIDTH_LADDER（= imageSizes + deviceSizes）と一致させる。
  // ⚠️ 値を変えたら storage-image.policy.test.ts が両者の一致を検査して落ちる。
  // @see https://supabase.com/docs/guides/storage/serving/image-transformations#limits
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2500],
  },

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
