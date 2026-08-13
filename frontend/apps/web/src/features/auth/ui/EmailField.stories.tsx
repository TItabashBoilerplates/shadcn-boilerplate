import type { Meta, StoryObj } from '@storybook/react'
import { EmailField } from './EmailField'

/**
 * メールアドレス入力欄。認証系フォーム 4 つで使い回す。
 *
 * フォントサイズは共有 `Input` が `text-base md:text-sm` を持っているので
 * モバイル幅で 16px 以上になり、iOS Safari のオートズームが起きない。
 */
const meta = {
  component: EmailField,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[380px]">
        <Story />
      </div>
    ),
  ],
  args: {
    id: 'email',
    label: 'メールアドレス',
    placeholder: 'your.email@example.com',
  },
} satisfies Meta<typeof EmailField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filled: Story = { args: { defaultValue: 'user@example.com' } }

export const Disabled: Story = { args: { disabled: true } }

/** ログイン欄はパスワードマネージャ向けに `username` を使う。 */
export const ForSignIn: Story = { args: { autoComplete: 'username' } }
