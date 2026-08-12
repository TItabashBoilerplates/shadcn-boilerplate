import type { Meta, StoryObj } from '@storybook/react'
import { ModalScreen } from './ModalScreen'

/**
 * モーダル画面（全体）。
 *
 * ホームへ戻るリンクは expo-router の `Link`（Storybook ではモック）なので、
 * **押しても遷移しない**。遷移そのものの確認は実機 / Expo で行うこと。
 *
 * ⚠️ ストア用スクリーンショットとしては使えない（理由は HomeScreen のストーリー参照）。
 */
const meta = {
  component: ModalScreen,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'iphone-6-9' } },
  tags: ['autodocs'],
} satisfies Meta<typeof ModalScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
