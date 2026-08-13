import type { Meta, StoryObj } from '@storybook/react'
import { errorAction, idleAction, pendingAction, successAction } from './storyActions'
import { UpdatePasswordForm } from './UpdatePasswordForm'

/**
 * 再設定リンクの着地点で使う「新しいパスワード」フォーム。
 * 現在のパスワードは尋ねない（忘れた人が来る画面のため）。
 */
const meta = {
  component: UpdatePasswordForm,
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
} satisfies Meta<typeof UpdatePasswordForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = { args: { action: pendingAction } }

export const Updated: Story = { args: { action: successAction('passwordUpdated') } }

/** リンク失効。ここで再送導線を出さないと行き止まりになる。 */
export const SessionExpired: Story = { args: { action: errorAction('sessionExpired') } }

export const SamePassword: Story = { args: { action: errorAction('samePassword') } }
