import type { Meta, StoryObj } from '@storybook/react'
import { PasswordLoginForm } from './PasswordLoginForm'
import { errorAction, idleAction, pendingAction } from './storyActions'

/**
 * メール + パスワードのログインフォーム。
 *
 * モバイルアプリを配布するプロダクトでは**この画面が審査で使われる**ため、
 * OTP のみの構成にしてはいけない（App Store 2.1(a)）。
 *
 * 「パスワードをお忘れですか？」がこの画面にあるのは、忘れた人はログインできず
 * 設定画面に到達できないため。
 */
const meta = {
  component: PasswordLoginForm,
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
} satisfies Meta<typeof PasswordLoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = {
  args: { action: pendingAction },
  parameters: {
    docs: { description: { story: '送信中。全入力とボタンが無効化される。' } },
  },
}

export const InvalidCredentials: Story = {
  args: { action: errorAction('invalidCredentials') },
}

export const EmailNotConfirmed: Story = {
  args: { action: errorAction('emailNotConfirmed') },
}

export const RateLimited: Story = {
  args: { action: errorAction('rateLimited') },
}

/**
 * パスワード要件を強化した後、既存ユーザーは `weak_password` でログインに失敗する。
 * このときエラーを出すだけでは行き止まりになるので、再設定リンクを併記する。
 */
export const WeakPasswordNeedsReset: Story = {
  args: { action: errorAction('weakPassword', true) },
}
