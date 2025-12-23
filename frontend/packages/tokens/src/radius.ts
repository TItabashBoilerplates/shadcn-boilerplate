/**
 * Design Tokens: Border Radius
 */

export const radius = {
  base: '0.625rem',
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'calc(var(--radius) + 4px)',
} as const

export type RadiusToken = keyof typeof radius
