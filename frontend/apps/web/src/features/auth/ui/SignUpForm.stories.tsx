import type { Meta, StoryObj } from '@storybook/react'
import { SignUpForm } from './SignUpForm'
import { errorAction, idleAction, pendingAction, successAction } from './storyActions'

/**
 * サインアップフォーム。
 *
 * 本番は確認メールが挟まる（`enable_confirmations = true`）ので、成功時は
 * フォームを畳んで案内に差し替える（続けて押させない）。
 */
const meta = {
  component: SignUpForm,
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
} satisfies Meta<typeof SignUpForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = { args: { action: pendingAction } }

/** 送信後。**アカウントの存在を漏らさない**ため、既存アドレスでもこの表示になる。 */
export const ConfirmationSent: Story = {
  args: { action: successAction('signUpConfirmationSent') },
}

export const PasswordTooWeak: Story = { args: { action: errorAction('passwordTooWeak') } }

export const PasswordMismatch: Story = { args: { action: errorAction('passwordMismatch') } }

export const SignupDisabled: Story = { args: { action: errorAction('signupDisabled') } }
