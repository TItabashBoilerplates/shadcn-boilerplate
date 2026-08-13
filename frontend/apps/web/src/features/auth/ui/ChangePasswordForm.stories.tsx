import type { Meta, StoryObj } from '@storybook/react'
import { ChangePasswordForm } from './ChangePasswordForm'
import { errorAction, idleAction, pendingAction, successAction } from './storyActions'

/**
 * 設定画面のパスワード変更。
 *
 * 現在のパスワードは `updateUser({ current_password, password })` で
 * Supabase 側に検証させる（`signInWithPassword` での代用は誤り）。
 */
const meta = {
  component: ChangePasswordForm,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[420px]">
        <Story />
      </div>
    ),
  ],
  args: { action: idleAction },
} satisfies Meta<typeof ChangePasswordForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = { args: { action: pendingAction } }

export const Updated: Story = { args: { action: successAction('passwordUpdated') } }

/** 現在のパスワードが違うときは Supabase が `invalid_credentials` を返す。 */
export const WrongCurrentPassword: Story = { args: { action: errorAction('invalidCredentials') } }

export const SamePassword: Story = { args: { action: errorAction('samePassword') } }
