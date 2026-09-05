import type { Meta, StoryObj } from '@storybook/react'
import { UpdateBannerView } from './UpdateBannerView'

/**
 * 自動更新の通知（desktop のみ。右下に固定で浮く）。
 *
 * ## ここで確かめること
 *
 * - available: 「更新して再起動」が主、「あとで」が副。閉じるボタンの標的が 44px あるか
 * - downloading: 進捗バーが割合で伸びる / 合計不明なら不定表示（脈動）になるか
 * - installed: 操作が消えて「再起動しています」だけになるか
 * - error: 原因の 1 行が出て、再試行と閉じるが残るか
 *
 * 文言は接続側（`UpdateBanner`）が渡す設計なので、カタログでは文字列をそのまま渡している。
 */
const labels = {
  title: '新しいバージョンがあります',
  description: '1.2.0 をインストールできます',
  install: '更新して再起動',
  later: 'あとで',
  downloading: 'ダウンロード中… 62%',
  installed: 'インストールしました。再起動しています…',
  error: '更新をインストールできませんでした。',
  retry: '再試行',
  dismiss: '閉じる',
}

const meta = {
  component: UpdateBannerView,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: { labels, onInstall: () => {}, onDismiss: () => {} },
  decorators: [
    (Story) => (
      // 実際は fixed で画面右下に出る。カタログでは高さを確保して同じ見え方にする
      <div className="relative h-[320px] w-full bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpdateBannerView>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  args: { status: { phase: 'available', version: '1.2.0', notes: null } },
}

export const Downloading: Story = {
  args: { status: { phase: 'downloading', version: '1.2.0', downloaded: 62, total: 100 } },
}

/** Content-Length が来ない配信元では合計が分からない（バーは不定表示にする） */
export const DownloadingUnknownTotal: Story = {
  args: {
    status: { phase: 'downloading', version: '1.2.0', downloaded: 1024, total: null },
    labels: { ...labels, downloading: 'ダウンロード中…' },
  },
}

export const Installed: Story = {
  args: { status: { phase: 'installed', version: '1.2.0' } },
}

export const Failed: Story = {
  args: {
    status: {
      phase: 'error',
      version: '1.2.0',
      message: 'failed to verify the signature of the update payload',
    },
  },
}
