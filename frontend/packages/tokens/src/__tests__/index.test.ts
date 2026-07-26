import { describe, expect, it } from 'vitest'

import { colors } from '../colors'
import { cssVar, toKebabCase } from '../index'
import { buttonIconSize, buttonRecipe, buttonSize, buttonVariant, pickSlot } from '../variants'

describe('toKebabCase', () => {
  it('converts camelCase to kebab-case', () => {
    expect(toKebabCase('primaryForeground')).toBe('primary-foreground')
    expect(toKebabCase('sidebarAccentForeground')).toBe('sidebar-accent-foreground')
  })

  it('separates letter/digit boundaries so chart tokens match shadcn naming', () => {
    expect(toKebabCase('chart1')).toBe('chart-1')
    expect(toKebabCase('chart5')).toBe('chart-5')
  })

  it('leaves already-lowercase single words untouched', () => {
    expect(toKebabCase('background')).toBe('background')
  })
})

describe('cssVar', () => {
  it('builds a CSS variable reference from a token name', () => {
    expect(cssVar('primaryForeground')).toBe('var(--primary-foreground)')
    expect(cssVar('chart1')).toBe('var(--chart-1)')
  })
})

describe('colors', () => {
  it('defines the exact same token keys for light and dark', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort())
  })
})

describe('buttonRecipe', () => {
  it('exposes matching variant and size keys through the recipe', () => {
    expect(Object.keys(buttonRecipe.variant)).toEqual(Object.keys(buttonVariant))
    expect(Object.keys(buttonRecipe.size)).toEqual(Object.keys(buttonSize))
  })

  it('points every default variant at an existing entry', () => {
    expect(buttonRecipe.variant).toHaveProperty(buttonRecipe.defaultVariants.variant)
    expect(buttonRecipe.size).toHaveProperty(buttonRecipe.defaultVariants.size)
  })

  it('declares an icon size for every button size', () => {
    expect(Object.keys(buttonIconSize).sort()).toEqual(Object.keys(buttonSize).sort())
  })

  it('uses only semantic tokens, never raw palette colours', () => {
    const allClasses = [
      ...Object.values(buttonVariant).flatMap((slot) => [slot.container, slot.label]),
      ...Object.values(buttonSize).flatMap((slot) => [slot.container, slot.label]),
    ].join(' ')

    // zinc/gray/slate などのパレット直指定は禁止（.claude/rules/frontend.md）
    expect(allClasses).not.toMatch(/\b(?:bg|text|border)-(?:zinc|gray|slate|neutral|stone)-\d/)
  })
})

describe('pickSlot', () => {
  it('extracts one slot while preserving the variant keys', () => {
    expect(pickSlot(buttonVariant, 'container')).toEqual({
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border border-input bg-background',
      ghost: 'bg-transparent',
      link: 'bg-transparent',
    })
  })

  it('extracts the label slot', () => {
    expect(pickSlot(buttonSize, 'label')).toEqual({
      sm: 'text-sm',
      default: 'text-sm',
      lg: 'text-base',
      icon: 'text-sm',
    })
  })
})
