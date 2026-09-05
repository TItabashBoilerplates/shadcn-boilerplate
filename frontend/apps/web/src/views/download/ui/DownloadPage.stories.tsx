import type { Meta, StoryObj } from '@storybook/react'
import { DownloadPage } from './DownloadPage'

/**
 * デスクトップアプリのダウンロードページ。
 *
 * ## ここで確かめること
 *
 * - 2 枚のカードのボタンが**同じ高さに並ぶ**（Windows 側だけ注記が 1 行多い）
 * - 配布中の版の行（`releaseSlot`）が有る / 無いでレイアウトが跳ねないか
 * - SmartScreen の注記が読める大きさで出ているか（未署名配布の案内）
 *
 * URL と版は props で受ける（環境変数と Storage への通信に依存させない）。
 */
const meta = {
  component: DownloadPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    macAppleSiliconUrl: 'https://example.supabase.co/.../App-apple-silicon.dmg',
    winUrl: 'https://example.supabase.co/.../App-setup.exe',
    releaseSlot: (
      <p className="text-muted-foreground text-sm tabular-nums">
        最新版 v1.2.0 · 2026年9月5日 公開
      </p>
    ),
  },
} satisfies Meta<typeof DownloadPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** latest.json が読めなかったとき（版の行は出さない。ダウンロードは成立する） */
export const WithoutRelease: Story = {
  args: { releaseSlot: null },
}
