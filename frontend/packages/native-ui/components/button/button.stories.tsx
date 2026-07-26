import type { Meta, StoryObj } from '@storybook/react'
import { buttonSize, buttonVariant } from '@workspace/tokens/variants'
import { View } from 'react-native'
import { Button, ButtonText } from './index'

const VARIANTS = Object.keys(buttonVariant) as (keyof typeof buttonVariant)[]
const SIZES = Object.keys(buttonSize) as (keyof typeof buttonSize)[]

/**
 * Mobile Button。
 *
 * `variant` / `size` の値は `@workspace/tokens/variants` 由来で、
 * Web の `@workspace/ui` の Button とまったく同じ API になっている。
 */
const meta = {
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: VARIANTS,
    },
    size: {
      control: 'select',
      options: SIZES,
    },
    isDisabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Button {...args}>
      <ButtonText>Button</ButtonText>
    </Button>
  ),
  args: {
    variant: 'default',
    size: 'default',
  },
}

export const Secondary: Story = {
  ...Default,
  args: { variant: 'secondary', size: 'default' },
}

export const Destructive: Story = {
  ...Default,
  args: { variant: 'destructive', size: 'default' },
}

export const Outline: Story = {
  ...Default,
  args: { variant: 'outline', size: 'default' },
}

export const Ghost: Story = {
  ...Default,
  args: { variant: 'ghost', size: 'default' },
}

export const Link: Story = {
  ...Default,
  args: { variant: 'link', size: 'default' },
}

export const Disabled: Story = {
  ...Default,
  args: { variant: 'default', size: 'default', isDisabled: true },
}

export const AllVariants: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {VARIANTS.map((variant) => (
        <Button key={variant} variant={variant}>
          <ButtonText>{variant}</ButtonText>
        </Button>
      ))}
    </View>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {SIZES.map((size) => (
        <Button key={size} size={size}>
          <ButtonText>{size}</ButtonText>
        </Button>
      ))}
    </View>
  ),
}
