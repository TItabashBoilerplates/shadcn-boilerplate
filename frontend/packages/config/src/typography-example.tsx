import { Card, Theme, YStack, Text } from 'tamagui'
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
} from './material-text'

// Import i18n hooks (assuming this component will be used in app context)
// import { useTranslation } from '../../packages/app/shared/lib/i18n'

/**
 * Material Design 3 Typography System のデモンストレーション用コンポーネント
 *
 * 使用方法:
 * <TypographyExample />
 */
export const TypographyExample = () => {
  // For now, keep the original text until proper i18n integration
  // const { t } = useTranslation()
  
  return (
    <YStack paddingBlock="$4" paddingInline="$4" gap="$4">
      <H1>Material Design 3 Typography System</H1>

      {/* Display Styles */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Display Styles</TitleLarge>
            <YStack gap="$2">
              <DisplayLarge>Display Large (57px)</DisplayLarge>
              <DisplayMedium>Display Medium (45px)</DisplayMedium>
              <DisplaySmall>Display Small (36px)</DisplaySmall>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Headline Styles */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Headline Styles</TitleLarge>
            <YStack gap="$2">
              <HeadlineLarge>Headline Large (32px)</HeadlineLarge>
              <HeadlineMedium>Headline Medium (28px)</HeadlineMedium>
              <HeadlineSmall>Headline Small (24px)</HeadlineSmall>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Title Styles */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Title Styles</TitleLarge>
            <YStack gap="$2">
              <TitleLarge>Title Large (22px)</TitleLarge>
              <TitleMedium>Title Medium (16px)</TitleMedium>
              <TitleSmall>Title Small (14px)</TitleSmall>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Body Styles */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Body Styles</TitleLarge>
            <YStack gap="$2">
              <BodyLarge>
                Body Large (16px) - このテキストはMaterial Design 3のBody
                Largeスタイルを使用しています。
                長文の本文やメインコンテンツに適しています。読みやすさを重視した適切な行間と文字間隔が設定されています。
              </BodyLarge>
              <BodyMedium>
                Body Medium (14px) - このテキストはMaterial Design 3のBody
                Mediumスタイルを使用しています。
                標準的な本文テキストに適しており、多くの場面で使用される汎用的なサイズです。
              </BodyMedium>
              <BodySmall>
                Body Small (12px) - このテキストはMaterial Design 3のBody
                Smallスタイルを使用しています。 副次的な情報や補足説明に適した小さめのテキストです。
              </BodySmall>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Label Styles */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Label Styles</TitleLarge>
            <YStack gap="$2">
              <LabelLarge>Label Large (14px)</LabelLarge>
              <LabelMedium>Label Medium (12px)</LabelMedium>
              <LabelSmall>Label Small (11px)</LabelSmall>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Convenience Aliases */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Convenience Aliases</TitleLarge>
            <YStack gap="$2">
              <H1>H1 (Display Large)</H1>
              <H2>H2 (Display Medium)</H2>
              <H3>H3 (Display Small)</H3>
              <H4>H4 (Headline Large)</H4>
              <H5>H5 (Headline Medium)</H5>
              <H6>H6 (Headline Small)</H6>
              <Subtitle1>Subtitle1 (Title Large)</Subtitle1>
              <Subtitle2>Subtitle2 (Title Medium)</Subtitle2>
              <Body1>Body1 (Body Large)</Body1>
              <Body2>Body2 (Body Medium)</Body2>
              <Caption>Caption (Body Small)</Caption>
              <Overline>OVERLINE (Label Small)</Overline>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Color Variations */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Color Variations</TitleLarge>
            <YStack gap="$2">
              <BodyLarge>Default text color</BodyLarge>
              <BodyLarge color="$primary">Primary color text</BodyLarge>
              <BodyLarge color="$secondary">Secondary color text</BodyLarge>
              <BodyLarge color="$placeholderColor">Placeholder color text</BodyLarge>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Dark Theme Example */}
      <Theme name="material_dark">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Dark Theme Typography</TitleLarge>
            <YStack gap="$2">
              <DisplaySmall>Display Small in Dark Theme</DisplaySmall>
              <HeadlineMedium>Headline Medium in Dark Theme</HeadlineMedium>
              <TitleLarge>Title Large in Dark Theme</TitleLarge>
              <BodyLarge>
                Body Large in Dark Theme - ダークテーマでは、適切なコントラストを維持しながら
                読みやすさを確保するために色彩が調整されています。
              </BodyLarge>
              <LabelMedium>Label Medium in Dark Theme</LabelMedium>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Typography Scale Reference */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Typography Scale Reference</TitleLarge>
            <YStack gap="$1">
              <BodySmall>Display Large: 57px / 64px line height / -0.25px letter spacing</BodySmall>
              <BodySmall>Display Medium: 45px / 52px line height / 0px letter spacing</BodySmall>
              <BodySmall>Display Small: 36px / 44px line height / -0.25px letter spacing</BodySmall>
              <BodySmall>Headline Large: 32px / 40px line height / 0px letter spacing</BodySmall>
              <BodySmall>Headline Medium: 28px / 36px line height / 0px letter spacing</BodySmall>
              <BodySmall>Headline Small: 24px / 32px line height / 0px letter spacing</BodySmall>
              <BodySmall>Title Large: 22px / 30px line height / 0px letter spacing</BodySmall>
              <BodySmall>Title Medium: 16px / 24px line height / 0.15px letter spacing</BodySmall>
              <BodySmall>Title Small: 14px / 20px line height / 0.1px letter spacing</BodySmall>
              <BodySmall>Body Large: 16px / 24px line height / 0.5px letter spacing</BodySmall>
              <BodySmall>Body Medium: 14px / 20px line height / 0.25px letter spacing</BodySmall>
              <BodySmall>Body Small: 12px / 16px line height / 0.4px letter spacing</BodySmall>
              <BodySmall>Label Large: 14px / 20px line height / 0.1px letter spacing</BodySmall>
              <BodySmall>Label Medium: 12px / 16px line height / 0.5px letter spacing</BodySmall>
              <BodySmall>Label Small: 11px / 16px line height / 0.5px letter spacing</BodySmall>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Font Weight Examples */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Font Weight Examples</TitleLarge>
            <YStack gap="$2">
              <Text fontFamily="$body" fontSize="$4" fontWeight="400">
                Regular (400) - 標準的な本文テキスト
              </Text>
              <Text fontFamily="$body" fontSize="$4" fontWeight="500">
                Medium (500) - 少し太めのテキスト
              </Text>
              <Text fontFamily="$body" fontSize="$4" fontWeight="700">
                Bold (700) - 太字のテキスト
              </Text>
            </YStack>
          </YStack>
        </Card>
      </Theme>

      {/* Responsive Typography */}
      <Theme name="material_light">
        <Card paddingHorizontal="$4" paddingVertical="$4" bordered>
          <YStack gap="$3">
            <TitleLarge>Responsive Typography</TitleLarge>
            <YStack gap="$2">
              <Text
                fontFamily="$display"
                fontSize="$5"
                fontWeight="$5"
                $sm={{ fontSize: '$4', fontWeight: '$4' }}
                $md={{ fontSize: '$5', fontWeight: '$5' }}
              >
                レスポンシブテキスト - 画面サイズに応じて変化
              </Text>
              <BodyMedium>
                上記のテキストは画面サイズに応じてフォントサイズが変化します。
                小さな画面では小さく、大きな画面では大きく表示されます。
              </BodyMedium>
            </YStack>
          </YStack>
        </Card>
      </Theme>
    </YStack>
  )
}

export default TypographyExample
