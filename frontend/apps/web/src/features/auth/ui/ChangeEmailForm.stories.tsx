import type { Meta, StoryObj } from '@storybook/react'
import { ChangeEmailForm } from './ChangeEmailForm'
import { errorAction, idleAction, pendingAction, successAction } from './storyActions'

/**
 * 設定画面のメールアドレス再設定。
 *
 * **認証方式が OTP でもメール + パスワードでも必須の導線。**
 * `double_confirm_changes = true`（既定）なので旧・新の両方で確認するまで変わらない。
 * その旨をフォーム内に明示している（説明が無いと問い合わせになる）。
 */
const meta = {
  component: ChangeEmailForm,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[420px]">
        <Story />
      </div>
    ),
  ],
  args: { action: idleAction, currentEmail: 'user@example.com' },
} satisfies Meta<typeof ChangeEmailForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = { args: { action: pendingAction } }

export const ConfirmationSent: Story = { args: { action: successAction('emailChangeRequested') } }

export const InvalidEmail: Story = { args: { action: errorAction('emailInvalidFormat') } }

export const RateLimited: Story = { args: { action: errorAction('rateLimited') } }

/** 長いアドレスでレイアウトが崩れないこと。 */
export const LongCurrentEmail: Story = {
  args: { currentEmail: 'very.long.email.address.for.layout.check@subdomain.example.co.jp' },
}
