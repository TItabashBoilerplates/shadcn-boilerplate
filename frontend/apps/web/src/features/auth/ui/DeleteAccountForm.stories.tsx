import type { Meta, StoryObj } from '@storybook/react'
import { DeleteAccountForm } from './DeleteAccountForm'
import { errorAction, idleAction, pendingAction, successAction } from './storyActions'

/**
 * アカウント削除。**App Store 5.1.1(v) によりモバイル配布時は必須**の導線。
 *
 * 削除は取り消せないため二段階（ボタン → 確認語句の入力）にしている。
 * 既定では最初の「削除」ボタンだけが見える状態から始まる。
 */
const meta = {
  component: DeleteAccountForm,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[420px]">
        <Story />
      </div>
    ),
  ],
  args: { action: idleAction, confirmationWord: 'DELETE' },
} satisfies Meta<typeof DeleteAccountForm>

export default meta
type Story = StoryObj<typeof meta>

/** 第 1 段階。いきなり消えないよう、まずボタンだけを見せる。 */
export const Armed: Story = {}

export const Submitting: Story = { args: { action: pendingAction } }

export const Deleted: Story = { args: { action: successAction('accountDeleted') } }

/** 確認語句が一致しない場合。フォームは残したまま理由を出す。 */
export const ConfirmationMismatch: Story = {
  args: { action: errorAction('deleteConfirmationMismatch') },
}

export const SessionExpired: Story = { args: { action: errorAction('sessionExpired') } }
