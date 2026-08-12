import type { Meta, StoryObj } from '@storybook/react'
import { ExploreScreen } from './ExploreScreen'

/**
 * Explore 画面（全体）。折りたたみセクションと外部リンクを含む。
 *
 * ⚠️ ストア用スクリーンショットとしては使えない（理由は HomeScreen のストーリー参照）。
 */
const meta = {
  component: ExploreScreen,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'iphone-6-9' } },
  tags: ['autodocs'],
} satisfies Meta<typeof ExploreScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Tablet: Story = {
  globals: { viewport: { value: 'ipad-11' } },
}
