import { render, screen } from '@testing-library/react'
import {
  BUTTON_DEFAULTS,
  BUTTON_SEMANTICS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  RAW_COLOR_PATTERN,
} from '@workspace/tokens/contract'
import { describe, expect, it } from 'vitest'
import { Button, buttonVariants } from '../button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('renders button with variant', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByText('Delete')
    expect(button).toBeInTheDocument()
  })

  it('renders button with size', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByText('Small')
    expect(button).toBeInTheDocument()
  })

  it('handles click events', () => {
    let clicked = false
    render(
      <Button
        onClick={() => {
          clicked = true
        }}
      >
        Click
      </Button>
    )
    screen.getByText('Click').click()
    expect(clicked).toBe(true)
  })
})

/**
 * 共有デザインシステムへの適合（Web 側）。
 *
 * バリアント名 / サイズ名の一致は実装側の `satisfies Record<ButtonVariant, string>` により
 * **コンパイル時**に保証される。ここではクラス文字列の中身、つまり
 * 「契約どおりのセマンティックトークンを使っているか」を実行時に検証する。
 * Mobile 側にも対になるテストがある（packages/native-ui）。
 */
describe('Button / design system conformance', () => {
  it('expresses the semantic tokens the contract requires for each variant', () => {
    for (const variant of BUTTON_VARIANTS) {
      const classes = buttonVariants({ variant })
      for (const token of BUTTON_SEMANTICS[variant]) {
        expect(classes, `${variant} must express "${token}"`).toMatch(
          new RegExp(`(?:^|[\\s:])[a-z-]*-${token}(?:\\b|/)`)
        )
      }
    }
  })

  it('never hardcodes a raw palette colour', () => {
    for (const variant of BUTTON_VARIANTS) {
      for (const size of BUTTON_SIZES) {
        const match = buttonVariants({ variant, size }).match(RAW_COLOR_PATTERN)
        expect(match?.[0], `${variant}/${size} uses a raw colour`).toBeUndefined()
      }
    }
  })

  it('uses the shared defaults', () => {
    expect(buttonVariants({})).toBe(buttonVariants(BUTTON_DEFAULTS))
  })
})
