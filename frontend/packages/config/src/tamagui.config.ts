import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { 
  bodyFont, 
  headingFont,
  materialDisplayFont,
  materialHeadlineFont,
  materialTitleFont,
  materialBodyFont,
  materialLabelFont
} from './material-fonts'
import { animations } from './animations'
import { materialLightTheme, materialDarkTheme } from './material-theme'

export const config = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    body: bodyFont,
    heading: headingFont,
    // Material Design 3 Typography System
    display: materialDisplayFont,
    headline: materialHeadlineFont,
    title: materialTitleFont,
    materialBody: materialBodyFont,
    label: materialLabelFont,
  },
  themes: {
    ...defaultConfig.themes,
    // Material Design 3 テーマ
    material_light: materialLightTheme,
    material_dark: materialDarkTheme,
    // エイリアス：デフォルトのlight/darkテーマもMaterial Design 3で置き換え
    light: materialLightTheme,
    dark: materialDarkTheme,
  },
})
