import { createFont } from '@tamagui/font-inter'
import { createInterFont } from '@tamagui/font-inter'

// Material Design 3 Typography System
// Based on Material Design 3 type scale tokens

// Create Material Design 3 compatible fonts
export const materialDisplayFont = createInterFont({
  size: {
    // Display styles
    1: 36, // Display Small
    2: 45, // Display Medium  
    3: 57, // Display Large
    4: 88, // Display XL
    5: 96, // Hero
  },
  weight: {
    1: '400', // Regular
    2: '400', // Regular
    3: '400', // Regular
    4: '475', // Medium
    5: '475', // Medium
  },
  lineHeight: {
    1: 44,
    2: 52,
    3: 64,
    4: 96,
    5: 96,
  },
  letterSpacing: {
    1: -0.25,
    2: 0,
    3: -0.25,
    4: 0,
    5: 0,
  },
  face: {
    400: { normal: 'Inter' },
    475: { normal: 'Inter' },
    500: { normal: 'InterMedium' },
  },
})

export const materialHeadlineFont = createInterFont({
  size: {
    // Headline styles
    1: 24, // Headline Small
    2: 28, // Headline Medium
    3: 32, // Headline Large
  },
  weight: {
    1: '400', // Regular
    2: '400', // Regular
    3: '400', // Regular
  },
  lineHeight: {
    1: 32,
    2: 36,
    3: 40,
  },
  letterSpacing: {
    1: 0,
    2: 0,
    3: 0,
  },
  face: {
    400: { normal: 'Inter' },
  },
})

export const materialTitleFont = createInterFont({
  size: {
    // Title styles
    1: 14, // Title Small
    2: 16, // Title Medium
    3: 22, // Title Large
  },
  weight: {
    1: '500', // Medium
    2: '500', // Medium
    3: '400', // Regular
  },
  lineHeight: {
    1: 20,
    2: 24,
    3: 30,
  },
  letterSpacing: {
    1: 0.1,
    2: 0.15,
    3: 0,
  },
  face: {
    400: { normal: 'Inter' },
    500: { normal: 'InterMedium' },
  },
})

export const materialBodyFont = createInterFont({
  size: {
    // Body styles
    1: 12, // Body Small
    2: 14, // Body Medium
    3: 16, // Body Large
  },
  weight: {
    1: '400', // Regular
    2: '400', // Regular
    3: '400', // Regular
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
  },
  letterSpacing: {
    1: 0.4,
    2: 0.25,
    3: 0.5,
  },
  face: {
    400: { normal: 'Inter' },
  },
})

export const materialLabelFont = createInterFont({
  size: {
    // Label styles
    1: 11, // Label Small
    2: 12, // Label Medium
    3: 14, // Label Large
  },
  weight: {
    1: '500', // Medium
    2: '500', // Medium
    3: '500', // Medium
  },
  lineHeight: {
    1: 16,
    2: 16,
    3: 20,
  },
  letterSpacing: {
    1: 0.5,
    2: 0.5,
    3: 0.1,
  },
  face: {
    500: { normal: 'InterMedium' },
  },
})

// Extended body font for general use (existing configuration enhanced)
export const materialBodyFontExtended = createInterFont(
  {
    size: {
      1: 11,  // Label Small
      2: 12,  // Body Small / Label Medium
      3: 14,  // Body Medium / Label Large / Title Small
      4: 16,  // Body Large / Title Medium
      5: 22,  // Title Large
      6: 24,  // Headline Small
      7: 28,  // Headline Medium
      8: 32,  // Headline Large
      9: 36,  // Display Small
      10: 45, // Display Medium
      11: 57, // Display Large
      12: 88, // Display XL
      13: 96, // Hero
    },
    weight: {
      1: '400', // Regular
      2: '400', // Regular
      3: '400', // Regular
      4: '400', // Regular
      5: '400', // Regular
      6: '400', // Regular
      7: '400', // Regular
      8: '400', // Regular
      9: '400', // Regular
      10: '400', // Regular
      11: '400', // Regular
      12: '475', // Medium
      13: '475', // Medium
    },
    lineHeight: {
      1: 16,
      2: 16,
      3: 20,
      4: 24,
      5: 30,
      6: 32,
      7: 36,
      8: 40,
      9: 44,
      10: 52,
      11: 64,
      12: 96,
      13: 96,
    },
    letterSpacing: {
      1: 0.5,
      2: 0.4,
      3: 0.25,
      4: 0.5,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: -0.25,
      10: 0,
      11: -0.25,
      12: 0,
      13: 0,
    },
    face: {
      400: { normal: 'Inter' },
      475: { normal: 'Inter' },
      500: { normal: 'InterMedium' },
      700: { normal: 'InterBold' },
    },
  },
  {
    sizeSize: (size) => Math.round(size * 1.0), // No scaling for Material Design precision
    sizeLineHeight: (size) => Math.round(size * 1.4), // Default line height ratio
  }
)

// Enhanced heading font for Material Design 3
export const materialHeadingFontExtended = createInterFont({
  size: {
    1: 14,  // Title Small
    2: 16,  // Title Medium
    3: 22,  // Title Large
    4: 24,  // Headline Small
    5: 28,  // Headline Medium
    6: 32,  // Headline Large
    7: 36,  // Display Small
    8: 45,  // Display Medium
    9: 57,  // Display Large
    10: 88, // Display XL
    11: 96, // Hero
  },
  weight: {
    1: '500', // Medium
    2: '500', // Medium
    3: '400', // Regular
    4: '400', // Regular
    5: '400', // Regular
    6: '400', // Regular
    7: '400', // Regular
    8: '400', // Regular
    9: '400', // Regular
    10: '475', // Medium
    11: '475', // Medium
  },
  lineHeight: {
    1: 20,
    2: 24,
    3: 30,
    4: 32,
    5: 36,
    6: 40,
    7: 44,
    8: 52,
    9: 64,
    10: 96,
    11: 96,
  },
  letterSpacing: {
    1: 0.1,
    2: 0.15,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: -0.25,
    8: 0,
    9: -0.25,
    10: 0,
    11: 0,
  },
  transform: {
    1: 'none',
    2: 'none',
    3: 'none',
    4: 'none',
    5: 'none',
    6: 'none',
    7: 'none',
    8: 'none',
    9: 'none',
    10: 'none',
    11: 'none',
  },
  color: {
    1: '$color',
    2: '$color',
    3: '$color',
    4: '$color',
    5: '$color',
    6: '$color',
    7: '$color',
    8: '$color',
    9: '$color',
    10: '$color',
    11: '$color',
  },
  face: {
    400: { normal: 'Inter' },
    475: { normal: 'Inter' },
    500: { normal: 'InterMedium' },
    700: { normal: 'InterBold' },
  },
})

// Export aliases for backward compatibility
export const bodyFont = materialBodyFontExtended
export const headingFont = materialHeadingFontExtended