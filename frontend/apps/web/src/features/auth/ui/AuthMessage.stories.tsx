import type { Meta, StoryObj } from '@storybook/react'
import { AuthMessage } from './AuthMessage'

/**
 * 認証フォームの結果表示。各フォームに同じスタイル付き div をコピペしないための共有部品。
 * `role="status"` + `aria-live` で、結果が視覚以外にも伝わるようにしている。
 */
const meta = {
  component: AuthMessage,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[380px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthMessage>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: { tone: 'success', children: 'パスワードを更新しました。' },
}

export const ErrorTone: Story = {
  args: { tone: 'error', children: 'メールアドレスまたはパスワードが違います。' },
}

/** 長文でも折り返して読めること。 */
export const LongText: Story = {
  args: {
    tone: 'success',
    children:
      '確認メールを送信しました。現在のアドレスと新しいアドレスの両方をご確認ください。両方で確認が完了するまでメールアドレスは変更されません。',
  },
}
