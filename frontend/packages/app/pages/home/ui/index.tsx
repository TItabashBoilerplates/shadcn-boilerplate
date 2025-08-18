import {
  Button,
  H1,
  Paragraph,
  Separator,
  SwitchRouterButton,
  SwitchThemeButton,
  LanguageSwitcher,
  XStack,
  YStack,
} from '@my/ui'
import { Platform } from 'react-native'
import { useLink } from 'solito/link'
import { Sheet } from '../../../widgets/sheet'
import { HomePageProps } from '../model'
import { useTranslation } from '../../../shared/lib/i18n'

export function HomePageUI({ pagesMode = false }: HomePageProps) {
  const { t } = useTranslation()
  const linkTarget = pagesMode ? '/pages-example-user' : '/user'
  
  // Temporarily use simple navigation for web compatibility
  const handleUserNavigation = () => {
    if (Platform.OS === 'web') {
      window.location.href = `${linkTarget}/nate`
    }
  }
  
  const handleTypographyNavigation = () => {
    if (Platform.OS === 'web') {
      window.location.href = '/typography-example'
    }
  }
  
  const handleThemeNavigation = () => {
    if (Platform.OS === 'web') {
      window.location.href = '/theme-example'
    }
  }

  return (
    <YStack flex={1} justify="center" items="center" gap="$8" p="$4" bg="$background">
      <XStack
        position="absolute"
        width="100%"
        t="$6"
        gap="$6"
        justify="center"
        flexWrap="wrap"
        $sm={{ position: 'relative', t: 0 }}
      >
        {Platform.OS === 'web' && (
          <>
            <SwitchRouterButton pagesMode={pagesMode} />
            <SwitchThemeButton />
            <LanguageSwitcher />
          </>
        )}
      </XStack>

      <YStack gap="$4">
        <H1 text="center" color="$color">
          {t('home.title')}
        </H1>
        <Paragraph color="$color10" text="center">
          {t('home.subtitle')}
        </Paragraph>
        <Separator />
        <Paragraph text="center">
          {t('home.sameCodeMessage')}
        </Paragraph>
        <Separator />
      </YStack>

      <XStack gap="$4" flexWrap="wrap" justify="center">
        <Button onPress={handleUserNavigation}>{t('home.linkToUser')}</Button>
        <Button onPress={handleTypographyNavigation} theme="primary">{t('home.typographyExample')}</Button>
        <Button onPress={handleThemeNavigation} theme="secondary">{t('home.themeExample')}</Button>
      </XStack>

      <Sheet />
    </YStack>
  )
}
