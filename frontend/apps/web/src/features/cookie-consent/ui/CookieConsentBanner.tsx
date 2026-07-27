'use client'

/**
 * Cookie / 分析同意バナー
 *
 * PostHog 計測が有効（キー設定済み）かつユーザー未決定のときだけ表示する。
 * すべてのテキストは i18n（`CookieConsent`）。UI コンポーネントのため単体テストは不要。
 *
 * @module features/cookie-consent
 */
import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useCookieConsent } from '../model/useCookieConsent'

export function CookieConsentBanner() {
  const t = useTranslations('CookieConsent')
  const { needsDecision, accept, decline } = useCookieConsent()

  if (!needsDecision) {
    return null
  }

  return (
    // 常時表示・非モーダルの同意バナーなので <dialog> は使わず div + role="dialog" にしている
    <div
      role="dialog"
      aria-label={t('title')}
      className="fixed inset-x-0 bottom-0 z-50 border-border border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">{t('message')}</p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={decline}>
            {t('decline')}
          </Button>
          <Button size="sm" onClick={accept}>
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  )
}
