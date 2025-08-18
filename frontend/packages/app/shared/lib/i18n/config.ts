import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { Platform } from 'react-native'

import { enTranslations } from '../../../shared/config/locales/en'
import { jaTranslations } from '../../../shared/config/locales/ja'
import type { SupportedLanguage } from './types'

const resources = {
  en: {
    translation: enTranslations,
  },
  ja: {
    translation: jaTranslations,
  },
}

// Language detection configuration
const detectionOptions = {
  order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode'],
  checkWhitelist: true,
}

// Check if we're in development mode
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development'

// Configure i18next
i18n
  .use(initReactI18next)
  .use(Platform.OS === 'web' ? LanguageDetector : { type: 'languageDetector', detect: () => 'en' })
  .init({
    resources,
    fallbackLng: 'en',
    debug: isDev,
    
    // Language detection
    detection: Platform.OS === 'web' ? detectionOptions : undefined,
    
    // Interpolation
    interpolation: {
      escapeValue: false,
    },
    
    // React options
    react: {
      useSuspense: false,
    },
    
    // Namespace
    defaultNS: 'translation',
    
    // Language whitelist
    supportedLngs: ['en', 'ja'],
    
    // Key separator
    keySeparator: '.',
    
    // Nesting separator
    nsSeparator: ':',
  })

export { i18n }
export const changeLanguage = (lng: SupportedLanguage) => i18n.changeLanguage(lng)
export const getCurrentLanguage = (): SupportedLanguage => i18n.language as SupportedLanguage
export const getSupportedLanguages = (): SupportedLanguage[] => ['en', 'ja']