import React from 'react'
import { Text, styled, GetProps } from 'tamagui'

// Material Design 3 Typography Components
// Based on Material Design 3 type scale system

// Display Text Components
export const DisplayLarge = styled(Text, {
  fontFamily: '$display',
  fontSize: '$3', // 57px
  fontWeight: '$1', // 400
  lineHeight: '$3', // 64px
  letterSpacing: '$3', // -0.25px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

export const DisplayMedium = styled(Text, {
  fontFamily: '$display',
  fontSize: '$2', // 45px
  fontWeight: '$2', // 400
  lineHeight: '$2', // 52px
  letterSpacing: '$2', // 0px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

export const DisplaySmall = styled(Text, {
  fontFamily: '$display',
  fontSize: '$1', // 36px
  fontWeight: '$1', // 400
  lineHeight: '$1', // 44px
  letterSpacing: '$1', // -0.25px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

// Headline Text Components
export const HeadlineLarge = styled(Text, {
  fontFamily: '$headline',
  fontSize: '$3', // 32px
  fontWeight: '$3', // 400
  lineHeight: '$3', // 40px
  letterSpacing: '$3', // 0px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

export const HeadlineMedium = styled(Text, {
  fontFamily: '$headline',
  fontSize: '$2', // 28px
  fontWeight: '$2', // 400
  lineHeight: '$2', // 36px
  letterSpacing: '$2', // 0px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

export const HeadlineSmall = styled(Text, {
  fontFamily: '$headline',
  fontSize: '$1', // 24px
  fontWeight: '$1', // 400
  lineHeight: '$1', // 32px
  letterSpacing: '$1', // 0px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

// Title Text Components
export const TitleLarge = styled(Text, {
  fontFamily: '$title',
  fontSize: '$3', // 22px
  fontWeight: '$3', // 400
  lineHeight: '$3', // 30px
  letterSpacing: '$3', // 0px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

export const TitleMedium = styled(Text, {
  fontFamily: '$title',
  fontSize: '$2', // 16px
  fontWeight: '$2', // 500
  lineHeight: '$2', // 24px
  letterSpacing: '$2', // 0.15px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

export const TitleSmall = styled(Text, {
  fontFamily: '$title',
  fontSize: '$1', // 14px
  fontWeight: '$1', // 500
  lineHeight: '$1', // 20px
  letterSpacing: '$1', // 0.1px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
    },
  },
})

// Body Text Components
export const BodyLarge = styled(Text, {
  fontFamily: '$materialBody',
  fontSize: '$3', // 16px
  fontWeight: '$3', // 400
  lineHeight: '$3', // 24px
  letterSpacing: '$3', // 0.5px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
      muted: {
        color: '$placeholderColor',
      },
    },
  },
})

export const BodyMedium = styled(Text, {
  fontFamily: '$materialBody',
  fontSize: '$2', // 14px
  fontWeight: '$2', // 400
  lineHeight: '$2', // 20px
  letterSpacing: '$2', // 0.25px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
      muted: {
        color: '$placeholderColor',
      },
    },
  },
})

export const BodySmall = styled(Text, {
  fontFamily: '$materialBody',
  fontSize: '$1', // 12px
  fontWeight: '$1', // 400
  lineHeight: '$1', // 16px
  letterSpacing: '$1', // 0.4px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
      muted: {
        color: '$placeholderColor',
      },
    },
  },
})

// Label Text Components
export const LabelLarge = styled(Text, {
  fontFamily: '$label',
  fontSize: '$3', // 14px
  fontWeight: '$3', // 500
  lineHeight: '$3', // 20px
  letterSpacing: '$3', // 0.1px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
      muted: {
        color: '$placeholderColor',
      },
    },
  },
})

export const LabelMedium = styled(Text, {
  fontFamily: '$label',
  fontSize: '$2', // 12px
  fontWeight: '$2', // 500
  lineHeight: '$2', // 16px
  letterSpacing: '$2', // 0.5px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
      muted: {
        color: '$placeholderColor',
      },
    },
  },
})

export const LabelSmall = styled(Text, {
  fontFamily: '$label',
  fontSize: '$1', // 11px
  fontWeight: '$1', // 500
  lineHeight: '$1', // 16px
  letterSpacing: '$1', // 0.5px
  color: '$color',
  variants: {
    theme: {
      primary: {
        color: '$primary',
      },
      secondary: {
        color: '$secondary',
      },
      muted: {
        color: '$placeholderColor',
      },
    },
  },
})

// Convenience aliases for common use cases
export const H1 = DisplayLarge
export const H2 = DisplayMedium
export const H3 = DisplaySmall
export const H4 = HeadlineLarge
export const H5 = HeadlineMedium
export const H6 = HeadlineSmall
export const Subtitle1 = TitleLarge
export const Subtitle2 = TitleMedium
export const Body1 = BodyLarge
export const Body2 = BodyMedium
export const Caption = BodySmall
export const Overline = LabelSmall

// Type exports for TypeScript
export type DisplayLargeProps = GetProps<typeof DisplayLarge>
export type DisplayMediumProps = GetProps<typeof DisplayMedium>
export type DisplaySmallProps = GetProps<typeof DisplaySmall>
export type HeadlineLargeProps = GetProps<typeof HeadlineLarge>
export type HeadlineMediumProps = GetProps<typeof HeadlineMedium>
export type HeadlineSmallProps = GetProps<typeof HeadlineSmall>
export type TitleLargeProps = GetProps<typeof TitleLarge>
export type TitleMediumProps = GetProps<typeof TitleMedium>
export type TitleSmallProps = GetProps<typeof TitleSmall>
export type BodyLargeProps = GetProps<typeof BodyLarge>
export type BodyMediumProps = GetProps<typeof BodyMedium>
export type BodySmallProps = GetProps<typeof BodySmall>
export type LabelLargeProps = GetProps<typeof LabelLarge>
export type LabelMediumProps = GetProps<typeof LabelMedium>
export type LabelSmallProps = GetProps<typeof LabelSmall>