import { Card, Theme, YStack, Text } from '@my/ui'
import {
  DisplayLarge,
  DisplayMedium,
  DisplaySmall,
  HeadlineLarge,
  HeadlineMedium,
  HeadlineSmall,
  TitleLarge,
  TitleMedium,
  TitleSmall,
  BodyLarge,
  BodyMedium,
  BodySmall,
  LabelLarge,
  LabelMedium,
  LabelSmall,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Subtitle1,
  Subtitle2,
  Body1,
  Body2,
  Caption,
  Overline,
} from '@my/config'
import { useTranslation } from '../../../shared/lib/i18n'
import { TypographyExamplePageProps } from '../model'

export function TypographyExamplePageUI(props: TypographyExamplePageProps) {
  const { t } = useTranslation()
  
  return (
    <YStack flex={1} bg="$background">
      <YStack paddingBlock="$4" paddingInline="$4" gap="$4">
        <H1>{t('typography.title')}</H1>

        {/* Display Styles */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.displayStyles')}</TitleLarge>
              <YStack gap="$2">
                <DisplayLarge>{t('typography.displayLarge')}</DisplayLarge>
                <DisplayMedium>{t('typography.displayMedium')}</DisplayMedium>
                <DisplaySmall>{t('typography.displaySmall')}</DisplaySmall>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Headline Styles */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.headlineStyles')}</TitleLarge>
              <YStack gap="$2">
                <HeadlineLarge>{t('typography.headlineLarge')}</HeadlineLarge>
                <HeadlineMedium>{t('typography.headlineMedium')}</HeadlineMedium>
                <HeadlineSmall>{t('typography.headlineSmall')}</HeadlineSmall>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Title Styles */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.titleStyles')}</TitleLarge>
              <YStack gap="$2">
                <TitleLarge>{t('typography.titleLarge')}</TitleLarge>
                <TitleMedium>{t('typography.titleMedium')}</TitleMedium>
                <TitleSmall>{t('typography.titleSmall')}</TitleSmall>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Body Styles */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.bodyStyles')}</TitleLarge>
              <YStack gap="$2">
                <BodyLarge>
                  {t('typography.bodyLarge')}
                </BodyLarge>
                <BodyMedium>
                  {t('typography.bodyMedium')}
                </BodyMedium>
                <BodySmall>
                  {t('typography.bodySmall')}
                </BodySmall>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Label Styles */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.labelStyles')}</TitleLarge>
              <YStack gap="$2">
                <LabelLarge>{t('typography.labelLarge')}</LabelLarge>
                <LabelMedium>{t('typography.labelMedium')}</LabelMedium>
                <LabelSmall>{t('typography.labelSmall')}</LabelSmall>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Color Variations */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.colorVariations')}</TitleLarge>
              <YStack gap="$2">
                <BodyLarge>{t('typography.defaultColor')}</BodyLarge>
                <BodyLarge color="$primary">{t('typography.primaryColor')}</BodyLarge>
                <BodyLarge color="$secondary">{t('typography.secondaryColor')}</BodyLarge>
                <BodyLarge color="$placeholderColor">{t('typography.placeholderColor')}</BodyLarge>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Dark Theme Example */}
        <Theme name="material_dark">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.darkTheme')}</TitleLarge>
              <YStack gap="$2">
                <DisplaySmall>Display Small in Dark Theme</DisplaySmall>
                <HeadlineMedium>Headline Medium in Dark Theme</HeadlineMedium>
                <TitleLarge>Title Large in Dark Theme</TitleLarge>
                <BodyLarge>
                  {t('typography.darkThemeDescription')}
                </BodyLarge>
                <LabelMedium>Label Medium in Dark Theme</LabelMedium>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Font Weight Examples */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.fontWeights')}</TitleLarge>
              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$4" fontWeight="400">
                  {t('typography.regularWeight')}
                </Text>
                <Text fontFamily="$body" fontSize="$4" fontWeight="500">
                  {t('typography.mediumWeight')}
                </Text>
                <Text fontFamily="$body" fontSize="$4" fontWeight="700">
                  {t('typography.boldWeight')}
                </Text>
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Responsive Typography */}
        <Theme name="material_light">
          <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
            <YStack gap="$3">
              <TitleLarge>{t('typography.responsive')}</TitleLarge>
              <YStack gap="$2">
                <Text
                  fontFamily="$display"
                  fontSize="$5"
                  fontWeight="$5"
                  $sm={{ fontSize: '$4', fontWeight: '$4' }}
                  $md={{ fontSize: '$5', fontWeight: '$5' }}
                >
                  {t('typography.responsiveText')}
                </Text>
                <BodyMedium>
                  {t('typography.responsiveDescription2')}
                </BodyMedium>
              </YStack>
            </YStack>
          </Card>
        </Theme>
      </YStack>
    </YStack>
  )
}