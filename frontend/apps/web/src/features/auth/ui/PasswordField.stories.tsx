import type { Meta, StoryObj } from '@storybook/react'
import { PasswordField } from './PasswordField'

/**
 * パスワード入力欄（表示切替 + 要件チェックリスト）。
 *
 * 12 文字以上 + 大小英字 + 数字 + 記号を**見えないまま**正確に打たせるのは非現実的なので、
 * 表示切替と「何が足りないか」を出す。判定規則は `@workspace/auth/validation` が正本。
 */
const meta = {
  component: PasswordField,
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
    name: 'password',
    label: 'パスワード',
    autoComplete: 'current-password',
  },
} satisfies Meta<typeof PasswordField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { disabled: true } }

/** 新規パスワード欄。未入力なので全要件が未達で表示される。 */
export const WithRequirementsEmpty: Story = {
  args: { autoComplete: 'new-password', showRequirements: true, value: '' },
}

/** 途中まで入力。長さと記号がまだ足りない。 */
export const WithRequirementsPartial: Story = {
  args: { autoComplete: 'new-password', showRequirements: true, value: 'Passw0rd' },
}

/** すべて満たした状態。 */
export const WithRequirementsSatisfied: Story = {
  args: { autoComplete: 'new-password', showRequirements: true, value: 'Sup3rStr0ng!Pass' },
}
