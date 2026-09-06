import type { Meta, StoryObj } from '@storybook/react'
import { UpdateRequiredScreen } from './UpdateRequiredScreen'

/**
 * 強制アップデート画面（全画面・**閉じられない**）。
 *
 * `.claude/rules/ui-testing.md` に従い単体テストは書かない。かわりに
 * **この画面が「閉じる手段を持たない」ことを目で確認する**のがこのストーリーの役目。
 * 「後で」「戻る」「×」が生えていたら、それは強制アップデートの意味を失わせるバグ。
 *
 * 出す / 出さないの判断は `model/decide.ts`（純粋関数・単体テスト済み）が持ち、
 * この画面は判断結果を描くだけ。
 */
const meta = {
  component: UpdateRequiredScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    latestVersion: '2.0.0',
    onUpdate: async (): Promise<boolean> => true,
  },
  tags: ['autodocs'],
} satisfies Meta<typeof UpdateRequiredScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** リリースノートが DB に入っている場合（`app_release_policies.release_notes`） */
export const WithReleaseNote: Story = {
  args: {
    releaseNote: 'サインイン時に稀にクラッシュする不具合を修正しました。',
  },
}

/** 版が読めなかった場合。版の行だけ落ちて、他は成立していること */
export const WithoutVersion: Story = {
  args: { latestVersion: null },
}

/**
 * ストアを開けなかった場合（ストアアプリが無効化された法人管理端末など）。
 * **無言で失敗させない** — 次にどうすればよいかを出す。
 */
export const OpenStoreFailed: Story = {
  args: {
    onUpdate: async (): Promise<boolean> => false,
  },
}

/** 長いリリースノートでレイアウトが崩れないこと */
export const LongReleaseNote: Story = {
  args: {
    releaseNote:
      'バックグラウンド同期の再試行間隔を見直し、圏外から復帰したときに更新が反映されない問題を修正しました。あわせて、画像の読み込みを最適化し、一覧のスクロール中に発生していたカクつきを軽減しています。',
  },
}
