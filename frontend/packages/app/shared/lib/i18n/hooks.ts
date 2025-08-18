import { useTranslation as useI18nTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
import type { SupportedLanguage } from './types'
import { changeLanguage, getCurrentLanguage, getSupportedLanguages } from './config'

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Fallback function for SSR
  const fallbackT = useCallback((key: string) => {
    if (!isClient) {
      // Return English fallback for SSR
      const fallbackTranslations: Record<string, string> = {
        'home.title': 'Welcome to Tamagui.',
        'home.subtitle': 'Here\'s a basic starter to show navigating from one screen to another.',
        'home.sameCodeMessage': 'This screen uses the same code on Next.js and React Native.',
        'home.linkToUser': 'Link to user',
        'home.typographyExample': 'Typography Example',
        'home.themeExample': 'Theme Example',
        'common.back': 'Back',
        'user.profile': 'User Profile',
        'user.name': 'Name',
        'typography.title': 'Material Design 3 Typography System',
        'typography.displayStyles': 'Display Styles',
        'typography.headlineStyles': 'Headline Styles',
        'typography.titleStyles': 'Title Styles',
        'typography.bodyStyles': 'Body Styles',
        'typography.labelStyles': 'Label Styles',
        'typography.colorVariations': 'Color Variations',
        'typography.darkTheme': 'Dark Theme Typography',
        'typography.fontWeights': 'Font Weight Examples',
        'typography.responsive': 'Responsive Typography',
        'typography.displayLarge': 'Display Large (57px)',
        'typography.displayMedium': 'Display Medium (45px)',
        'typography.displaySmall': 'Display Small (36px)',
        'typography.headlineLarge': 'Headline Large (32px)',
        'typography.headlineMedium': 'Headline Medium (28px)',
        'typography.headlineSmall': 'Headline Small (24px)',
        'typography.titleLarge': 'Title Large (22px)',
        'typography.titleMedium': 'Title Medium (16px)',
        'typography.titleSmall': 'Title Small (14px)',
        'typography.bodyLarge': 'Body Large (16px) - This text uses the Material Design 3 Body Large style.',
        'typography.bodyMedium': 'Body Medium (14px) - This text uses the Material Design 3 Body Medium style.',
        'typography.bodySmall': 'Body Small (12px) - This text uses the Material Design 3 Body Small style.',
        'typography.labelLarge': 'Label Large (14px)',
        'typography.labelMedium': 'Label Medium (12px)',
        'typography.labelSmall': 'Label Small (11px)',
        'typography.defaultColor': 'Default text color',
        'typography.primaryColor': 'Primary color text',
        'typography.secondaryColor': 'Secondary color text',
        'typography.placeholderColor': 'Placeholder color text',
        'typography.darkThemeDescription': 'In dark theme, colors are adjusted to ensure readability.',
        'typography.regularWeight': 'Regular (400) - Standard body text',
        'typography.mediumWeight': 'Medium (500) - Slightly bolder text',
        'typography.boldWeight': 'Bold (700) - Bold text',
        'typography.responsiveText': 'Responsive text - Changes according to screen size',
        'typography.responsiveDescription2': 'The above text changes font size according to screen size.',
      }
      return fallbackTranslations[key] || key
    }
    return t(key)
  }, [isClient, t])
  
  const currentLanguage = isClient ? getCurrentLanguage() : 'en'
  const supportedLanguages = getSupportedLanguages()
  
  const setLanguage = useCallback((lng: SupportedLanguage) => {
    if (isClient) {
      changeLanguage(lng)
    }
  }, [isClient])
  
  const toggleLanguage = useCallback(() => {
    const newLang = currentLanguage === 'en' ? 'ja' : 'en'
    setLanguage(newLang)
  }, [currentLanguage, setLanguage])
  
  const isLanguageSupported = useCallback((lng: string): lng is SupportedLanguage => {
    return supportedLanguages.includes(lng as SupportedLanguage)
  }, [supportedLanguages])
  
  return {
    t: fallbackT,
    i18n,
    currentLanguage,
    supportedLanguages,
    setLanguage,
    toggleLanguage,
    isLanguageSupported,
    isClient,
  }
}

export const useLanguage = () => {
  const { currentLanguage, setLanguage, toggleLanguage, supportedLanguages } = useTranslation()
  
  return {
    currentLanguage,
    setLanguage,
    toggleLanguage,
    supportedLanguages,
  }
}