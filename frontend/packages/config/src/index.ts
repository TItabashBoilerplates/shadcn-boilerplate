export * from './tamagui.config'
export * from './animations'
export * from './material-theme'
export * from './material-text'
export * from './theme-example'
export * from './typography-example'

// Export fonts selectively to avoid conflicts
export { bodyFont, headingFont } from './material-fonts'
export { 
  materialDisplayFont,
  materialHeadlineFont,
  materialTitleFont,
  materialBodyFont,
  materialLabelFont,
  materialBodyFontExtended,
  materialHeadingFontExtended
} from './material-fonts'

// Re-export commonly used components for easy access
export {
  H1, H2, H3, H4, H5, H6,
  Subtitle1, Subtitle2,
  Body1, Body2,
  Caption, Overline,
  DisplayLarge, DisplayMedium, DisplaySmall,
  HeadlineLarge, HeadlineMedium, HeadlineSmall,
  TitleLarge, TitleMedium, TitleSmall,
  BodyLarge, BodyMedium, BodySmall,
  LabelLarge, LabelMedium, LabelSmall,
} from './material-text'
