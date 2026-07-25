import { AuthProvider } from '@workspace/auth'
import { OneSignalProvider } from '@workspace/onesignal'
import { QueryProvider } from '@workspace/query'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { CookieConsentBanner } from '@/features/cookie-consent'
import { APP_URL } from '@/shared/config/app'
import { routing } from '@/shared/config/i18n'
import { AnalyticsIdentity } from '@/shared/lib/analytics'
import '@workspace/ui/styles/globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

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
