import { AuthProvider } from '@workspace/auth'
import { OneSignalProvider } from '@workspace/onesignal'
import { QueryProvider } from '@workspace/query'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { CookieConsentBanner } from '@/features/cookie-consent'
import { APP_URL } from '@/shared/config/app'
import { routing } from '@/shared/config/i18n'
import { AnalyticsIdentity } from '@/shared/lib/analytics'
import '@/app/styles/globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * ビューポート設定（スマホ幅で壊れないための最低限）
 *
 * ## `maximumScale` / `userScalable` を**絶対に書かない**
 *
 * ズームを禁止すると **WCAG 1.4.4 (Resize Text) 違反**になり、axe / Deque の
 * "Zooming and scaling must not be disabled" でも failure として検出される。
 * ⚠️ **Next.js 公式の `generateViewport` のサンプルコードには
 * `maximumScale: 1, userScalable: false` がそのまま載っているので、コピーしないこと。**
 * iOS Safari のフォーカス時オートズームは、**フォーム要素の font-size を 16px 以上**に
 * することで止める（`.claude/rules/form-controls.md`）。
 *
 * ## `viewportFit: 'cover'`
 *
 * ノッチ / ホームインジケータのある端末で `env(safe-area-inset-*)` を有効にする。
 * これが無いと固定フッターがホームインジケータに潜り込む。
 *
 * ## `interactiveWidget` を書いていない理由
 *
 * 既定（iOS Safari は `resizes-visual`）のままにしてある。**下部固定バー
 * （`position: fixed; bottom: 0`）を持つ画面を追加するときは
 * `interactiveWidget: 'resizes-content'` を検討する** — 既定のままだと
 * iOS でレイアウトビューポートが縮まないため、バーがキーボードの裏に残り
 * `dvh` も変化しない。アプリ全体に効く設定なので、必要になった時点で判断する。
 *
 * @see .claude/rules/mobile-uiux.md §4
 * @see .claude/skills/mobile-uiux/references/web-mobile.md
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  return {
    metadataBase: new URL(APP_URL),
    title: { default: t('title'), template: `%s | ${t('siteName')}` },
    description: t('description'),
    applicationName: t('siteName'),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      title: t('title'),
      description: t('description'),
      locale,
      url: `/${locale}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  }
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  // 有効なロケールかチェック
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // 静的レンダリングを有効化
  setRequestLocale(locale)

  // メッセージを取得
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            {/* 認証状態を PostHog identify / reset に同期（レンダリングなし） */}
            <AnalyticsIdentity />
            <OneSignalProvider appId={process.env.NEXT_PUBLIC_ONE_SIGNAL_APP_ID ?? ''}>
              <NextIntlClientProvider messages={messages}>
                {children}
                {/* 分析の同意バナー（未決定時のみ表示） */}
                <CookieConsentBanner />
              </NextIntlClientProvider>
            </OneSignalProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
