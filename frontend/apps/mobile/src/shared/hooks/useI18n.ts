import { useCallback, useState } from 'react'

import { getLocale, i18n, type Locale, setLocale } from '@/shared/config/i18n'

/**
 * i18n フック
 * 翻訳関数とロケール切り替え機能を提供
 */
export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())

  // 翻訳関数
  const t = useCallback(
    (key: string, options?: Record<string, unknown>) => {
      return i18n.t(key, options)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  )

  // ロケール変更
  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale)
    setLocaleState(newLocale)
  }, [])

  return {
    t,
    locale,
    changeLocale,
  }
}
