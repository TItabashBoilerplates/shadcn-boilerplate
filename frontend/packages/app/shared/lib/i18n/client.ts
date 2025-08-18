import { useEffect, useState } from 'react'
import { i18n } from './config'

export function useI18nInitialization() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true)
    
    // Initialize i18n only on client-side
    if (!i18n.isInitialized) {
      i18n.init().then(() => {
        setIsInitialized(true)
      }).catch((error) => {
        console.error('i18n initialization failed:', error)
        setIsInitialized(true) // Still set to true to avoid blocking
      })
    } else {
      setIsInitialized(true)
    }
  }, [])

  return { isInitialized, isClient }
}