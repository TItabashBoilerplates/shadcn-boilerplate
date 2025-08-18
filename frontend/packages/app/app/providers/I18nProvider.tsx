import { useEffect, useState } from 'react'
import { i18n } from '../../shared/lib/i18n'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize i18n only on client-side to avoid SSR hydration issues
    if (!i18n.isInitialized) {
      i18n.init().then(() => {
        setIsInitialized(true)
      })
    } else {
      setIsInitialized(true)
    }
  }, [])

  // Return children only after i18n is initialized to prevent hydration mismatch
  if (!isInitialized) {
    return <>{children}</>
  }

  return <>{children}</>
}