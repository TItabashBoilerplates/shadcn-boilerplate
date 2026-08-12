import type { Meta, StoryObj } from '@storybook/react'
import { HomeScreen } from './HomeScreen'

/**
 * ホーム画面（全体）。
 *
 * 画面まるごとを載せているのは **UI/UX デバッグ用**（レイアウト崩れ・トークン適用・
 * ダーク/ライトの確認）。ツールバーの Viewport で実機相当の画面幅に切り替えられる。
 *
 * ⚠️ **ストア用スクリーンショットとしては使えない。**
 *    react-native-web の描画なので、ネイティブのフォント・shadow/elevation・
 *    ステータスバー・セーフエリアが実機と一致しない。提出用の画像は
 *    `screenshots-mobile`（Maestro + simulator/emulator）で撮ること。
 */
const meta = {
  component: HomeScreen,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'iphone-6-9' } },
  tags: ['autodocs'],
} satisfies Meta<typeof HomeScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** タブレット幅でのレイアウト確認 */
export const Tablet: Story = {
  globals: { viewport: { value: 'ipad-11' } },
}
