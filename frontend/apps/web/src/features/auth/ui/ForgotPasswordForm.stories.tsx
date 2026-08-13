import type { Meta, StoryObj } from '@storybook/react'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { errorAction, idleAction, pendingAction, successAction } from './storyActions'

/**
 * パスワード再設定の申請フォーム。
 *
 * **成功文言はアカウントの存在を漏らさない**（「登録があればメールを送りました」）。
 * 「登録されていません」と返すのはユーザー列挙攻撃の入口になる。
 */
const meta = {
  component: ForgotPasswordForm,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[380px]">
        <Story />
      </div>
    ),
  ],
  args: { action: idleAction },
} satisfies Meta<typeof ForgotPasswordForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = { args: { action: pendingAction } }

export const Sent: Story = { args: { action: successAction('passwordResetSent') } }

/** 連打対策。レート制限だけは事実として伝える（黙って成功に見せない）。 */
export const RateLimited: Story = { args: { action: errorAction('rateLimited') } }

export const InvalidEmail: Story = { args: { action: errorAction('emailInvalidFormat') } }
