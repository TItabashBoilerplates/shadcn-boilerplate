import type { Meta, StoryObj } from '@storybook/react'
import { Box, Text } from '@workspace/native-ui/components'
import { UpdateAvailableNotice } from './UpdateAvailableNotice'

/**
 * 推奨アップデートの案内（下部カード・**閉じられる**）。
 *
 * 強制版との違いは「後で」があることと、**裏の画面を覆い隠さない**こと。
 * 推奨アップデートがユーザーの作業を止めてよい理由は無い。
 *
 * decorator で背後にダミーの画面を敷いているのは、
 * **カードが本文をどれだけ隠すか**を目で見るため（下部固定 CTA を持つ画面と
 * 重なると操作不能になる。`.claude/rules/mobile-uiux.md`）。
 */
const meta = {
  component: UpdateAvailableNotice,
  parameters: { layout: 'fullscreen' },
  args: {
    latestVersion: '1.3.0',
    onUpdate: async (): Promise<boolean> => true,
    onDismiss: () => {},
  },
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background p-6">
        <Text size="2xl" bold className="text-foreground">
          ホーム
        </Text>
        <Text className="text-muted-foreground">背後の画面（カードに隠れる範囲の確認用）</Text>
        <Story />
      </Box>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof UpdateAvailableNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithReleaseNote: Story = {
  args: {
    releaseNote: '検索が速くなりました。ダークモードの表示崩れも修正しています。',
  },
}

export const WithoutVersion: Story = {
  args: { latestVersion: null },
}

/** ストアを開けなかった場合。ここでも案内は閉じられたままでよい */
export const OpenStoreFailed: Story = {
  args: { onUpdate: async (): Promise<boolean> => false },
}
