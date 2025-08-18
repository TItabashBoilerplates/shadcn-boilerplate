import { Button, XStack, Text } from 'tamagui'
import { useTranslation } from '../../lib/i18n'

export const LanguageSwitcher = () => {
  const { currentLanguage, setLanguage, isClient } = useTranslation()

  // Don't render language switcher during SSR to avoid hydration mismatch
  if (!isClient) {
    return (
      <XStack gap="$2" alignItems="center">
        <Text fontSize="$3" color="$color">
          Language:
        </Text>
        <Button size="$2" variant="outlined">
          EN
        </Button>
        <Button size="$2" variant="ghost">
          日本語
        </Button>
      </XStack>
    )
  }

  return (
    <XStack gap="$2" alignItems="center">
      <Text fontSize="$3" color="$color">
        Language:
      </Text>
      <Button
        size="$2"
        variant={currentLanguage === 'en' ? 'outlined' : 'ghost'}
        onPress={() => setLanguage('en')}
      >
        EN
      </Button>
      <Button
        size="$2"
        variant={currentLanguage === 'ja' ? 'outlined' : 'ghost'}
        onPress={() => setLanguage('ja')}
      >
        日本語
      </Button>
    </XStack>
  )
}